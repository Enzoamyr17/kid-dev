# Stock Management System - Technical Implementation Plan

**Document Purpose:** Detailed technical guide for implementing the intelligent stock management system.

**Developer:** Renzo
**Last Updated:** 2025-10-23

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Stock Helper Functions](#stock-helper-functions)
4. [API Endpoints](#api-endpoints)
5. [Implementation Steps](#implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Migration Plan](#migration-plan)
8. [Code Examples](#code-examples)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  (QuotationCard, ProjectPage, ProductManagement)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      API Layer                                   │
│  (/api/quotations, /api/pr, /api/po, /api/stock-transactions)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                  Stock Helper Functions                          │
│  (src/lib/stock-helpers.ts - Business logic layer)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   Database Layer                                 │
│  (Product, StockTransaction, QuotationForm, PrForm, PoForm)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Single Source of Truth**: Stock levels always calculated from transactions
2. **Idempotency**: Operations can be retried safely
3. **Audit Trail**: Every stock movement recorded with full context
4. **Transaction Safety**: Use Prisma transactions for atomic operations
5. **Separation of Concerns**: Business logic in helpers, not API routes

---

## Database Schema Changes

### Option 1: Minimal Changes (Recommended)

**Leverage existing schema with enhanced transaction tracking**

#### Add Optional Fields to `StockTransaction`

```prisma
model StockTransaction {
  id              Int               @id @default(autoincrement())
  productId       Int
  type            TransactionType
  quantity        Int
  referenceId     String?           @db.VarChar(255)  // "QUOTE-001", "PR-001", "PO-001"
  sourceReference String?           @db.VarChar(255)  // NEW: Link to originating document
  fulfillmentType String?           @db.VarChar(50)   // NEW: "from_stock" or "to_be_ordered"
  status          TransactionStatus
  remarks         String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  product         Product           @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([referenceId])
  @@index([sourceReference])  // NEW: For traceability queries
  @@map("stockTransaction")
}
```

**Migration SQL:**
```sql
-- Add new columns (nullable for backward compatibility)
ALTER TABLE "stockTransaction"
  ADD COLUMN "sourceReference" VARCHAR(255),
  ADD COLUMN "fulfillmentType" VARCHAR(50);

-- Add index for performance
CREATE INDEX "stockTransaction_sourceReference_idx" ON "stockTransaction"("sourceReference");
```

### Option 2: Enhanced with Enum (More Type Safety)

```prisma
enum FulfillmentType {
  from_stock
  to_be_ordered
}

model StockTransaction {
  // ... existing fields
  sourceReference String?           @db.VarChar(255)
  fulfillmentType FulfillmentType?
  // ... rest of fields
}
```

---

## Stock Helper Functions

### File Structure

```
src/
├── lib/
│   ├── stock-helpers.ts          # Main helper functions
│   ├── stock-types.ts             # TypeScript interfaces
│   └── stock-calculations.ts      # Pure calculation functions
```

### Core Functions Specification

#### 1. `allocateStockForQuotation()`

**Purpose:** Automatically allocate stock when quotation is created/approved

**Signature:**
```typescript
interface StockAllocationResult {
  productId: number;
  quantityRequested: number;
  fromCurrentStock: number;
  needsOrdering: number;
  fulfillmentType: 'from_stock' | 'to_be_ordered' | 'mixed';
  transactionIds: number[];
}

async function allocateStockForQuotation(
  quotationId: number
): Promise<StockAllocationResult[]>
```

**Logic Flow:**
```typescript
1. Get all QuotationItem records for quotationId
2. For each item:
   a. Get current Product stock levels
   b. Calculate: canFulfillFromStock = Math.min(currentStock, quantity)
   c. Calculate: needsOrdering = quantity - canFulfillFromStock

   d. If canFulfillFromStock > 0:
      - Create StockTransaction:
        * type: "delivered" (or new type "allocated")
        * status: "pending"
        * quantity: canFulfillFromStock
        * referenceId: quotationForm.code
        * fulfillmentType: "from_stock"
      - Update Product.currentStock -= canFulfillFromStock

   e. If needsOrdering > 0:
      - Create StockTransaction:
        * type: "outgoing"
        * status: "pending"
        * quantity: needsOrdering
        * referenceId: quotationForm.code
        * fulfillmentType: "to_be_ordered"
      - Update Product.outgoingStock += needsOrdering

3. Return allocation summary
```

**Error Handling:**
- Wrap in Prisma transaction for atomicity
- Rollback if any operation fails
- Log detailed error with quotationId context

**Example Implementation:**
```typescript
export async function allocateStockForQuotation(
  quotationId: number
): Promise<StockAllocationResult[]> {
  return await prisma.$transaction(async (tx) => {
    // Get quotation with items
    const quotation = await tx.quotationForm.findUnique({
      where: { id: quotationId },
      include: { quotationItems: { include: { product: true } } }
    });

    if (!quotation) throw new Error(`Quotation ${quotationId} not found`);

    const results: StockAllocationResult[] = [];

    for (const item of quotation.quotationItems) {
      const product = item.product;
      const quantity = item.quantity || 0;

      // Determine how much can be fulfilled from current stock
      const fromCurrentStock = Math.min(product.currentStock, quantity);
      const needsOrdering = quantity - fromCurrentStock;

      const transactionIds: number[] = [];

      // Allocate from current stock if available
      if (fromCurrentStock > 0) {
        const txn = await tx.stockTransaction.create({
          data: {
            productId: product.id,
            type: 'delivered', // or 'allocated' if you add this type
            status: 'pending',
            quantity: fromCurrentStock,
            referenceId: quotation.code,
            fulfillmentType: 'from_stock',
            remarks: `Allocated from current stock for ${quotation.code}`
          }
        });
        transactionIds.push(txn.id);

        // Deduct from current stock immediately
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: fromCurrentStock } }
        });
      }

      // Reserve for ordering if needed
      if (needsOrdering > 0) {
        const txn = await tx.stockTransaction.create({
          data: {
            productId: product.id,
            type: 'outgoing',
            status: 'pending',
            quantity: needsOrdering,
            referenceId: quotation.code,
            fulfillmentType: 'to_be_ordered',
            remarks: `Reserved for ${quotation.code}, needs ordering from supplier`
          }
        });
        transactionIds.push(txn.id);

        // Add to outgoing stock (reserved)
        await tx.product.update({
          where: { id: product.id },
          data: { outgoingStock: { increment: needsOrdering } }
        });
      }

      results.push({
        productId: product.id,
        quantityRequested: quantity,
        fromCurrentStock,
        needsOrdering,
        fulfillmentType: needsOrdering > 0
          ? (fromCurrentStock > 0 ? 'mixed' : 'to_be_ordered')
          : 'from_stock',
        transactionIds
      });
    }

    return results;
  });
}
```

---

#### 2. `createPRFromQuotation()`

**Purpose:** Create PR with items that need ordering from supplier

**Signature:**
```typescript
async function createPRFromQuotation(
  quotationId: number,
  prData: {
    projectId: number;
    forCompanyId: number;
    fromSupplierId?: number;
    dateRequired?: Date;
  }
): Promise<{ prId: number; itemsCreated: number }>
```

**Logic Flow:**
```typescript
1. Get all QuotationItems for quotationId
2. Get StockTransactions with fulfillmentType = "to_be_ordered"
3. For each product needing ordering:
   a. Create PrItem with same details as QuotationItem
   b. Create StockTransaction:
      * type: "incoming"
      * status: "approved"
      * referenceId: prForm.code
      * sourceReference: quotationForm.code (link back!)
   c. Update Product.incomingStock += quantity
4. Return PR info
```

**Implementation:**
```typescript
export async function createPRFromQuotation(
  quotationId: number,
  prData: {
    projectId: number;
    forCompanyId: number;
    fromSupplierId?: number;
    dateRequired?: Date;
  }
): Promise<{ prId: number; itemsCreated: number }> {
  return await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotationForm.findUnique({
      where: { id: quotationId },
      include: { quotationItems: true }
    });

    if (!quotation) throw new Error(`Quotation ${quotationId} not found`);

    // Get items that need ordering
    const itemsNeedingOrder = await tx.stockTransaction.findMany({
      where: {
        referenceId: quotation.code,
        fulfillmentType: 'to_be_ordered',
        type: 'outgoing'
      }
    });

    if (itemsNeedingOrder.length === 0) {
      throw new Error('No items need ordering for this quotation');
    }

    // Generate PR code (similar pattern to quotation code generation)
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `PR${year}-`;
    const existingPRs = await tx.prForm.findMany({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      take: 1
    });
    const nextNumber = existingPRs.length > 0
      ? parseInt(existingPRs[0].code.split('-')[1]) + 1
      : 1;
    const prCode = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

    // Create PR Form
    const prForm = await tx.prForm.create({
      data: {
        code: prCode,
        projectId: prData.projectId,
        forCompanyId: prData.forCompanyId,
        fromSupplierId: prData.fromSupplierId,
        dateRequired: prData.dateRequired,
        // Other fields as needed
      }
    });

    let itemsCreated = 0;

    // Create PR items for products that need ordering
    for (const stockTxn of itemsNeedingOrder) {
      const quotationItem = quotation.quotationItems.find(
        qi => qi.productId === stockTxn.productId
      );

      if (!quotationItem) continue;

      // Create PR Item
      await tx.prItem.create({
        data: {
          formId: prForm.id,
          productId: stockTxn.productId,
          supplierId: quotationItem.supplierId,
          quantity: stockTxn.quantity,
          internalPrice: quotationItem.internalPrice,
          clientPrice: quotationItem.clientPrice,
          total: quotationItem.total,
          remarks: `From ${quotation.code}`
        }
      });

      // Create incoming stock transaction
      await tx.stockTransaction.create({
        data: {
          productId: stockTxn.productId,
          type: 'incoming',
          status: 'approved',
          quantity: stockTxn.quantity,
          referenceId: prCode,
          sourceReference: quotation.code, // Link back to quotation!
          remarks: `Ordered from supplier for ${quotation.code}`
        }
      });

      // Update incoming stock
      await tx.product.update({
        where: { id: stockTxn.productId },
        data: { incomingStock: { increment: stockTxn.quantity } }
      });

      itemsCreated++;
    }

    return { prId: prForm.id, itemsCreated };
  });
}
```

---

#### 3. `createStandalonePR()`

**Purpose:** Create PR for stock buildup (no quotation link)

**Signature:**
```typescript
async function createStandalonePR(
  prData: {
    projectId: number;
    forCompanyId: number;
    fromSupplierId?: number;
    items: Array<{
      productId: number;
      quantity: number;
      supplierId: number;
      internalPrice: number;
    }>;
  }
): Promise<number> // Returns PR ID
```

**Logic:**
```typescript
1. Create PrForm
2. For each item:
   a. Create PrItem
   b. Create StockTransaction type="incoming", status="approved"
   c. Update Product.incomingStock += quantity
3. No sourceReference (standalone)
```

---

#### 4. `receiveGoodsFromSupplier()`

**Purpose:** Process goods received from supplier (PO fulfillment)

**Signature:**
```typescript
async function receiveGoodsFromSupplier(
  poId: number,
  receivedItems: Array<{
    productId: number;
    quantityReceived: number;
  }>
): Promise<void>
```

**Logic:**
```typescript
1. Get PO with items
2. For each received item:
   a. Create StockTransaction:
      * type: "received"
      * status: "completed"
      * referenceId: poForm.code
      * sourceReference: prForm.code (get from PO's reference)
   b. Update Product.currentStock += quantityReceived
   c. Update Product.incomingStock -= quantityReceived
3. Optionally mark PO as fulfilled
```

**Implementation:**
```typescript
export async function receiveGoodsFromSupplier(
  poId: number,
  receivedItems: Array<{
    productId: number;
    quantityReceived: number;
  }>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const po = await tx.poForm.findUnique({
      where: { id: poId },
      include: { poItems: true }
    });

    if (!po) throw new Error(`PO ${poId} not found`);

    for (const item of receivedItems) {
      // Verify item is in PO
      const poItem = po.poItems.find(pi => pi.productId === item.productId);
      if (!poItem) {
        throw new Error(`Product ${item.productId} not in PO ${po.code}`);
      }

      // Find the source PR reference (if exists)
      const incomingTxn = await tx.stockTransaction.findFirst({
        where: {
          productId: item.productId,
          type: 'incoming',
          referenceId: { contains: 'PR' } // Find related PR
        },
        orderBy: { createdAt: 'desc' }
      });

      // Create received transaction
      await tx.stockTransaction.create({
        data: {
          productId: item.productId,
          type: 'received',
          status: 'completed',
          quantity: item.quantityReceived,
          referenceId: po.code,
          sourceReference: incomingTxn?.referenceId, // Link to PR
          remarks: `Received from supplier via ${po.code}`
        }
      });

      // Update stock levels
      await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.quantityReceived },
          incomingStock: { decrement: item.quantityReceived }
        }
      });
    }
  });
}
```

---

#### 5. `deliverGoodsToClient()`

**Purpose:** Complete delivery to client (finalize quotation)

**Signature:**
```typescript
async function deliverGoodsToClient(
  quotationId: number
): Promise<void>
```

**Logic:**
```typescript
1. Get quotation items
2. Get all "outgoing" transactions for this quotation
3. For each item with outgoing stock:
   a. Create StockTransaction:
      * type: "delivered"
      * status: "completed"
      * referenceId: quotationForm.code
   b. Update Product.currentStock -= quantity (if not already deducted)
   c. Update Product.outgoingStock -= quantity
4. Mark quotation as delivered (optional status field)
```

---

#### 6. `getStockAllocationPreview()`

**Purpose:** Preview how stock will be allocated (before committing)

**Signature:**
```typescript
interface StockPreview {
  productId: number;
  sku: string;
  name: string;
  currentStock: number;
  incomingStock: number;
  outgoingStock: number;
  availableStock: number; // current - outgoing
  requestedQuantity: number;
  canFulfillFromStock: number;
  needsOrdering: number;
}

async function getStockAllocationPreview(
  items: Array<{ productId: number; quantity: number }>
): Promise<StockPreview[]>
```

**Use Case:** Show in UI before creating quotation

---

#### 7. `getProductStockHistory()`

**Purpose:** Get audit trail for a product

**Signature:**
```typescript
interface StockHistoryEntry {
  id: number;
  type: string;
  quantity: number;
  referenceId: string | null;
  sourceReference: string | null;
  status: string;
  fulfillmentType: string | null;
  remarks: string | null;
  createdAt: Date;
}

async function getProductStockHistory(
  productId: number,
  filters?: {
    referenceId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<StockHistoryEntry[]>
```

---

#### 8. `adjustStock()` (Manual Adjustment)

**Purpose:** Handle manual stock adjustments (inventory count corrections)

**Signature:**
```typescript
async function adjustStock(
  productId: number,
  adjustment: number, // Can be positive or negative
  reason: string
): Promise<void>
```

**Logic:**
```typescript
1. Create StockTransaction type="adjustment"
2. Update Product.currentStock += adjustment
3. Log reason in remarks
```

---

## API Endpoints

### New/Modified Endpoints

#### POST `/api/quotations`

**Modification:** Call `allocateStockForQuotation()` after creating quotation

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create quotation (existing logic)
    const quotation = await prisma.quotationForm.create({
      data: {
        // ... existing fields
      }
    });

    // NEW: Allocate stock automatically
    const allocation = await allocateStockForQuotation(quotation.id);

    return NextResponse.json({
      ...quotation,
      stockAllocation: allocation // Return allocation details
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to create quotation' },
      { status: 500 }
    );
  }
}
```

---

#### POST `/api/pr/from-quotation`

**New endpoint** for creating PR from quotation

```typescript
export async function POST(request: NextRequest) {
  try {
    const { quotationId, projectId, forCompanyId, fromSupplierId, dateRequired } = await request.json();

    const result = await createPRFromQuotation(quotationId, {
      projectId,
      forCompanyId,
      fromSupplierId,
      dateRequired: dateRequired ? new Date(dateRequired) : undefined
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating PR from quotation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PR' },
      { status: 500 }
    );
  }
}
```

---

#### POST `/api/pr/standalone`

**New endpoint** for standalone PR (seasonal ordering)

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const prId = await createStandalonePR(body);

    return NextResponse.json({ prId }, { status: 201 });
  } catch (error) {
    console.error('Error creating standalone PR:', error);
    return NextResponse.json(
      { error: 'Failed to create PR' },
      { status: 500 }
    );
  }
}
```

---

#### POST `/api/po/:id/receive`

**New endpoint** for receiving goods from supplier

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { receivedItems } = await request.json();

    await receiveGoodsFromSupplier(parseInt(id), receivedItems);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error receiving goods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to receive goods' },
      { status: 500 }
    );
  }
}
```

---

#### POST `/api/quotations/:id/deliver`

**New endpoint** for delivering to client

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deliverGoodsToClient(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error delivering to client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deliver goods' },
      { status: 500 }
    );
  }
}
```

---

#### GET `/api/stock/preview`

**New endpoint** for stock allocation preview

```typescript
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    const preview = await getStockAllocationPreview(items);

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error generating stock preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
```

---

#### GET `/api/stock/history/:productId`

**New endpoint** for product stock history

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const history = await getProductStockHistory(parseInt(productId), {
      referenceId: searchParams.get('referenceId') || undefined,
      dateFrom: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
      dateTo: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
```

---

## Implementation Steps

### Phase 1: Database & Core Functions (Week 1)

**Tasks:**
1. ✅ Run database migration to add new fields
2. ✅ Create `src/lib/stock-helpers.ts` file structure
3. ✅ Implement `allocateStockForQuotation()`
4. ✅ Implement `getStockAllocationPreview()`
5. ✅ Write unit tests for allocation logic

**Deliverables:**
- Migration script
- Helper functions with TypeScript interfaces
- Test coverage for allocation scenarios

---

### Phase 2: PR/PO Integration (Week 2)

**Tasks:**
1. ✅ Implement `createPRFromQuotation()`
2. ✅ Implement `createStandalonePR()`
3. ✅ Implement `receiveGoodsFromSupplier()`
4. ✅ Create API endpoints for PR creation
5. ✅ Create API endpoint for receiving goods

**Deliverables:**
- Working PR creation from quotations
- Standalone PR creation
- Goods receipt functionality

---

### Phase 3: Delivery & Completion (Week 3)

**Tasks:**
1. ✅ Implement `deliverGoodsToClient()`
2. ✅ Create delivery API endpoint
3. ✅ Add delivery buttons to UI
4. ✅ Implement `getProductStockHistory()`
5. ✅ Create stock history UI component

**Deliverables:**
- Complete order fulfillment workflow
- Stock history/audit trail

---

### Phase 4: UI Integration (Week 4)

**Tasks:**
1. ✅ Add stock allocation preview to QuotationCard
2. ✅ Add "Mark as Approved" button on quotations (creates PR)
3. ✅ Add "Receive Goods" button on PO page
4. ✅ Add "Deliver to Client" button on Quotation page
5. ✅ Create stock status indicators (from_stock vs to_be_ordered)
6. ✅ Update Product Management page to show allocation breakdown

**Deliverables:**
- Fully integrated UI with stock visibility
- User-friendly workflow

---

### Phase 5: Testing & Refinement (Week 5)

**Tasks:**
1. ✅ End-to-end testing of all workflows
2. ✅ Performance testing with large datasets
3. ✅ Edge case handling (negative stock, concurrent orders)
4. ✅ Documentation updates
5. ✅ User acceptance testing

**Deliverables:**
- Production-ready system
- Test reports
- Updated documentation

---

## Testing Strategy

### Unit Tests

**File:** `src/lib/__tests__/stock-helpers.test.ts`

```typescript
describe('allocateStockForQuotation', () => {
  it('should allocate from current stock when available', async () => {
    // Setup: Product with 100 units in stock
    // Action: Request 50 units
    // Expect: 50 from current stock, 0 needs ordering
  });

  it('should create order when insufficient stock', async () => {
    // Setup: Product with 30 units in stock
    // Action: Request 50 units
    // Expect: 30 from current, 20 needs ordering
  });

  it('should handle zero stock correctly', async () => {
    // Setup: Product with 0 units in stock
    // Action: Request 100 units
    // Expect: 0 from current, 100 needs ordering
  });

  it('should be atomic (rollback on error)', async () => {
    // Test transaction rollback on failure
  });
});
```

### Integration Tests

Test complete workflows:
1. Quotation → allocation → PR → PO → receive → deliver
2. Standalone PR → PO → receive
3. Mixed fulfillment scenarios

### Performance Tests

- Test with 1000+ products
- Test with 100+ concurrent quotations
- Measure database query performance

---

## Migration Plan

### Step 1: Backup

```bash
# Backup production database
pg_dump -U postgres -h localhost kid_dev > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration

```bash
# Apply schema changes
npx prisma migrate dev --name add_stock_traceability
```

### Step 3: Data Migration (if needed)

If you have existing stock transactions, run a data migration to populate `sourceReference` and `fulfillmentType` where possible.

```typescript
// scripts/migrate-stock-data.ts
async function migrateExistingData() {
  // Analyze existing transactions
  // Populate sourceReference based on referenceId patterns
  // Set default fulfillmentType where missing
}
```

### Step 4: Deploy

1. Deploy helper functions (no UI changes yet)
2. Monitor for errors
3. Deploy API endpoints
4. Deploy UI changes
5. Full system testing

---

## Code Examples

### Using Stock Helpers in QuotationCard

```typescript
// src/components/cards/QuotationCard.tsx

const handleSaveQuotation = async (skipClearForm = false) => {
  // ... existing validation

  try {
    const response = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Failed to save quotation");

    const result = await response.json();

    // NEW: Show stock allocation results
    if (result.stockAllocation) {
      const summary = result.stockAllocation.reduce(
        (acc, item) => {
          acc.fromStock += item.fromCurrentStock;
          acc.needsOrdering += item.needsOrdering;
          return acc;
        },
        { fromStock: 0, needsOrdering: 0 }
      );

      if (summary.needsOrdering > 0) {
        toast.info(
          `Quotation saved! ${summary.fromStock} items from stock, ${summary.needsOrdering} need ordering.`
        );
      } else {
        toast.success(`Quotation saved! All items available from stock.`);
      }
    }

    // ... rest of existing logic

  } catch (error) {
    // ... error handling
  }
};
```

### Stock Preview Component

```typescript
// src/components/StockPreview.tsx

interface StockPreviewProps {
  items: Array<{ productId: number; quantity: number }>;
}

export function StockPreview({ items }: StockPreviewProps) {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/stock/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error("Failed to fetch preview:", error);
      } finally {
        setLoading(false);
      }
    };

    if (items.length > 0) {
      fetchPreview();
    }
  }, [items]);

  if (loading) return <Skeleton />;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-2">Stock Availability</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>From Stock</TableHead>
            <TableHead>Needs Ordering</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.map((item) => (
            <TableRow key={item.productId}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.requestedQuantity}</TableCell>
              <TableCell className="text-green-600">
                {item.canFulfillFromStock}
              </TableCell>
              <TableCell className={item.needsOrdering > 0 ? "text-amber-600" : ""}>
                {item.needsOrdering}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Error Handling & Edge Cases

### Concurrency Issues

**Problem:** Two quotations created simultaneously for same product

**Solution:** Use database transactions and optimistic locking

```typescript
// Use Prisma's atomic operations
await tx.product.update({
  where: {
    id: productId,
    currentStock: { gte: quantity } // Only update if stock available
  },
  data: { currentStock: { decrement: quantity } }
});
```

### Negative Stock Prevention

```typescript
// Add constraint in Prisma schema
model Product {
  currentStock Int @default(0) // Consider adding @check constraint in raw SQL
}

// In helper function, validate before update
if (product.currentStock < quantity) {
  // Don't allow negative current stock
  // Allocate only what's available, rest goes to ordering
}
```

### Partial Receipts

If supplier delivers partial order:

```typescript
// Allow receiving less than ordered
await receiveGoodsFromSupplier(poId, [
  { productId: 1, quantityReceived: 80 } // Ordered 100, received 80
]);

// Track remaining 20 units as still incoming
```

---

## Monitoring & Logging

### Key Metrics to Track

1. **Stock Allocation Rate**: % of orders fulfilled from stock vs. ordered
2. **Average Lead Time**: PR creation → goods received
3. **Stock Turnover**: How fast inventory moves
4. **Outgoing Stock Age**: How long stock is reserved waiting for delivery

### Logging Strategy

```typescript
// Add detailed logging to helper functions
import { logger } from '@/lib/logger';

export async function allocateStockForQuotation(quotationId: number) {
  logger.info('Starting stock allocation', { quotationId });

  try {
    // ... allocation logic

    logger.info('Stock allocation complete', {
      quotationId,
      results: { fromStock, needsOrdering }
    });

  } catch (error) {
    logger.error('Stock allocation failed', {
      quotationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}
```

---

## Performance Optimization

### Database Indexing

Ensure indexes exist on frequently queried fields:

```sql
CREATE INDEX idx_stock_txn_reference ON "stockTransaction"("referenceId");
CREATE INDEX idx_stock_txn_product_type ON "stockTransaction"("productId", "type");
CREATE INDEX idx_stock_txn_source ON "stockTransaction"("sourceReference");
```

### Caching Strategy

For high-traffic scenarios, consider caching:

```typescript
// Cache product stock levels (invalidate on transaction)
import { redis } from '@/lib/redis';

async function getProductStock(productId: number) {
  const cached = await redis.get(`product:${productId}:stock`);
  if (cached) return JSON.parse(cached);

  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  await redis.set(
    `product:${productId}:stock`,
    JSON.stringify(product),
    'EX',
    60 // 1 minute TTL
  );

  return product;
}
```

### Batch Operations

When processing many items, use batch operations:

```typescript
// Instead of multiple individual updates
await Promise.all(
  items.map(item =>
    prisma.product.update({ /* ... */ })
  )
);
```

---

## Security Considerations

1. **Authorization**: Verify user has permission to create quotations, PRs, POs
2. **Input Validation**: Sanitize all inputs, validate quantities are positive
3. **Transaction Integrity**: Always use Prisma transactions for multi-step operations
4. **Audit Trail**: Log who performed each stock operation (add `userId` to transactions)

---

## Future Enhancements

### Phase 6+: Advanced Features

1. **Automatic Reorder Points**: Alert when stock falls below threshold
2. **Demand Forecasting**: Predict stock needs based on historical data
3. **Supplier Lead Time Tracking**: Estimate delivery dates
4. **Batch/Lot Tracking**: Track which batch/lot each stock came from
5. **Expiry Date Management**: For perishable products
6. **Multi-Warehouse Support**: Track stock across multiple locations
7. **Stock Reservation Expiry**: Auto-release reserved stock after X days

---

## Troubleshooting Guide

### Issue: Stock levels don't match

**Debug Steps:**
1. Check all transactions for the product: `getProductStockHistory(productId)`
2. Recalculate stock from transactions:
   ```typescript
   const transactions = await prisma.stockTransaction.findMany({
     where: { productId }
   });

   const calculated = transactions.reduce((acc, txn) => {
     if (txn.type === 'incoming' || txn.type === 'received') acc += txn.quantity;
     if (txn.type === 'outgoing' || txn.type === 'delivered') acc -= txn.quantity;
     return acc;
   }, 0);

   console.log('Calculated vs Actual:', calculated, product.currentStock);
   ```

3. Use `adjustStock()` to reconcile discrepancies

### Issue: Quotation fails to allocate stock

**Debug Steps:**
1. Check product exists and has valid stock levels
2. Verify quotation items are properly formatted
3. Check for concurrent transactions (look at timestamps)
4. Review error logs for transaction rollback reasons

---

## Deployment Checklist

- [ ] Database migration applied successfully
- [ ] All helper functions tested
- [ ] API endpoints tested
- [ ] UI components integrated
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] User training materials prepared
- [ ] Monitoring and logging configured
- [ ] Rollback plan documented
- [ ] Stakeholder sign-off obtained

---

## Questions & Decisions

### Open Questions for Discussion

1. **Stock Reservation Timeout**: Should reserved stock (outgoingStock) auto-release after X days if not delivered?
2. **Partial Deliveries**: Allow delivering part of a quotation, or must be all-or-nothing?
3. **Stock Reconciliation**: How often should we run automated stock count reconciliation?
4. **Notification System**: Should system send alerts for low stock, pending orders, etc.?

### Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-23 | Use `referenceId` string instead of foreign keys | More flexible, supports PR/PO with or without quotations |
| 2025-10-23 | Add `sourceReference` field | Enables full traceability across document types |
| 2025-10-23 | Automatic allocation on quotation creation | Simplifies workflow, reduces manual steps |

---

**Document Maintained By:** Renzo (Developer)
**Last Review Date:** 2025-10-23
**Next Review:** After Phase 1 completion

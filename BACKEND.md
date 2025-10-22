# Backend API Documentation

## Overview

This document describes all API endpoints, their expected payloads, responses, and database relations.

## Data Types

- All IDs are `number` (not BigInt strings)
- Dates are ISO 8601 strings
- Currency amounts are stored as numbers (not cents)
- All request/response payloads use camelCase

---

## Workflow Templates

### GET `/api/workflow-templates`

Fetch all workflow templates with their stages.

**Response:**
```typescript
Array<{
  id: number;
  name: string;
  description: string;
  workflowStages: Array<{
    id: number;
    templateId: number;
    name: string;
    code: string;
    order: number;
    requiresApproval: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  _count: { projects: number };
  createdAt: string;
  updatedAt: string;
}>
```

### POST `/api/workflow-templates`

Create a new workflow template with stages.

**Request:**
```typescript
{
  name: string;
  description?: string;
  stages: Array<{
    name: string;
    code: string;
    requiresApproval: boolean;
  }>;
}
```

**Response:** Created template with stages

### PATCH `/api/workflow-templates`

Update a workflow template's name/description.

**Request:**
```typescript
{
  id: number;
  name?: string;
  description?: string;
}
```

### DELETE `/api/workflow-templates?id={id}`

Delete a workflow template (cascades to stages).

---

## Workflow Stages

### POST `/api/workflow-templates/stages`

Add a new stage to a template.

**Request:**
```typescript
{
  templateId: number;
  name: string;
  code: string;
  requiresApproval: boolean;
  order: number;
}
```

### PATCH `/api/workflow-templates/stages`

Update a workflow stage.

**Request:**
```typescript
{
  id: number;
  name?: string;
  code?: string;
  requiresApproval?: boolean;
  order?: number;
}
```

### DELETE `/api/workflow-templates/stages?id={id}`

Delete a workflow stage.

---

## Projects

### GET `/api/projects?company_id={companyId}`

Fetch all projects, optionally filtered by company.

**Response:**
```typescript
Array<{
  id: number;
  code: string;
  companyId: number;
  workflowId: number;
  workflowStageId: number;
  description: string;
  approvedBudget: number | null;
  createdAt: string;
  updatedAt: string;
  company: Company;
  workflow: WorkflowTemplate;
  workflowstage: WorkflowStage;
}>
```

### POST `/api/projects`

Create a new project.

**Request:**
```typescript
{
  companyId: number;
  code: string;
  description: string;
  approvedBudget?: number;
  workflowTemplateId: number;
}
```

**Notes:**
- `workflowStageId` is auto-set to the first stage of the selected workflow
- Response includes company, workflow, and workflowstage relations

### PATCH `/api/projects`

Update a project.

**Request:**
```typescript
{
  id: number;
  companyId?: number;
  code?: string;
  description?: string;
  approvedBudget?: number;
  workflowStageId?: number;
}
```

### DELETE `/api/projects?id={id}`

Delete a project.

---

## Project Detail

### GET `/api/projects/{id}`

Fetch a single project with full details.

**Response:**
```typescript
{
  id: number;
  code: string;
  companyId: number;
  workflowId: number;
  workflowStageId: number;
  description: string;
  approvedBudget: number | null;
  company: {
    id: number;
    companyName: string;
    tinNumber: string;
    type: string;
    companyProponents: Array<CompanyProponent>;
    companyAddresses: Array<CompanyAddress>;
  };
  workflow: WorkflowTemplate;
  workflowstage: WorkflowStage;
  createdAt: string;
  updatedAt: string;
}
```

### PATCH `/api/projects/{id}`

Update a project (same as PATCH `/api/projects`).

---

## Quotations

### GET `/api/quotations`

Fetch all quotation forms.

**Response:**
```typescript
Array<{
  id: number;
  projectId: number;
  forCompanyId: number;
  requestorId: number | null;
  deliveryTerm: string | null;
  approvedBudget: number | null;
  bidPercentage: number | null;
  paymentTerm: string | null;
  totalCost: number | null;
  bidPrice: number | null;
  createdAt: string;
  updatedAt: string;
}>
```

### POST `/api/quotations`

Create a new quotation form with items.

**Request:**
```typescript
{
  projectId: number;
  forCompanyId: number;
  requestorId?: number;
  deliveryTerm?: string;
  paymentTerm?: string;
  approvedBudget?: number;
  bidPercentage?: number;
  totals?: {
    totalCost: number;
    bidPrice: number;
  };
  items: Array<{
    productId: number;
    supplierId: number;
    quantity?: number;
    internalPrice: number;
    clientPrice: number;
    total: number;
    remarks?: string;
  }>;
}
```

**Notes:**
- Creates `QuotationForm` with nested `QuotationItem[]`
- Items are created in a transaction

---

## Companies

### GET `/api/companies`

Fetch all companies with addresses, proponents, and counts.

**Response:**
```typescript
Array<{
  id: number;
  companyName: string;
  tinNumber: string;
  type: "client" | "supplier" | "vendor" | "internal";
  companyAddresses: Array<CompanyAddress>;
  companyProponents: Array<CompanyProponent>;
  _count: {
    projects: number;
    companyAddresses: number;
    companyProponents: number;
  };
  createdAt: string;
  updatedAt: string;
}>
```

### POST `/api/companies`

Create a new company.

**Request:**
```typescript
{
  companyName: string;
  tinNumber?: string;
  type: "client" | "supplier" | "vendor" | "internal";
}
```

**Compatibility:** Also accepts `company_name`, `tin_number` (snake_case)

### PATCH `/api/companies`

Update a company.

**Request:**
```typescript
{
  id: number;
  companyName?: string;
  tinNumber?: string;
  type?: string;
}
```

### DELETE `/api/companies?id={id}`

Delete a company (fails if projects exist).

---

## Addresses

### GET `/api/addresses?company_id={companyId}`

Fetch addresses, optionally filtered by company.

### POST `/api/addresses`

Create a new address.

**Request:**
```typescript
{
  companyId: number;
  houseNo: string;
  street: string;
  subdivision?: string;
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
}
```

**Compatibility:** Also accepts snake_case fields

### PATCH `/api/addresses`

Update an address.

### DELETE `/api/addresses?id={id}`

Delete an address.

---

## Proponents

### GET `/api/proponents?company_id={companyId}`

Fetch proponents, optionally filtered by company.

### POST `/api/proponents`

Create a new proponent.

**Request:**
```typescript
{
  companyId: number;
  contactPerson: string;
  contactNumber: string;
}
```

**Compatibility:** Also accepts snake_case fields

### PATCH `/api/proponents`

Update a proponent.

### DELETE `/api/proponents?id={id}`

Delete a proponent.

---

## Products

### GET `/api/products?active=true`

Fetch all products, optionally filtered by active status.

**Response:**
```typescript
Array<{
  id: number;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  subCategory: string;
  adCategory: string;
  uom: string;
  incomingStock: number;
  outgoingStock: number;
  currentStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>
```

### POST `/api/products`

Create a new product.

**Request:**
```typescript
{
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  subCategory: string; // or sub_category
  adCategory: string;  // or ad_category
  uom: string;
  isActive?: boolean;  // or is_active
}
```

### PATCH `/api/products`

Update a product.

### DELETE `/api/products`

Delete a product (via request body with `{ id: number }`).

---

## Stock Transactions

### GET `/api/stock-transactions?product_id={productId}`

Fetch all stock transactions, optionally filtered by product.

**Response:**
```typescript
Array<{
  id: number;
  productId: number;
  type: "incoming" | "outgoing" | "received" | "delivered" | "adjustment";
  quantity: number;
  referenceId: string | null;
  remarks: string | null;
  status: "pending" | "approved" | "completed";
  createdAt: string;
  updatedAt: string;
  product?: Product; // Included if expand=true
}>
```

### POST `/api/stock-transactions`

Create a new stock transaction.

**Request:**
```typescript
{
  productId: number;
  type: "incoming" | "outgoing" | "received" | "delivered" | "adjustment";
  quantity: number;
  referenceId?: string;
  remarks?: string;
  status: "pending" | "approved" | "completed";
}
```

**Notes:**
- Stock fields on Product model should be updated based on transaction type and status
- `incoming` transactions increase `incomingStock` when status is `pending`/`approved`, increase `currentStock` when `completed`
- `outgoing` transactions increase `outgoingStock` when status is `pending`/`approved`, decrease `currentStock` when `completed`
- `received` transactions increase `currentStock` and decrease `incomingStock`
- `delivered` transactions decrease `currentStock` and decrease `outgoingStock`
- `adjustment` transactions directly modify `currentStock` (positive or negative quantity)

### PATCH `/api/stock-transactions`

Update a stock transaction (typically for status changes).

**Request:**
```typescript
{
  id: number;
  status?: "pending" | "approved" | "completed";
  quantity?: number;
  referenceId?: string;
  remarks?: string;
}
```

---

## Users

### GET `/api/users`

Fetch all users (for requestor dropdowns).

**Response:**
```typescript
Array<{
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  position: string | null;
  isActive: boolean;
}>
```

---

## Database Schema Relations

### Project
- `companyId` → Company
- `workflowId` → WorkflowTemplate
- `workflowStageId` → WorkflowStage
- Has many: QuotationForm, PrForm, PoForm, BudgetCategory, ProjectTransaction

### WorkflowTemplate
- Has many: WorkflowStage, Project

### WorkflowStage
- `templateId` → WorkflowTemplate
- Has many: Project (via workflowStageId)

### QuotationForm
- `projectId` → Project
- `forCompanyId` → Company
- `requestorId` → User (nullable)
- Has many: QuotationItem

### QuotationItem
- `formId` → QuotationForm
- `productId` → Product
- `supplierId` → Company

### Company
- Has many: CompanyAddress, CompanyProponent, Project
- Related to QuotationForm, PrForm, PoForm, QuotationItem, PrItem, PoItem

### CompanyAddress / CompanyProponent
- `companyId` → Company

### Product
- Related to: QuotationItem, PrItem, PoItem, ProductPrice, StockTransaction
- Stock fields:
  - `incomingStock`: Stock on order (pending/approved incoming transactions)
  - `outgoingStock`: Stock allocated for delivery (pending/approved outgoing transactions)
  - `currentStock`: Stock physically available in warehouse

### StockTransaction
- `productId` → Product
- Tracks all stock movements with reference to source documents
- Affects Product stock fields based on type and status

---

## Migration Notes

- **IDs:** All IDs changed from BigInt to Int (number)
- **Fields renamed:**
  - `approvedBudgetCost` → `approvedBudget`
  - `lifecycles` → removed (replaced by `workflowId` + `workflowStageId`)
  - `bidPercentage` → removed from Project model
- **Lifecycle models removed:**
  - `Lifecycle`, `LifecycleTemplate`, `LifecycleStage` → now `WorkflowTemplate`, `WorkflowStage`
- **Form models refactored:**
  - Generic `Form`, `FormItem` → specific `QuotationForm`/`QuotationItem`, `PrForm`/`PrItem`, `PoForm`/`PoItem`
  - `QuotationDetail`, `PrDetail`, `PoDetail` → merged into respective Form models
- **Product stock fields updated:**
  - Removed: `orderedStock`
  - Added: `incomingStock`, `outgoingStock`
  - Kept: `currentStock` (but with fresh meaning - physical stock on hand)
- **Stock tracking added:**
  - New `StockTransaction` model to track all stock movements
  - Supports transaction types: incoming, outgoing, received, delivered, adjustment
  - Status tracking: pending, approved, completed


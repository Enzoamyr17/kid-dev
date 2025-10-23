# Stock Management Workflow

**Document Purpose:** Business overview of the intelligent stock management system for company leadership.

**Last Updated:** 2025-10-23

---

## Executive Summary

This document outlines our automated stock management system that intelligently handles inventory from client quotations through supplier ordering, receiving, and final delivery. The system automatically determines whether orders can be fulfilled from existing stock or require ordering from suppliers, providing full traceability throughout the entire process.

### Key Benefits

- **Automatic Stock Allocation**: System automatically determines if orders can be fulfilled from current inventory or need to be ordered
- **Full Traceability**: Complete audit trail from quotation → purchase request → purchase order → delivery
- **Inventory Visibility**: Real-time view of current stock, incoming stock (on order), and outgoing stock (allocated to clients)
- **Dual Fulfillment Support**: Handle both immediate fulfillment from stock and order-then-deliver workflows
- **Peak Season Planning**: Support for pre-ordering stock before high-demand periods

---

## Stock Levels Explained

Our system tracks three types of stock for each product:

| Stock Type          | Meaning                                       | Example                       |
|---------------------|-----------------------------------------------|-------------------------------|
| **Current Stock**   | Physical inventory in warehouse               | 100 units on hand             |
| **Incoming Stock**  | Items ordered from suppliers (not yet arrived)| 50 units on order             |
| **Outgoing Stock**  | Items reserved for approved client quotations | 30 units allocated            |
| **Available Stock** | What can be sold right now                    | Current - Outgoing = 70 units |

---

## Business Workflow

### Scenario 1: Fulfillment from Current Stock

**When:** Client orders products we already have in warehouse

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Quotation Approved                                      │
│ Client: ABC Corp wants 20 units of Product X                   │
│ System Check: Current Stock = 100 units ✓ (sufficient)         │
│                                                                  │
│ ACTION:                                                          │
│ ✓ Immediately deduct from current stock: 100 → 80              │
│ ✓ Create transaction record (allocated from stock)             │
│ ✓ Stock Status: ALLOCATED (ready to deliver when ready)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Delivery to Client                                      │
│ When ready to ship to ABC Corp:                                │
│                                                                  │
│ ACTION:                                                          │
│ ✓ Mark as delivered                                             │
│ ✓ Create delivery transaction record                           │
│ ✓ Stock remains at 80 units (already deducted)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Business Impact:** Fast fulfillment, no supplier delay, immediate revenue

---

### Scenario 2: Need to Order from Supplier

**When:** Client orders more than we have in stock

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Quotation Approved                                      │
│ Client: XYZ Inc wants 150 units of Product Y                   │
│ System Check: Current Stock = 50 units ✗ (insufficient)        │
│                                                                  │
│ ACTION:                                                          │
│ ✓ Reserve for client: Outgoing Stock +150                      │
│ ✓ Create transaction record (to be ordered)                    │
│ ✓ Flag: "Needs PR/PO creation"                                 │
│ ✓ Stock Status: RESERVED (waiting for ordering)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Create Purchase Request (PR)                            │
│ Click "Mark as Approved" on quotation                          │
│                                                                  │
│ ACTION:                                                          │
│ ✓ System auto-creates PR for 150 units                         │
│ ✓ Incoming Stock +150 (on order from supplier)                 │
│ ✓ Create transaction record (incoming from supplier)           │
│ ✓ Link PR to original Quotation for traceability              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Purchase Order (PO) to Supplier                         │
│ Generate PO from PR and send to supplier                       │
│                                                                  │
│ STATUS:                                                          │
│ ✓ Outgoing Stock: 150 (reserved for XYZ Inc)                   │
│ ✓ Incoming Stock: 150 (on order from supplier)                 │
│ ✓ Waiting for supplier delivery                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Receive Goods from Supplier                             │
│ Click "Receive Goods" when items arrive                        │
│                                                                  │
│ ACTION:                                                          │
│ ✓ Current Stock +150 (now 200 units)                           │
│ ✓ Incoming Stock -150 (received, now 0)                        │
│ ✓ Create transaction record (received from supplier)           │
│ ✓ Stock Status: READY TO DELIVER                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Deliver to Client                                       │
│ Click "Deliver to Client" when ready to ship                   │
│                                                                  │
│ ACTION:                                                          │
│ ✓ Current Stock -150 (now 50 units)                            │
│ ✓ Outgoing Stock -150 (delivered, now 0)                       │
│ ✓ Create delivery transaction record                           │
│ ✓ Order Complete                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Business Impact:** Ensures we never oversell, tracks supplier orders, maintains client commitments

---

### Scenario 3: Mixed Fulfillment (Partial Stock + Ordering)

**When:** We have some stock but not enough

```
┌─────────────────────────────────────────────────────────────────┐
│ EXAMPLE: Quotation for 100 units, we have 60 in stock          │
│                                                                  │
│ System automatically splits:                                    │
│ • 60 units → Fulfilled from current stock (immediate)           │
│ • 40 units → Needs to be ordered from supplier                 │
│                                                                  │
│ STOCK CHANGES:                                                   │
│ ✓ Current Stock: -60 (allocated immediately)                    │
│ ✓ Outgoing Stock: +40 (reserved, waiting for order)            │
│ ✓ PR created for: 40 units only                                │
└─────────────────────────────────────────────────────────────────┘
```

**Business Impact:** Optimizes inventory turnover, minimizes ordering costs, faster partial fulfillment

---

### Scenario 4: Pre-Season Stock Building

**When:** Ordering inventory before peak season (no specific client quotation)

```
┌─────────────────────────────────────────────────────────────────┐
│ STANDALONE PURCHASE REQUEST                                     │
│ Decision: Stock up 500 units before peak season                │
│                                                                  │
│ PROCESS:                                                         │
│ 1. Create PR manually (not linked to quotation)                │
│ 2. Incoming Stock +500                                          │
│ 3. Generate PO and send to supplier                            │
│ 4. When goods arrive: Click "Receive Goods"                    │
│ 5. Current Stock +500, Incoming Stock -500                     │
│                                                                  │
│ RESULT:                                                          │
│ ✓ Inventory ready for future quotations                        │
│ ✓ Faster fulfillment during high-demand period                 │
└─────────────────────────────────────────────────────────────────┘
```

**Business Impact:** Proactive inventory planning, reduced lead times during peak periods

---

## Stock Visibility Dashboard

The system provides real-time visibility:

### Product Stock Card Example

```
Product: Industrial Widget Model X-200
─────────────────────────────────────────
Current Stock:      250 units   [Physical inventory]
Incoming Stock:      80 units   [On order from suppliers]
Outgoing Stock:     120 units   [Reserved for clients]
─────────────────────────────────────────
Available to Sell:  130 units   [Current - Outgoing]
Total (with orders): 210 units  [Current + Incoming - Outgoing]
```

### Key Metrics

- **Stock Availability**: Know exactly what can be sold right now
- **Pending Orders**: Track all supplier orders in transit
- **Client Commitments**: See all reserved stock by quotation
- **Stock Velocity**: Measure how fast inventory moves

---

## Traceability & Audit Trail

Every stock movement is recorded with:

1. **Transaction Type**: What happened (allocated, ordered, received, delivered, adjusted)
2. **Reference**: Which quotation/PR/PO caused this change
3. **Source Reference**: Links back to originating document
4. **Timestamp**: When it happened
5. **Quantity**: How much changed
6. **Fulfillment Type**: From stock or ordered from supplier

### Example Audit Trail

```
Product: Widget X-200, Tracking for Quotation QUOTE25-00042
─────────────────────────────────────────────────────────────
2025-10-15 09:30  │ Outgoing Reserved    │ +150 units │ QUOTE25-00042 │ To be ordered
2025-10-15 09:35  │ Incoming Ordered     │ +150 units │ PR25-00028    │ From QUOTE25-00042
2025-10-18 14:20  │ Received from Supplier│ +150 units │ PO25-00019    │ From PR25-00028
2025-10-18 14:21  │ Stock Adjustment     │ -150 (inc) │ Moved to current
2025-10-20 11:00  │ Delivered to Client  │ -150 units │ QUOTE25-00042 │ Order complete
```

**Business Value:** Full accountability, easy to answer "Where did this stock go?" or "When will my order arrive?"

---

## Risk Mitigation

### Problem: Overselling
**Solution:** Automatic reservation system prevents selling stock that's already allocated

### Problem: Lost Orders
**Solution:** Every quotation tracked through entire lifecycle with linked references

### Problem: Stock Discrepancies
**Solution:** Complete audit trail allows reconciliation and identifying issues

### Problem: Supplier Delays
**Solution:** Incoming stock tracking shows what's on order and expected

### Problem: Peak Season Shortages
**Solution:** Support for pre-ordering stock before high-demand periods

---

## Reporting Capabilities

The system enables:

1. **Stock Aging**: How long has inventory been sitting?
2. **Fulfillment Rate**: % of orders filled from stock vs. ordered
3. **Supplier Performance**: Average time from PO to receipt
4. **Stock Turnover**: How efficiently we use inventory
5. **Commitment Analysis**: How much stock is reserved for future deliveries
6. **Reorder Points**: When to order more stock based on patterns

---

## Business Rules Summary

| Situation | System Behavior | Business Benefit |
|-----------|----------------|------------------|
| Quotation approved, stock available | Immediate deduction from current stock | Fast fulfillment |
| Quotation approved, insufficient stock | Reserve + create PR automatically | Never oversell |
| PR created from quotation | Link to original quotation | Full traceability |
| Standalone PR (no quotation) | Build inventory for future | Peak season prep |
| Goods received | Increase current stock, decrease incoming | Accurate inventory |
| Goods delivered | Decrease current & outgoing stock | Complete order cycle |

---

## Next Steps

1. **Review & Approval**: Company leadership reviews this workflow
2. **Technical Implementation**: Development team builds the system
3. **Testing**: Verify all scenarios work correctly
4. **Training**: Staff training on new workflow and UI
5. **Go-Live**: Phased rollout with monitoring
6. **Optimization**: Refine based on real-world usage

---

## Questions for Discussion

1. Do we want automatic PR creation on quotation approval, or manual confirmation?
2. Should we set minimum stock levels with auto-reorder alerts?
3. Do we need approval workflows for standalone PRs (seasonal ordering)?
4. What reports are most important for monthly/quarterly reviews?

---

**Prepared by:** Development Team
**For:** Company Leadership Review
**Status:** Proposal for Implementation

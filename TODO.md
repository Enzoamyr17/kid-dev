# TODO.md

Purchase Order Management System - Implementation Roadmap

## Modules Overview

| Module | Users | Status |
|--------|-------|--------|
| Quotation | Sales/Agents or Anyone | Not Started |
| Purchase Request | Purchasing | Not Started |
| Purchase Order | Purchasing | Not Started |
| Approval Dashboard | General Module | Not Started |

## Complete Workflow

### 1. Quotation Module
**Users:** Sales/Agents or Anyone

**Description:** Creation and Management of Quotations for all users

**Workflow:**
- User/Agent Creates Quotation
- User/Agent Adjusts Workflow if needed
- User/Agent marks Quotation as "Approved" if client Approves
- User/Agent Looks for suppliers per Product

**Next Step:** First step of Purchase Order Life Cycle. After Client Approval, Quotation proceeds to Purchase Request Module List

**Implementation Tasks:**
- [ ] Create Quotation creation form
- [ ] Implement workflow adjustment functionality
- [ ] Add approval status management
- [ ] Build supplier lookup per product feature
- [ ] Design quotation list view
- [ ] Implement quotation detail view

---

### 2. Purchase Request Module
**Users:** Purchasing

**Description:** User/Agent can access Purchase Request List (Approved Quotations) -> Choose Suppliers for the approved Items -> Create POs per group of items (per supplier)

**Workflow:**
- User/Agent Looks for suppliers per Product
- User/Agent Creates PO per group of product (per supplier)
- User/Agent Submits PO to Purchase Order Module List

**Next Step:** After submission, POs proceed to the Purchase Order Module List with Status "Open"

**Implementation Tasks:**
- [ ] Create Purchase Request list view (showing approved quotations)
- [ ] Implement supplier selection interface
- [ ] Build PO grouping logic (group items by supplier)
- [ ] Create PO submission workflow
- [ ] Add validation for supplier assignment

---

### 3. Purchase Order Module
**Users:** Purchasing

**Description:** Purchase Orders are now processed by purchasing

**Workflow:**
- Purchasing sees list of "Open" POs
- Purchasing processes marks PO as "Confirmed" (means he/she is going to process it)
- Purchasing handles purchase and logistic needs to complete PO
- Marks POs as "Done"/"Delivered" or "Processed" and attach proof

**Next Step:** After Marking as "Processed", POs proceed to Approval Dashboard for final clearance

**Implementation Tasks:**
- [ ] Create Purchase Order list view with status filters
- [ ] Implement PO status management (Open → Confirmed → Processed/Done/Delivered)
- [ ] Build file upload for proof of delivery/completion
- [ ] Add logistics tracking features
- [ ] Create PO detail view with all related quotation/request data
- [ ] Implement status change notifications

---

### 4. Approval Dashboard Module
**Users:** General Module - All processes are displayed for approval and checking

**Description:** Where All processes are displayed for approval and checking

**Workflow:**
- Authorized Personnel sees list of Cleared POs
- Checks POs for verification
- Mark POs as "Cleared"

**Next Step:** End of Purchase Order Life Cycle

**Implementation Tasks:**
- [ ] Create Approval Dashboard with all POs pending clearance
- [ ] Implement role-based access control (Authorized Personnel only)
- [ ] Build verification checklist/interface
- [ ] Add final clearance marking functionality
- [ ] Create audit trail/history view
- [ ] Implement dashboard analytics/summary views

---

## Outstanding Questions

### Invoicing
**Question:** When does invoicing occur?
**Context:** Not specified in current workflow - needs clarification on whether invoicing happens:
- After quotation approval?
- After PO is marked as "Processed"?
- After final clearance in Approval Dashboard?
- Separate module entirely?

**Action Required:** Clarify invoicing timing and integration point in the workflow

---

## Technical Considerations

### Database Schema Needs
- [ ] Quotations table (with client approval status)
- [ ] Products table (with supplier relationships)
- [ ] Suppliers table
- [ ] Purchase Requests table (linked to approved quotations)
- [ ] Purchase Orders table (with status tracking)
- [ ] PO Items table (many-to-many relationship with products and suppliers)
- [ ] Users table (with role permissions)
- [ ] Audit/History table (for tracking all status changes)

### Key Features
- [ ] Role-based access control (Sales/Agents, Purchasing, Authorized Personnel)
- [ ] Status workflow management (Quotation → PR → PO → Approval)
- [ ] File upload and attachment system (proof of delivery, documents)
- [ ] Notification system (status changes, approvals needed)
- [ ] Search and filtering (by status, date, supplier, product)
- [ ] Reporting and analytics (purchase history, supplier performance)

### State Transitions
```
Quotation: Draft → Approved
Purchase Request: Open → Submitted
Purchase Order: Open → Confirmed → Processed/Done/Delivered
Approval: Pending → Cleared
```

---

## Priority Order

1. **Phase 1 - Foundation**
   - Set up database schema
   - Implement authentication and role-based access
   - Create basic UI layouts and navigation

2. **Phase 2 - Core Workflow**
   - Quotation Module (creation and approval)
   - Purchase Request Module (supplier selection and PO creation)
   - Purchase Order Module (processing and completion)

3. **Phase 3 - Approval & Analytics**
   - Approval Dashboard (final clearance)
   - Reporting and analytics
   - Audit trails and history

4. **Phase 4 - Enhancement**
   - Notifications and alerts
   - Advanced search and filtering
   - Performance optimization
   - Invoicing module (once requirements clarified)

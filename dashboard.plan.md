<!-- 48bf0a70-4e25-4a7b-bb7a-5ba526ab51a1 fa328f99-8bec-43ba-971c-6141e465ee86 -->
# Refactor to Workflow-based schema with cached, table-first UX

## Decisions

- Data caching: SWR with lightweight typed fetch wrappers
- Templates endpoint: new `/api/workflow-templates` (keep old lifecycle route untouched)

## Scope

- Align APIs and UI with Prisma models: `WorkflowTemplate`, `WorkflowStage`, `Project(workflowId, workflowStageId, approvedBudget)`, `QuotationForm`/`QuotationItem`, `Company*`, `Product`.
- Remove BigInt handling; use numbers. Normalize to camelCase request/response.
- Frontend: shadcn/ui table-first pages; detail dashboards on row click; edit via Sheet/Modal with optimistic updates.

## Backend Edits

- `/api/workflow-templates` (GET, POST, PATCH, DELETE)
- Manage `WorkflowTemplate` and nested `WorkflowStage` CRUD (create/update/delete stages)
- `/api/projects` (GET, POST, PATCH, DELETE)
- POST accepts `{ companyId, code, description, approvedBudget?, workflowTemplateId }` and auto-sets `workflowStageId` to first stage of template
- Responses include `workflow` and `workflowStage`
- `/api/projects/[id]` (GET details, PATCH partial)
- `/api/quotations` (GET, POST)
- POST: `{ projectId, forCompanyId, requestorId?, deliveryTerm?, paymentTerm?, bidPercentage?, totals: { totalCost, bidPrice }, items: [{ productId, supplierId, quantity, internalPrice, clientPrice, total, remarks? }] }`
- Normalize existing `/api/companies`, `/api/addresses`, `/api/proponents`, `/api/products`
- Use numbers, camelCase, remove BigInt serialization
- Update `BACKEND.md` with all routes, payloads, and relations

## Frontend Edits

- Companies `/dashboard/companies`
- Table with counts; row click opens Sheet to edit company, proponents, addresses; SWR optimistic mutations
- Products `/dashboard/products`
- Keep UI; standardize to camelCase + number IDs; minor polish
- Workflow Templates `/dashboard/workflow-templates`
- Table of templates; embedded stages editor (inline add/edit/delete)
- Projects `/dashboard/projects`
- Table columns: code, company, approvedBudget, workflowStage
- Create dialog: select company + workflow template, description, optional budget
- Project Dashboard `/dashboard/projects/[id]`
- Show project details with workflowStage, budget
- Directory tabs: Quotations, PRs, POs pulled from `QuotationForm`, `PrForm`, `PoForm`
- New quotation posts to `/api/quotations`

## SWR, Prefetching & Optimistic Updates

- Add SWRConfig provider in `src/app/layout.tsx` with fetcher and error/toast hooks
- Patterns:
- Prefetch detail on table row hover via `mutate(key, fetcher(), { revalidate: false })`
- Optimistic updates: mutate local cache first, rollback on error, toast errors with Sonner
- Revalidate lists after create/delete; update detail caches in-place

## UX & Accessibility

- Use shadcn/ui: `Table`, `Sheet`, `Button`, `Skeleton`, `Tabs`, `Sonner`, `Field`
- Button-level loading; Skeletons for tables; high-contrast, responsive

## Deliverables

- Updated API route files under `src/app/api/*`
- New/updated pages under `src/app/dashboard/*`
- `BACKEND.md` endpoint contracts
- Typed fetch client and SWR keys

### To-dos

- [x] Add caching provider (SWR) in app root with fetch client
- [x] Create typed API client and query keys; camelCase payloads
- [x] Implement /api/workflow-templates CRUD using WorkflowTemplate/WorkflowStage
- [x] Build /dashboard/workflow-templates table with stage editor
- [x] Rewrite /api/projects and /api/projects/[id] to new schema
- [x] Update /dashboard/projects to select workflow template on create
- [x] Implement /api/quotations using QuotationForm and QuotationItem
- [x] Update /dashboard/projects/[id] to use new models and quotations list
- [x] Normalize companies/addresses/proponents/products APIs to numbers + camelCase
- [x] Create /dashboard/companies table with detail sheet for edit
- [x] Update BACKEND.md with endpoints, payloads, relations


# Audit Logging System

## Overview

This application includes a comprehensive audit logging system that automatically tracks **all database changes** across your entire system. Every INSERT, UPDATE, and DELETE operation is captured with complete before/after data, timestamps, and user attribution.

## Features

✅ **Automatic Tracking** - All database changes are logged automatically via PostgreSQL triggers
✅ **Complete History** - Captures old values, new values, and timestamps for every change
✅ **User Attribution** - Tracks who made each change (when user context is provided)
✅ **Works for All Tables** - Current and future tables are automatically audited
✅ **Database-Level Protection** - Works even if someone bypasses the API
✅ **Zero Performance Impact** - Triggers execute asynchronously after the main transaction

## How It Works

### 1. Database Triggers

PostgreSQL triggers are attached to all tables in the database. When any data is inserted, updated, or deleted, the trigger automatically:

1. Captures the old row data (for UPDATE/DELETE)
2. Captures the new row data (for INSERT/UPDATE)
3. Records the table name and record ID
4. Reads the current user ID from a session variable
5. Saves everything to the `auditLog` table

### 2. Components

#### Database Schema ([prisma/schema.prisma](prisma/schema.prisma))
```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  tableName  String   @db.VarChar(255)
  recordId   String   @db.VarChar(255)
  action     String   @db.VarChar(10)     // INSERT, UPDATE, DELETE
  oldData    Json?                        // Full old row
  newData    Json?                        // Full new row
  changedBy  Int?                         // User ID
  changedAt  DateTime @default(now())

  @@map("auditLog")
}
```

#### SQL Setup ([prisma/audit-setup.sql](prisma/audit-setup.sql))
- Creates the `auditLog` table
- Creates the `audit_trigger_function()` that handles all logging
- Attaches triggers to all existing tables

#### Audit Context Helper ([src/lib/audit-context.ts](src/lib/audit-context.ts))
Provides utilities to set user context for audit logging:
```typescript
import { withAuditUser } from '@/lib/audit-context';

// Wrap database operations to track who made the change
await withAuditUser(userId, async () => {
  await prisma.product.update({
    where: { id: productId },
    data: { name: 'New Name' }
  });
});
```

#### API Endpoint ([src/app/api/audit-logs/route.ts](src/app/api/audit-logs/route.ts))
RESTful API for fetching audit logs with filtering:
- Filter by table, action, date range, user
- Pagination support
- User information enrichment

#### Viewer Page ([src/app/dashboard/audit-logs/page.tsx](src/app/dashboard/audit-logs/page.tsx))
User interface for viewing audit logs:
- Filterable table of all changes
- Detailed view showing before/after comparison
- Export to CSV functionality

## Usage

### Viewing Audit Logs

1. Navigate to [/dashboard/audit-logs](/dashboard/audit-logs)
2. Use filters to find specific changes:
   - Filter by table name (e.g., "Product", "Company")
   - Filter by action type (INSERT, UPDATE, DELETE)
   - Filter by date range
3. Click the eye icon to view detailed before/after comparison

### Adding User Context (Optional)

By default, all changes are tracked automatically. To also track **who** made the change, add user context in your API routes:

#### Option 1: Wrap with `withAuditUser` (Recommended)
```typescript
import { withAuditUser } from '@/lib/audit-context';

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const userId = getUserIdFromSession(request); // Your auth logic

  const product = await withAuditUser(userId, async () => {
    return await prisma.product.update({
      where: { id: body.id },
      data: { name: body.name }
    });
  });

  return NextResponse.json(product);
}
```

#### Option 2: Manual Set/Clear
```typescript
import { setAuditUser, clearAuditUser } from '@/lib/audit-context';

await setAuditUser(userId);
const product = await prisma.product.update({ ... });
await clearAuditUser();
```

### Adding Triggers to New Tables

When you create a new table in the future, add a trigger to enable audit logging:

```sql
-- Replace "NewTable" with your table name
DROP TRIGGER IF EXISTS audit_newtable_trigger ON "NewTable";
CREATE TRIGGER audit_newtable_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "NewTable"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

You can add this to a new migration file or execute it directly against the database.

## API Reference

### GET /api/audit-logs

Fetch audit logs with optional filtering.

**Query Parameters:**
- `tableName` (string) - Filter by specific table
- `recordId` (string) - Filter by specific record ID
- `action` (string) - Filter by action type (INSERT, UPDATE, DELETE)
- `changedBy` (number) - Filter by user ID who made the change
- `startDate` (ISO date) - Filter logs from this date onwards
- `endDate` (ISO date) - Filter logs up to this date
- `limit` (number) - Number of records to return (default: 100, max: 1000)
- `offset` (number) - Number of records to skip for pagination (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "tableName": "Product",
      "recordId": "42",
      "action": "UPDATE",
      "oldData": { "name": "Old Name", "price": 100 },
      "newData": { "name": "New Name", "price": 150 },
      "changedBy": 5,
      "changedAt": "2025-10-22T10:30:00Z",
      "user": {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 1523,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

## Maintenance

### Database Space

Audit logs can grow large over time. Consider:

1. **Archiving old logs** - Move logs older than 1-2 years to an archive table
2. **Regular cleanup** - Delete very old logs if not needed for compliance
3. **Compression** - JSONB fields are automatically compressed by PostgreSQL

### Performance

The audit logging system has minimal performance impact:
- Triggers execute AFTER the main transaction completes
- Indexes ensure fast querying
- No additional round-trips to the database

## Troubleshooting

### Audit logs not appearing

1. **Check triggers are installed:**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_%'
ORDER BY event_object_table;
```

2. **Verify table has trigger:**
If a table is missing from the list, add a trigger manually (see "Adding Triggers to New Tables" above)

### User attribution not working

Make sure you're using the audit context helper in your API routes:
```typescript
import { withAuditUser } from '@/lib/audit-context';
```

If `changedBy` is `null`, it means the user context was not set before the database operation.

## Security Considerations

- Audit logs are **read-only** - there's no way to delete or modify them through the UI
- Only authenticated users should access the audit logs page
- Consider adding role-based access control (RBAC) to restrict who can view audit logs
- Sensitive data (like passwords) are stored in the audit logs - ensure proper access controls

## Files Modified/Created

This audit logging system includes:

✅ [prisma/schema.prisma](prisma/schema.prisma) - Added AuditLog model
✅ [prisma/audit-setup.sql](prisma/audit-setup.sql) - SQL script with triggers
✅ [prisma/run-audit-setup.js](prisma/run-audit-setup.js) - Script executor
✅ [src/lib/audit-context.ts](src/lib/audit-context.ts) - User context helper
✅ [src/app/api/audit-logs/route.ts](src/app/api/audit-logs/route.ts) - API endpoint
✅ [src/app/dashboard/audit-logs/page.tsx](src/app/dashboard/audit-logs/page.tsx) - Viewer UI

## Re-installation

If you need to re-run the setup (e.g., after database reset):

```bash
node prisma/run-audit-setup.js
```

This is safe to run multiple times - it uses `DROP TRIGGER IF EXISTS` to avoid errors.

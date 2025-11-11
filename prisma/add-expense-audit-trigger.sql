-- =====================================================
-- Add Audit Trigger for CompanyExpense Table
-- =====================================================
-- This script adds audit logging for the CompanyExpense table
-- Run this against your database to enable audit logging
-- =====================================================

-- CompanyExpense table
DROP TRIGGER IF EXISTS audit_companyexpense_trigger ON "companyExpense";
CREATE TRIGGER audit_companyexpense_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "companyExpense"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Verify the trigger was created
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'audit_companyexpense_trigger';

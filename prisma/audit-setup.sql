-- =====================================================
-- Audit Logging System Setup for PostgreSQL
-- =====================================================
-- This script creates an automatic audit logging system
-- that tracks all INSERT, UPDATE, and DELETE operations
-- across all tables in your database.
--
-- Features:
-- - Automatic tracking of all data changes
-- - Captures old and new values as JSON
-- - Records who made the change (via session variable)
-- - Timestamps every change
-- - Works for all existing tables
-- - Easy to add to new tables in the future
--
-- Usage:
-- 1. Execute this script against your database
-- 2. Use setAuditUser() helper in your API routes
-- 3. View audit logs in the audit-logs page
-- =====================================================

-- Create the audit log table
CREATE TABLE IF NOT EXISTS "auditLog" (
    id SERIAL PRIMARY KEY,
    "tableName" VARCHAR(255) NOT NULL,
    "recordId" VARCHAR(255) NOT NULL,
    action VARCHAR(10) NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "changedBy" INTEGER,
    "changedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "auditLog_tableName_idx" ON "auditLog"("tableName");
CREATE INDEX IF NOT EXISTS "auditLog_recordId_idx" ON "auditLog"("recordId");
CREATE INDEX IF NOT EXISTS "auditLog_changedBy_idx" ON "auditLog"("changedBy");
CREATE INDEX IF NOT EXISTS "auditLog_changedAt_idx" ON "auditLog"("changedAt");

-- =====================================================
-- Universal Audit Trigger Function
-- =====================================================
-- This function handles INSERT, UPDATE, and DELETE
-- operations for any table in the database.
-- =====================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id INTEGER;
    record_id_value TEXT;
BEGIN
    -- Get the user ID from the session variable (if set)
    BEGIN
        audit_user_id := current_setting('audit.user_id', true)::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            audit_user_id := NULL;
    END;

    -- Handle INSERT operations
    IF (TG_OP = 'INSERT') THEN
        -- Extract the record ID from the new row
        record_id_value := COALESCE(NEW.id::TEXT, 'unknown');

        INSERT INTO "auditLog" (
            "tableName",
            "recordId",
            action,
            "oldData",
            "newData",
            "changedBy",
            "changedAt"
        ) VALUES (
            TG_TABLE_NAME,
            record_id_value,
            'INSERT',
            NULL,
            row_to_json(NEW),
            audit_user_id,
            CURRENT_TIMESTAMP
        );
        RETURN NEW;

    -- Handle UPDATE operations
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Extract the record ID from the old row
        record_id_value := COALESCE(OLD.id::TEXT, 'unknown');

        INSERT INTO "auditLog" (
            "tableName",
            "recordId",
            action,
            "oldData",
            "newData",
            "changedBy",
            "changedAt"
        ) VALUES (
            TG_TABLE_NAME,
            record_id_value,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            audit_user_id,
            CURRENT_TIMESTAMP
        );
        RETURN NEW;

    -- Handle DELETE operations
    ELSIF (TG_OP = 'DELETE') THEN
        -- Extract the record ID from the old row
        record_id_value := COALESCE(OLD.id::TEXT, 'unknown');

        INSERT INTO "auditLog" (
            "tableName",
            "recordId",
            action,
            "oldData",
            "newData",
            "changedBy",
            "changedAt"
        ) VALUES (
            TG_TABLE_NAME,
            record_id_value,
            'DELETE',
            row_to_json(OLD),
            NULL,
            audit_user_id,
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Attach Triggers to All Existing Tables
-- =====================================================
-- This section creates triggers for all your existing
-- tables. Add similar statements for new tables.
-- =====================================================

-- User table
DROP TRIGGER IF EXISTS audit_user_trigger ON "user";
CREATE TRIGGER audit_user_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "user"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Account table
DROP TRIGGER IF EXISTS audit_account_trigger ON "account";
CREATE TRIGGER audit_account_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "account"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Session table (optional - you may want to exclude this)
DROP TRIGGER IF EXISTS audit_session_trigger ON "session";
CREATE TRIGGER audit_session_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "session"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Company table
DROP TRIGGER IF EXISTS audit_company_trigger ON company;
CREATE TRIGGER audit_company_trigger
    AFTER INSERT OR UPDATE OR DELETE ON company
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CompanyAddress table
DROP TRIGGER IF EXISTS audit_companyaddress_trigger ON "CompanyAddress";
CREATE TRIGGER audit_companyaddress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "CompanyAddress"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CompanyProponent table
DROP TRIGGER IF EXISTS audit_companyproponent_trigger ON "companyProponents";
CREATE TRIGGER audit_companyproponent_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "companyProponents"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Product table
DROP TRIGGER IF EXISTS audit_product_trigger ON "Product";
CREATE TRIGGER audit_product_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Product"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ProductPrice table
DROP TRIGGER IF EXISTS audit_productprice_trigger ON "productPrice";
CREATE TRIGGER audit_productprice_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "productPrice"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Project table
DROP TRIGGER IF EXISTS audit_project_trigger ON project;
CREATE TRIGGER audit_project_trigger
    AFTER INSERT OR UPDATE OR DELETE ON project
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- BudgetCategory table
DROP TRIGGER IF EXISTS audit_budgetcategory_trigger ON "BudgetCategory";
CREATE TRIGGER audit_budgetcategory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "BudgetCategory"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ProjectTransaction table
DROP TRIGGER IF EXISTS audit_projecttransaction_trigger ON "ProjectTransaction";
CREATE TRIGGER audit_projecttransaction_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "ProjectTransaction"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- QuotationForm table
DROP TRIGGER IF EXISTS audit_quotationform_trigger ON "quotationForm";
CREATE TRIGGER audit_quotationform_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "quotationForm"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- QuotationItem table
DROP TRIGGER IF EXISTS audit_quotationitem_trigger ON "QuotationItem";
CREATE TRIGGER audit_quotationitem_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "QuotationItem"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- PrForm table
DROP TRIGGER IF EXISTS audit_prform_trigger ON "prForm";
CREATE TRIGGER audit_prform_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "prForm"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- PrItem table
DROP TRIGGER IF EXISTS audit_pritem_trigger ON "PrItem";
CREATE TRIGGER audit_pritem_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "PrItem"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- PoForm table
DROP TRIGGER IF EXISTS audit_poform_trigger ON "poForm";
CREATE TRIGGER audit_poform_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "poForm"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- PoItem table
DROP TRIGGER IF EXISTS audit_poitem_trigger ON "PoItem";
CREATE TRIGGER audit_poitem_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "PoItem"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- WorkflowTemplate table
DROP TRIGGER IF EXISTS audit_workflowtemplate_trigger ON "workflowTemplate";
CREATE TRIGGER audit_workflowtemplate_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "workflowTemplate"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- WorkflowStage table
DROP TRIGGER IF EXISTS audit_workflowstage_trigger ON "workflowStage";
CREATE TRIGGER audit_workflowstage_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "workflowStage"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- StockTransaction table
DROP TRIGGER IF EXISTS audit_stocktransaction_trigger ON "stockTransaction";
CREATE TRIGGER audit_stocktransaction_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "stockTransaction"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CompanyExpense table
DROP TRIGGER IF EXISTS audit_companyexpense_trigger ON "companyExpense";
CREATE TRIGGER audit_companyexpense_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "companyExpense"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this after setup to verify triggers are installed:
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'audit_%'
-- ORDER BY event_object_table;
-- =====================================================

-- =====================================================
-- Adding Triggers to New Tables (Future Use)
-- =====================================================
-- When you create a new table, add a trigger like this:
--
-- DROP TRIGGER IF EXISTS audit_newtable_trigger ON "NewTable";
-- CREATE TRIGGER audit_newtable_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON "NewTable"
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
-- =====================================================

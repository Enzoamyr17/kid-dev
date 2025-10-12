-- Ensure AuditAction enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
  END IF;
END
$$;

-- Create universal audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  audit_action "AuditAction";
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := to_jsonb(NEW);
    changed_fields := ARRAY(SELECT jsonb_object_keys(new_data));
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    -- Only track fields that actually changed
    changed_fields := ARRAY(
      SELECT key FROM jsonb_each(new_data)
      WHERE new_data->key IS DISTINCT FROM old_data->key
    );
  ELSIF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := to_jsonb(OLD);
    new_data := NULL;
    changed_fields := ARRAY(SELECT jsonb_object_keys(old_data));
  END IF;

  -- Only log if there are actual changes (for updates)
  IF TG_OP = 'UPDATE' AND array_length(changed_fields, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert audit log
  INSERT INTO "AuditLog" (
    "timestamp",
    "tableName",
    "recordId",
    "action",
    "oldValues",
    "newValues",
    "changedFields"
  ) VALUES (
    CURRENT_TIMESTAMP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    audit_action,
    old_data,
    new_data,
    changed_fields
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to Company
CREATE TRIGGER company_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Company"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to CompanyAddress
CREATE TRIGGER company_address_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "CompanyAddress"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to CompanyProponent
CREATE TRIGGER company_proponent_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "CompanyProponent"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to Form
CREATE TRIGGER form_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Form"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to FormItem
CREATE TRIGGER form_item_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "FormItem"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to FormRemark
CREATE TRIGGER form_remark_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "FormRemark"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to Lifecycle
CREATE TRIGGER lifecycle_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Lifecycle"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to LifecycleStage
CREATE TRIGGER lifecycle_stage_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "LifecycleStage"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to LifecycleTemplate
CREATE TRIGGER lifecycle_template_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "LifecycleTemplate"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to PoDetail
CREATE TRIGGER po_detail_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "PoDetail"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to PrDetail
CREATE TRIGGER pr_detail_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "PrDetail"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to Product
CREATE TRIGGER product_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Product"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to Project
CREATE TRIGGER project_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Project"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to QuotationDetail
CREATE TRIGGER quotation_detail_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "QuotationDetail"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply trigger to User
CREATE TRIGGER user_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

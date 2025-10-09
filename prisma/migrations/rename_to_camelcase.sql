-- Migration to convert database to camelCase

-- Rename tables
RENAME TABLE `client_addresses` TO `CompanyAddress`;
RENAME TABLE `client_proponents` TO `CompanyProponent`;
RENAME TABLE `companies` TO `Company`;
RENAME TABLE `form_items` TO `FormItem`;
RENAME TABLE `form_remarks` TO `FormRemark`;
RENAME TABLE `forms` TO `Form`;
RENAME TABLE `lifecycle_stages` TO `LifecycleStage`;
RENAME TABLE `lifecycle_templates` TO `LifecycleTemplate`;
RENAME TABLE `lifecycles` TO `Lifecycle`;
RENAME TABLE `po_details` TO `PoDetail`;
RENAME TABLE `pr_details` TO `PrDetail`;
RENAME TABLE `products` TO `Product`;
RENAME TABLE `projects` TO `Project`;
RENAME TABLE `quotation_details` TO `QuotationDetail`;
RENAME TABLE `users` TO `User`;

-- Rename enum types (MySQL doesn't support enum renaming, but Prisma handles this)
-- The enum values remain the same

-- Rename columns in CompanyAddress
ALTER TABLE `CompanyAddress`
  CHANGE COLUMN `company_id` `companyId` BIGINT NOT NULL;

-- Rename columns in CompanyProponent
ALTER TABLE `CompanyProponent`
  CHANGE COLUMN `company_id` `companyId` BIGINT NOT NULL,
  CHANGE COLUMN `contact_person` `contactPerson` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `contact_number` `contactNumber` VARCHAR(255) NOT NULL;

-- Rename columns in Company
ALTER TABLE `Company`
  CHANGE COLUMN `company_name` `companyName` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `tin_number` `tinNumber` VARCHAR(255);

-- Rename columns in FormItem
ALTER TABLE `FormItem`
  CHANGE COLUMN `form_id` `formId` BIGINT NOT NULL,
  CHANGE COLUMN `product_id` `productId` BIGINT UNSIGNED,
  CHANGE COLUMN `supplier_name` `supplierName` VARCHAR(255),
  CHANGE COLUMN `supplier_price` `supplierPrice` BIGINT,
  CHANGE COLUMN `client_price` `clientPrice` BIGINT;

-- Rename columns in FormRemark
ALTER TABLE `FormRemark`
  CHANGE COLUMN `form_id` `formId` BIGINT NOT NULL,
  CHANGE COLUMN `user_id` `userId` BIGINT UNSIGNED NOT NULL;

-- Rename columns in Form
ALTER TABLE `Form`
  CHANGE COLUMN `lifecycle_id` `lifecycleId` BIGINT UNSIGNED NOT NULL,
  CHANGE COLUMN `project_id` `projectId` BIGINT NOT NULL,
  CHANGE COLUMN `parent_id` `parentId` BIGINT,
  CHANGE COLUMN `detail_id` `detailId` BIGINT NOT NULL,
  CHANGE COLUMN `stage_id` `stageId` BIGINT UNSIGNED NOT NULL;

-- Rename columns in LifecycleStage
ALTER TABLE `LifecycleStage`
  CHANGE COLUMN `template_id` `templateId` BIGINT UNSIGNED NOT NULL,
  CHANGE COLUMN `requires_approval` `requiresApproval` BOOLEAN NOT NULL;

-- Rename columns in Lifecycle
ALTER TABLE `Lifecycle`
  CHANGE COLUMN `template_id` `templateId` BIGINT UNSIGNED NOT NULL,
  CHANGE COLUMN `project_id` `projectId` BIGINT NOT NULL,
  CHANGE COLUMN `stage_id` `stageId` BIGINT UNSIGNED NOT NULL;

-- Rename columns in PoDetail
ALTER TABLE `PoDetail`
  CHANGE COLUMN `po_no` `poNo` BIGINT NOT NULL,
  CHANGE COLUMN `from_supplier_id` `fromSupplierId` BIGINT,
  CHANGE COLUMN `for_company_id` `forCompanyId` BIGINT,
  CHANGE COLUMN `payment_method` `paymentMethod` VARCHAR(255),
  CHANGE COLUMN `delivery_date` `deliveryDate` BIGINT,
  CHANGE COLUMN `total_cost` `totalCost` BIGINT,
  CHANGE COLUMN `bid_price` `bidPrice` BIGINT;

-- Rename columns in PrDetail
ALTER TABLE `PrDetail`
  CHANGE COLUMN `pr_no` `prNo` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `date_required` `dateRequired` DATE,
  CHANGE COLUMN `for_company_id` `forCompanyId` BIGINT,
  CHANGE COLUMN `from_supplier_id` `fromSupplierId` BIGINT,
  CHANGE COLUMN `prepared_by` `preparedBy` VARCHAR(255),
  CHANGE COLUMN `approved_by` `approvedBy` VARCHAR(255),
  CHANGE COLUMN `total_cost` `totalCost` BIGINT,
  CHANGE COLUMN `bid_price` `bidPrice` BIGINT;

-- Rename columns in Product
ALTER TABLE `Product`
  CHANGE COLUMN `sub_category` `subCategory` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `ad_category` `adCategory` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `is_active` `isActive` BOOLEAN NOT NULL DEFAULT TRUE;

-- Rename columns in Project
ALTER TABLE `Project`
  CHANGE COLUMN `company_id` `companyId` BIGINT NOT NULL,
  CHANGE COLUMN `approved_budget_cost` `approvedBudgetCost` BIGINT;

-- Rename columns in QuotationDetail
ALTER TABLE `QuotationDetail`
  CHANGE COLUMN `quote_no` `quoteNo` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `for_company_id` `forCompanyId` BIGINT,
  CHANGE COLUMN `requestor_id` `requestorId` BIGINT,
  CHANGE COLUMN `delivery_date` `deliveryDate` DATE,
  CHANGE COLUMN `approved_budget` `approvedBudget` BIGINT,
  CHANGE COLUMN `bid_percentage` `bidPercentage` INT,
  CHANGE COLUMN `payment_method` `paymentMethod` VARCHAR(255),
  CHANGE COLUMN `total_cost` `totalCost` BIGINT,
  CHANGE COLUMN `bid_price` `bidPrice` BIGINT;

-- Rename columns in User
ALTER TABLE `User`
  CHANGE COLUMN `first_name` `firstName` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `second_name` `secondName` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `middle_name` `middleName` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `last_name` `lastName` VARCHAR(255) NOT NULL;

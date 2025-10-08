CREATE TABLE `companies`(
    `id` BIGINT NOT NULL,
    `company_name` VARCHAR(255) NOT NULL,
    `tin_number` VARCHAR(255) NOT NULL,
    `type` ENUM('') NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `client_addresses`(
    `id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,
    `street1` VARCHAR(255) NOT NULL,
    `street2` VARCHAR(255) NOT NULL,
    `subd` VARCHAR(255) NOT NULL,
    `city` VARCHAR(255) NOT NULL,
    `province` VARCHAR(255) NOT NULL,
    `zipcode` INT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `client_proponents`(
    `id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,
    `contact_person` VARCHAR(255) NOT NULL,
    `contact_number` VARCHAR(255) NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `projects`(
    `id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,
    `code` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `forms`(
    `id` BIGINT NOT NULL,
    `lifecycle_id` BIGINT NOT NULL,
    `project_id` BIGINT NOT NULL,
    `parent_id` BIGINT NULL,
    `detail_id` BIGINT NOT NULL,
    `stage_id` BIGINT NOT NULL,
    `type` ENUM('') NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `quotation_details`(
    `id` BIGINT NOT NULL,
    `quote_no`.`` VARCHAR(255) NOT NULL,
    `for_company_id` BIGINT NULL,
    `requestor_id` BIGINT NULL,
    `delivery_date` DATE NULL,
    `approved_budget` BIGINT NULL,
    `bid_percentage` INT NULL,
    `payment_method` VARCHAR(255) NULL,
    `total_cost` BIGINT NULL,
    `bid_price` BIGINT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `pr_details`(
    `id` BIGINT NOT NULL,
    `pr_no` VARCHAR(255) NOT NULL,
    `date_required` DATE NULL,
    `for_company_id` BIGINT NULL,
    `from_supplier_id` BIGINT NULL,
    `prepared_by` VARCHAR(255) NULL,
    `approved_by` VARCHAR(255) NULL,
    `total_cost` BIGINT NULL,
    `bid_price` BIGINT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `po_details`(
    `id` BIGINT NOT NULL,
    `po_no` BIGINT NOT NULL,
    `from_supplier_id` BIGINT NULL,
    `for_company_id` BIGINT NULL,
    `payment_method` ENUM('') NULL,
    `delivery_date` BIGINT NULL,
    `total_cost` BIGINT NULL,
    `bid_price` BIGINT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `form_items`(
    `id` BIGINT NOT NULL,
    `form_id` BIGINT NOT NULL,
    `product_id` BIGINT NULL,
    `quantity` BIGINT NULL,
    `supplier_name` VARCHAR(255) NULL,
    `supplier_price` BIGINT NULL,
    `client_price` BIGINT NULL,
    `total` BIGINT NULL,
    `remarks` LONGTEXT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `lifecycles`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `template_id` BIGINT NOT NULL,
    `project_id` BIGINT NOT NULL,
    `stage_id` BIGINT NOT NULL,
    `status` ENUM('') NOT NULL
);
CREATE TABLE `lifecycle_templates`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL
);
CREATE TABLE `lifecycle_stages`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `template_id` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(255) NOT NULL,
    `order` INT NOT NULL,
    `requires_approval` BOOLEAN NOT NULL
);
CREATE TABLE `form_remarks`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `form_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `remarks` LONGTEXT NOT NULL
);
CREATE TABLE `users`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `first_name` BIGINT NOT NULL,
    `second_name` BIGINT NOT NULL,
    `middle_name` BIGINT NOT NULL,
    `last_name` BIGINT NOT NULL,
    `birthdate` BIGINT NOT NULL,
    `contact` BIGINT NOT NULL,
    `email` BIGINT NOT NULL,
    `password` BIGINT NOT NULL,
    `department` BIGINT NOT NULL,
    `position` BIGINT NOT NULL
);
CREATE TABLE `products`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `sku` BIGINT NOT NULL,
    `name` BIGINT NOT NULL,
    `description` BIGINT NOT NULL,
    `brand` BIGINT NOT NULL,
    `category` BIGINT NOT NULL,
    `sub_category` BIGINT NOT NULL,
    `ad_category` BIGINT NOT NULL,
    `uom` BIGINT NOT NULL,
    `is_active` BIGINT NOT NULL
);
ALTER TABLE
    `products` ADD INDEX `products_sku_index`(`sku`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_lifecycle_id_foreign` FOREIGN KEY(`lifecycle_id`) REFERENCES `lifecycles`(`id`);
ALTER TABLE
    `lifecycle_stages` ADD CONSTRAINT `lifecycle_stages_template_id_foreign` FOREIGN KEY(`template_id`) REFERENCES `lifecycle_templates`(`id`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_stage_id_foreign` FOREIGN KEY(`stage_id`) REFERENCES `lifecycle_stages`(`id`);
ALTER TABLE
    `lifecycles` ADD CONSTRAINT `lifecycles_project_id_foreign` FOREIGN KEY(`project_id`) REFERENCES `projects`(`id`);
ALTER TABLE
    `lifecycles` ADD CONSTRAINT `lifecycles_stage_id_foreign` FOREIGN KEY(`stage_id`) REFERENCES `lifecycle_stages`(`id`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_detail_id_foreign` FOREIGN KEY(`detail_id`) REFERENCES `pr_details`(`id`);
ALTER TABLE
    `lifecycles` ADD CONSTRAINT `lifecycles_id_foreign` FOREIGN KEY(`id`) REFERENCES `lifecycle_templates`(`id`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_detail_id_foreign` FOREIGN KEY(`detail_id`) REFERENCES `quotation_details`(`id`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_detail_id_foreign` FOREIGN KEY(`detail_id`) REFERENCES `po_details`(`id`);
ALTER TABLE
    `client_addresses` ADD CONSTRAINT `client_addresses_company_id_foreign` FOREIGN KEY(`company_id`) REFERENCES `companies`(`id`);
ALTER TABLE
    `forms` ADD CONSTRAINT `forms_parent_id_foreign` FOREIGN KEY(`parent_id`) REFERENCES `forms`(`id`);
ALTER TABLE
    `client_proponents` ADD CONSTRAINT `client_proponents_company_id_foreign` FOREIGN KEY(`company_id`) REFERENCES `companies`(`id`);
ALTER TABLE
    `form_remarks` ADD CONSTRAINT `form_remarks_form_id_foreign` FOREIGN KEY(`form_id`) REFERENCES `forms`(`id`);
ALTER TABLE
    `form_items` ADD CONSTRAINT `form_items_form_id_foreign` FOREIGN KEY(`form_id`) REFERENCES `forms`(`id`);
ALTER TABLE
    `projects` ADD CONSTRAINT `projects_company_id_foreign` FOREIGN KEY(`company_id`) REFERENCES `companies`(`id`);
CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`reason` text,
	`details_json` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `audit_event_scope_idx` ON `audit_event` (`organization_id`,`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cash_session` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`opening_balance_minor` integer NOT NULL,
	`expected_closing_minor` integer,
	`counted_closing_minor` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`opened_by_user_id` text NOT NULL,
	`closed_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`opened_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`closed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_session_status" CHECK("cash_session"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_session_open_uidx` ON `cash_session` (`organization_id`,`branch_id`,`payment_method_id`) WHERE "cash_session"."status" = 'open';--> statement-breakpoint
CREATE TABLE `commission_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`worker_id` text,
	`service_id` text,
	`branch_id` text,
	`percentage_basis_points` integer NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `wash_worker`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "commission_rule_percentage" CHECK("commission_rule"."percentage_basis_points" between 0 and 10000)
);
--> statement-breakpoint
CREATE INDEX `commission_rule_lookup_idx` ON `commission_rule` (`organization_id`,`branch_id`,`worker_id`,`service_id`);--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`display_name` text NOT NULL,
	`phone` text,
	`email` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `customer_organization_name_idx` ON `customer` (`organization_id`,`display_name`);--> statement-breakpoint
CREATE INDEX `customer_organization_phone_idx` ON `customer` (`organization_id`,`phone`);--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`category_id` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`description` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`reversal_of_id` text,
	`reason` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `expense_category`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `expense_branch_date_idx` ON `expense` (`organization_id`,`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `financial_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`description` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`reversal_of_id` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `financial_movement_balance_idx` ON `financial_movement` (`organization_id`,`branch_id`,`payment_method_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `idempotency_record` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`operation` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`resource_id` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_scope_uidx` ON `idempotency_record` (`organization_id`,`actor_user_id`,`operation`,`key`);--> statement-breakpoint
CREATE TABLE `inventory_item` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`type` text DEFAULT 'supply' NOT NULL,
	`unit` text DEFAULT 'unit' NOT NULL,
	`cost_minor` integer DEFAULT 0 NOT NULL,
	`price_minor` integer,
	`low_stock_milli` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "inventory_item_type" CHECK("inventory_item"."type" in ('supply', 'retail', 'both'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_item_active_name_uidx` ON `inventory_item` (`organization_id`,`normalized_name`) WHERE "inventory_item"."is_active" = 1;--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`ticket_id` text,
	`sale_id` text,
	`payment_method_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`reversal_of_id` text,
	`reason` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `wash_ticket`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `payment_ticket_idx` ON `payment` (`organization_id`,`ticket_id`);--> statement-breakpoint
CREATE TABLE `purchase` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`payment_method_id` text NOT NULL,
	`supplier` text,
	`total_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`reversal_of_id` text,
	`reason` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `purchase_branch_date_idx` ON `purchase` (`organization_id`,`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `purchase_line` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_cost_minor` integer NOT NULL,
	`total_minor` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchase`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_item`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `retail_sale` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`ticket_id` text,
	`payment_method_id` text NOT NULL,
	`total_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'posted' NOT NULL,
	`reversal_of_id` text,
	`reason` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `wash_ticket`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `retail_sale_branch_date_idx` ON `retail_sale` (`organization_id`,`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `retail_sale_line` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`total_minor` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `retail_sale`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_item`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `service_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`kind` text DEFAULT 'service' NOT NULL,
	`description` text,
	`duration_minutes` integer,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "service_catalog_kind" CHECK("service_catalog"."kind" in ('service', 'package', 'addon'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_catalog_active_name_uidx` ON `service_catalog` (`organization_id`,`normalized_name`) WHERE "service_catalog"."is_active" = 1;--> statement-breakpoint
CREATE TABLE `service_price` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`service_id` text NOT NULL,
	`vehicle_type_id` text NOT NULL,
	`branch_id` text,
	`amount_minor` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "service_price_nonnegative" CHECK("service_price"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_price_scope_uidx` ON `service_price` (`organization_id`,`service_id`,`vehicle_type_id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `stock_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`item_id` text NOT NULL,
	`kind` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_cost_minor` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`reversal_of_id` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_item`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `stock_movement_balance_idx` ON `stock_movement` (`organization_id`,`branch_id`,`item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `vehicle` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`customer_id` text,
	`vehicle_type_id` text NOT NULL,
	`plate` text,
	`normalized_plate` text,
	`make` text,
	`model` text,
	`color` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_organization_plate_uidx` ON `vehicle` (`organization_id`,`normalized_plate`) WHERE "vehicle"."normalized_plate" is not null;--> statement-breakpoint
CREATE INDEX `vehicle_organization_customer_idx` ON `vehicle` (`organization_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `wash_assignment` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`worker_name` text NOT NULL,
	`allocation_basis_points` integer DEFAULT 10000 NOT NULL,
	`commission_minor` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `wash_ticket`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worker_id`) REFERENCES `wash_worker`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "wash_assignment_allocation" CHECK("wash_assignment"."allocation_basis_points" between 1 and 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wash_assignment_ticket_worker_uidx` ON `wash_assignment` (`ticket_id`,`worker_id`);--> statement-breakpoint
CREATE TABLE `wash_ticket` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`number` integer NOT NULL,
	`customer_id` text,
	`vehicle_id` text,
	`vehicle_type_id` text NOT NULL,
	`vehicle_display` text NOT NULL,
	`currency` text NOT NULL,
	`subtotal_minor` integer NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`retail_subtotal_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`notes` text,
	`cancellation_reason` text,
	`version` integer DEFAULT 1 NOT NULL,
	`started_at` integer,
	`ready_at` integer,
	`delivered_at` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "wash_ticket_status" CHECK("wash_ticket"."status" in ('waiting', 'in_progress', 'ready', 'delivered', 'cancelled')),
	CONSTRAINT "wash_ticket_payment_status" CHECK("wash_ticket"."payment_status" in ('unpaid', 'partial', 'paid', 'refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wash_ticket_branch_number_uidx` ON `wash_ticket` (`organization_id`,`branch_id`,`number`);--> statement-breakpoint
CREATE INDEX `wash_ticket_queue_idx` ON `wash_ticket` (`organization_id`,`branch_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `wash_ticket_line` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`service_id` text,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`price_source` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `wash_ticket`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `service_catalog`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `wash_ticket_line_ticket_idx` ON `wash_ticket_line` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `wash_worker` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text,
	`name` text NOT NULL,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `wash_worker_organization_branch_idx` ON `wash_worker` (`organization_id`,`branch_id`);
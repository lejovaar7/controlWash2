CREATE TABLE `expense_category` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`system_key` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_category_active_name_uidx` ON `expense_category` (`organization_id`,`normalized_name`) WHERE "expense_category"."is_active" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `expense_category_system_key_uidx` ON `expense_category` (`organization_id`,`system_key`) WHERE "expense_category"."system_key" is not null;--> statement-breakpoint
CREATE INDEX `expense_category_organization_order_idx` ON `expense_category` (`organization_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`system_key` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "payment_method_kind" CHECK("payment_method"."kind" in ('cash', 'wallet', 'bank', 'card', 'other'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_active_name_uidx` ON `payment_method` (`organization_id`,`normalized_name`) WHERE "payment_method"."is_active" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_system_key_uidx` ON `payment_method` (`organization_id`,`system_key`) WHERE "payment_method"."system_key" is not null;--> statement-breakpoint
CREATE INDEX `payment_method_organization_order_idx` ON `payment_method` (`organization_id`,`display_order`);--> statement-breakpoint
CREATE TABLE `product_settings` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`delivery_payment_policy` text DEFAULT 'warn' NOT NULL,
	`negative_stock_policy` text DEFAULT 'strict' NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "product_settings_delivery_policy" CHECK("product_settings"."delivery_payment_policy" in ('block', 'warn')),
	CONSTRAINT "product_settings_stock_policy" CHECK("product_settings"."negative_stock_policy" in ('strict', 'warn_and_override'))
);
--> statement-breakpoint
CREATE TABLE `vehicle_type` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`system_key` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_type_active_name_uidx` ON `vehicle_type` (`organization_id`,`normalized_name`) WHERE "vehicle_type"."is_active" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_type_system_key_uidx` ON `vehicle_type` (`organization_id`,`system_key`) WHERE "vehicle_type"."system_key" is not null;--> statement-breakpoint
CREATE INDEX `vehicle_type_organization_order_idx` ON `vehicle_type` (`organization_id`,`display_order`);
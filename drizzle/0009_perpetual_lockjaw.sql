PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payment_method` (
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
INSERT INTO `__new_payment_method`("id", "organization_id", "name", "normalized_name", "system_key", "display_order", "is_active", "created_by_user_id", "created_at", "updated_at") SELECT "id", "organization_id", "name", "normalized_name", "system_key", "display_order", "is_active", "created_by_user_id", "created_at", "updated_at" FROM `payment_method`;--> statement-breakpoint
DROP TABLE `payment_method`;--> statement-breakpoint
ALTER TABLE `__new_payment_method` RENAME TO `payment_method`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_active_name_uidx` ON `payment_method` (`organization_id`,`normalized_name`) WHERE "payment_method"."is_active" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_system_key_uidx` ON `payment_method` (`organization_id`,`system_key`) WHERE "payment_method"."system_key" is not null;--> statement-breakpoint
CREATE INDEX `payment_method_organization_order_idx` ON `payment_method` (`organization_id`,`display_order`);
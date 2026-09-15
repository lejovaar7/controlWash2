import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { organization, user } from "./auth-schema";

/**
 * Technical table used only to verify the
 * schema -> migration -> D1 -> query path.
 */
export const systemCheck = sqliteTable("system_check", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	value: text("value").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

const createdAt = () => integer("created_at", { mode: "timestamp_ms" })
	.notNull()
	.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`);

export const productSettings = sqliteTable("product_settings", {
	organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
	deliveryPaymentPolicy: text("delivery_payment_policy").notNull().default("warn"),
	negativeStockPolicy: text("negative_stock_policy").notNull().default("strict"),
	updatedByUserId: text("updated_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
	createdAt: createdAt(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
}, (table) => [
	check("product_settings_delivery_policy", sql`${table.deliveryPaymentPolicy} in ('block', 'warn')`),
	check("product_settings_stock_policy", sql`${table.negativeStockPolicy} in ('strict', 'warn_and_override')`),
]);

export const paymentMethod = sqliteTable("payment_method", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	normalizedName: text("normalized_name").notNull(),
	kind: text("kind").notNull().default("other"),
	systemKey: text("system_key"),
	displayOrder: integer("display_order").notNull().default(0),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
	createdAt: createdAt(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
}, (table) => [
	uniqueIndex("payment_method_active_name_uidx").on(table.organizationId, table.normalizedName).where(sql`${table.isActive} = 1`),
	uniqueIndex("payment_method_system_key_uidx").on(table.organizationId, table.systemKey).where(sql`${table.systemKey} is not null`),
	index("payment_method_organization_order_idx").on(table.organizationId, table.displayOrder),
	check("payment_method_kind", sql`${table.kind} in ('cash', 'wallet', 'bank', 'card', 'other')`),
]);

export const expenseCategory = sqliteTable("expense_category", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	normalizedName: text("normalized_name").notNull(),
	systemKey: text("system_key"),
	displayOrder: integer("display_order").notNull().default(0),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
	createdAt: createdAt(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
}, (table) => [
	uniqueIndex("expense_category_active_name_uidx").on(table.organizationId, table.normalizedName).where(sql`${table.isActive} = 1`),
	uniqueIndex("expense_category_system_key_uidx").on(table.organizationId, table.systemKey).where(sql`${table.systemKey} is not null`),
	index("expense_category_organization_order_idx").on(table.organizationId, table.displayOrder),
]);

export const vehicleType = sqliteTable("vehicle_type", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	normalizedName: text("normalized_name").notNull(),
	systemKey: text("system_key"),
	displayOrder: integer("display_order").notNull().default(0),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
	createdAt: createdAt(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
}, (table) => [
	uniqueIndex("vehicle_type_active_name_uidx").on(table.organizationId, table.normalizedName).where(sql`${table.isActive} = 1`),
	uniqueIndex("vehicle_type_system_key_uidx").on(table.organizationId, table.systemKey).where(sql`${table.systemKey} is not null`),
	index("vehicle_type_organization_order_idx").on(table.organizationId, table.displayOrder),
]);

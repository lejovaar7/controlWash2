import { and, asc, eq, ne } from "drizzle-orm";
import { AuthError } from "../auth/session";
import { getTenantDb } from "../db";
import { organization } from "../db/auth-schema";
import { expenseCategory, paymentMethod, productSettings, vehicleType } from "../db/schema";
import { RequestError } from "../http";
import { requireTenant, type TenantContext } from "../tenant";

const expenseDefaults = [
	["wash_supplies", "Wash supplies"], ["retail_products", "Retail products"], ["utilities", "Utilities"],
	["maintenance", "Maintenance"], ["rent", "Rent"], ["transport", "Transport"], ["commissions", "Commissions"],
	["payroll", "Payroll"], ["food", "Food"], ["other", "Other"],
] as const;
const vehicleDefaults = [["motorcycle", "Motorcycle"], ["car", "Car"], ["suv", "SUV"], ["truck_pickup", "Truck/Pickup"]] as const;
const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export function canConfigureProduct(tenant: TenantContext) {
	return tenant.organizationRole === "owner" || (tenant.organizationRole === "admin" && tenant.allBranches);
}

function requireProductAdmin(tenant: TenantContext) {
	if (!canConfigureProduct(tenant)) throw new AuthError(403, "NOT_PRODUCT_ADMIN");
}

export async function ensureProductDefaults(env: Env, tenant: TenantContext) {
	const db = getTenantDb(env, tenant.organizationId);
	await db.batch([
		db.insert(productSettings).values({ organizationId: tenant.organizationId, updatedByUserId: tenant.userId }).onConflictDoNothing(),
		db.insert(paymentMethod).values({ id: crypto.randomUUID(), organizationId: tenant.organizationId, name: "Cash", normalizedName: "cash", systemKey: "cash", displayOrder: 0, createdByUserId: tenant.userId }).onConflictDoNothing(),
		...expenseDefaults.map(([systemKey, name], displayOrder) => db.insert(expenseCategory).values({ id: crypto.randomUUID(), organizationId: tenant.organizationId, name, normalizedName: normalizeName(name), systemKey, displayOrder, createdByUserId: tenant.userId }).onConflictDoNothing()),
		...vehicleDefaults.map(([systemKey, name], displayOrder) => db.insert(vehicleType).values({ id: crypto.randomUUID(), organizationId: tenant.organizationId, name, normalizedName: normalizeName(name), systemKey, displayOrder, createdByUserId: tenant.userId }).onConflictDoNothing()),
	]);
}

function readCurrency(value: unknown) {
	if (typeof value !== "string") throw new RequestError(400, "INVALID_CURRENCY");
	const currency = value.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(currency)) throw new RequestError(400, "INVALID_CURRENCY");
	try { new Intl.NumberFormat("en", { style: "currency", currency }).format(0); }
	catch { throw new RequestError(400, "INVALID_CURRENCY"); }
	return currency;
}

function readTimezone(value: unknown) {
	if (typeof value !== "string" || !value.trim() || value.length > 100) throw new RequestError(400, "INVALID_TIMEZONE");
	const timezone = value.trim();
	try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0); }
	catch { throw new RequestError(400, "INVALID_TIMEZONE"); }
	return timezone;
}

export async function getProductSettings(env: Env, request: Request) {
	const tenant = await requireTenant(env, request);
	await ensureProductDefaults(env, tenant);
	const [settings] = await getTenantDb(env, tenant.organizationId).select().from(productSettings).where(eq(productSettings.organizationId, tenant.organizationId)).limit(1);
	if (!settings) throw new Error("product settings initialization failed");
	return { organizationId: tenant.organizationId, currency: tenant.currency, timezone: tenant.timezone, deliveryPaymentPolicy: settings.deliveryPaymentPolicy, negativeStockPolicy: settings.negativeStockPolicy, canEdit: canConfigureProduct(tenant) };
}

export async function updateProductSettings(env: Env, request: Request, body: Record<string, unknown>) {
	const tenant = await requireTenant(env, request);
	requireProductAdmin(tenant);
	await ensureProductDefaults(env, tenant);
	if (Object.keys(body).some((key) => !["currency", "timezone", "deliveryPaymentPolicy", "negativeStockPolicy"].includes(key))) throw new RequestError(400, "INVALID_INPUT");
	const currency = readCurrency(body.currency);
	const timezone = readTimezone(body.timezone);
	const deliveryPaymentPolicy = body.deliveryPaymentPolicy;
	const negativeStockPolicy = body.negativeStockPolicy;
	if (!["block", "warn"].includes(String(deliveryPaymentPolicy)) || !["strict", "warn_and_override"].includes(String(negativeStockPolicy))) throw new RequestError(400, "INVALID_INPUT");
	const expectedCompany = request.headers.get("X-Company-Context");
	if (expectedCompany !== null && expectedCompany !== tenant.organizationId) throw new RequestError(409, "WORKSPACE_CHANGED");
	const db = getTenantDb(env, tenant.organizationId);
	await db.batch([
		db.update(organization).set({ currency, timezone }).where(eq(organization.id, tenant.organizationId)),
		db.update(productSettings).set({ deliveryPaymentPolicy: String(deliveryPaymentPolicy), negativeStockPolicy: String(negativeStockPolicy), updatedByUserId: tenant.userId, updatedAt: new Date() }).where(eq(productSettings.organizationId, tenant.organizationId)),
	]);
	return { organizationId: tenant.organizationId, currency, timezone, deliveryPaymentPolicy, negativeStockPolicy, canEdit: true };
}

export async function listPaymentMethods(env: Env, request: Request) {
	const tenant = await requireTenant(env, request);
	await ensureProductDefaults(env, tenant);
	const methods = await getTenantDb(env, tenant.organizationId).select().from(paymentMethod).where(eq(paymentMethod.organizationId, tenant.organizationId)).orderBy(asc(paymentMethod.displayOrder), asc(paymentMethod.name));
	return { methods, canEdit: canConfigureProduct(tenant) };
}

function readMethodName(value: unknown) {
	if (typeof value !== "string") throw new RequestError(400, "INVALID_INPUT");
	const name = value.trim().replace(/\s+/g, " ");
	if (!name || name.length > 80) throw new RequestError(400, "INVALID_INPUT");
	return name;
}

export async function createPaymentMethod(env: Env, request: Request, body: Record<string, unknown>) {
	const tenant = await requireTenant(env, request);
	requireProductAdmin(tenant);
	await ensureProductDefaults(env, tenant);
	if (Object.keys(body).some((key) => key !== "name")) throw new RequestError(400, "INVALID_INPUT");
	const name = readMethodName(body.name);
	const normalizedName = normalizeName(name);
	const db = getTenantDb(env, tenant.organizationId);
	const [existing] = await db.select({ id: paymentMethod.id }).from(paymentMethod).where(and(eq(paymentMethod.organizationId, tenant.organizationId), eq(paymentMethod.normalizedName, normalizedName), eq(paymentMethod.isActive, true))).limit(1);
	if (existing) throw new RequestError(409, "NAME_ALREADY_EXISTS");
	const current = await db.select({ order: paymentMethod.displayOrder }).from(paymentMethod).where(eq(paymentMethod.organizationId, tenant.organizationId)).orderBy(asc(paymentMethod.displayOrder));
	const id = crypto.randomUUID();
	const displayOrder = (current.at(-1)?.order ?? -1) + 1;
	await db.insert(paymentMethod).values({ id, organizationId: tenant.organizationId, name, normalizedName, displayOrder, createdByUserId: tenant.userId });
	return { id, name, systemKey: null, displayOrder, isActive: true };
}

export async function updatePaymentMethod(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireTenant(env, request);
	requireProductAdmin(tenant);
	await ensureProductDefaults(env, tenant);
	if (Object.keys(body).some((key) => !["name", "isActive"].includes(key))) throw new RequestError(400, "INVALID_INPUT");
	const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(paymentMethod).where(and(eq(paymentMethod.id, id), eq(paymentMethod.organizationId, tenant.organizationId))).limit(1);
	if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const name = body.name === undefined ? current.name : readMethodName(body.name);
	const normalizedName = normalizeName(name);
	const isActive = body.isActive === undefined ? current.isActive : body.isActive;
	if (typeof isActive !== "boolean") throw new RequestError(400, "INVALID_INPUT");
	if (isActive) {
		const [duplicate] = await db.select({ id: paymentMethod.id }).from(paymentMethod).where(and(eq(paymentMethod.organizationId, tenant.organizationId), eq(paymentMethod.normalizedName, normalizedName), eq(paymentMethod.isActive, true), ne(paymentMethod.id, id))).limit(1);
		if (duplicate) throw new RequestError(409, "NAME_ALREADY_EXISTS");
	} else {
		const active = await db.select({ id: paymentMethod.id }).from(paymentMethod).where(and(eq(paymentMethod.organizationId, tenant.organizationId), eq(paymentMethod.isActive, true), ne(paymentMethod.id, id))).limit(1);
		if (!active.length) throw new RequestError(409, "PAYMENT_METHOD_REQUIRED");
	}
	await db.update(paymentMethod).set({ name, normalizedName, isActive, updatedAt: new Date() }).where(and(eq(paymentMethod.id, id), eq(paymentMethod.organizationId, tenant.organizationId)));
	return { id, name, systemKey: current.systemKey, displayOrder: current.displayOrder, isActive };
}

export async function listExpenseCategories(env: Env, request: Request) {
	const tenant = await requireTenant(env, request);
	await ensureProductDefaults(env, tenant);
	return { categories: await getTenantDb(env, tenant.organizationId).select().from(expenseCategory).where(eq(expenseCategory.organizationId, tenant.organizationId)).orderBy(asc(expenseCategory.displayOrder)) };
}

export async function listVehicleTypes(env: Env, request: Request) {
	const tenant = await requireTenant(env, request);
	await ensureProductDefaults(env, tenant);
	return { vehicleTypes: await getTenantDb(env, tenant.organizationId).select().from(vehicleType).where(eq(vehicleType.organizationId, tenant.organizationId)).orderBy(asc(vehicleType.displayOrder)) };
}

async function createSetupItem(env: Env, request: Request, body: Record<string, unknown>, kind: "vehicle" | "expense") {
	const tenant = await requireTenant(env, request); requireProductAdmin(tenant); await ensureProductDefaults(env, tenant);
	if (Object.keys(body).some((key) => key !== "name")) throw new RequestError(400, "INVALID_INPUT");
	const name = readMethodName(body.name); const id = crypto.randomUUID(); const db = getTenantDb(env, tenant.organizationId);
	if (kind === "vehicle") await db.insert(vehicleType).values({ id, organizationId: tenant.organizationId, name, normalizedName: normalizeName(name), displayOrder: 100, createdByUserId: tenant.userId });
	else await db.insert(expenseCategory).values({ id, organizationId: tenant.organizationId, name, normalizedName: normalizeName(name), displayOrder: 100, createdByUserId: tenant.userId });
	return { id, name, systemKey: null, displayOrder: 100, isActive: true };
}

async function updateSetupItem(env: Env, request: Request, id: string, body: Record<string, unknown>, kind: "vehicle" | "expense") {
	const tenant = await requireTenant(env, request); requireProductAdmin(tenant); const table = kind === "vehicle" ? vehicleType : expenseCategory;
	if (Object.keys(body).some((key) => !["name", "isActive"].includes(key))) throw new RequestError(400, "INVALID_INPUT"); const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(table).where(and(eq(table.id, id), eq(table.organizationId, tenant.organizationId))).limit(1); if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const name = body.name === undefined ? current.name : readMethodName(body.name); const isActive = body.isActive === undefined ? current.isActive : body.isActive; if (typeof isActive !== "boolean") throw new RequestError(400, "INVALID_INPUT");
	await db.update(table).set({ name, normalizedName: normalizeName(name), isActive, updatedAt: new Date() }).where(and(eq(table.id, id), eq(table.organizationId, tenant.organizationId))); return { ...current, name, isActive };
}

export const createVehicleType = (env: Env, request: Request, body: Record<string, unknown>) => createSetupItem(env, request, body, "vehicle");
export const updateVehicleType = (env: Env, request: Request, id: string, body: Record<string, unknown>) => updateSetupItem(env, request, id, body, "vehicle");
export const createExpenseCategory = (env: Env, request: Request, body: Record<string, unknown>) => createSetupItem(env, request, body, "expense");
export const updateExpenseCategory = (env: Env, request: Request, id: string, body: Record<string, unknown>) => updateSetupItem(env, request, id, body, "expense");

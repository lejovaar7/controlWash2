import { and, asc, desc, eq, like, ne, or } from "drizzle-orm";
import { AuthError } from "../auth/session";
import { getTenantDb } from "../db";
import { customer, serviceCatalog, servicePrice, vehicle, vehicleType, washWorker, commissionRule } from "../db/schema";
import { RequestError } from "../http";
import { assertKeys, booleanValue, integerValue, normalizeName, normalizePlate, requireManager, requireProductContext, requireProductTenant, textValue } from "./domain";

export async function listCustomers(env: Env, request: Request) {
	const tenant = await requireProductTenant(env, request);
	const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
	const db = getTenantDb(env, tenant.organizationId);
	const where = query ? and(eq(customer.organizationId, tenant.organizationId), or(like(customer.displayName, `%${query}%`), like(customer.phone, `%${query}%`), like(customer.email, `%${query}%`))) : eq(customer.organizationId, tenant.organizationId);
	return { customers: await db.select().from(customer).where(where).orderBy(asc(customer.displayName)).limit(100) };
}

export async function createCustomer(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request);
	assertKeys(body, ["displayName", "phone", "email", "notes"]);
	const id = crypto.randomUUID();
	const values = { id, organizationId: context.tenant.organizationId, displayName: textValue(body.displayName)!, phone: textValue(body.phone, "INVALID_PHONE", 40, true), email: textValue(body.email, "INVALID_EMAIL", 254, true), notes: textValue(body.notes, "INVALID_NOTES", 1000, true), createdByUserId: context.tenant.userId };
	await getTenantDb(env, context.tenant.organizationId).insert(customer).values(values);
	return { ...values, isActive: true };
}

export async function updateCustomer(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request);
	assertKeys(body, ["displayName", "phone", "email", "notes", "isActive"]);
	const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(customer).where(and(eq(customer.id, id), eq(customer.organizationId, tenant.organizationId))).limit(1);
	if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	if (body.isActive === false) requireManager(tenant);
	const values = {
		displayName: body.displayName === undefined ? current.displayName : textValue(body.displayName)!,
		phone: body.phone === undefined ? current.phone : textValue(body.phone, "INVALID_PHONE", 40, true),
		email: body.email === undefined ? current.email : textValue(body.email, "INVALID_EMAIL", 254, true),
		notes: body.notes === undefined ? current.notes : textValue(body.notes, "INVALID_NOTES", 1000, true),
		isActive: body.isActive === undefined ? current.isActive : booleanValue(body.isActive), updatedAt: new Date(),
	};
	await db.update(customer).set(values).where(and(eq(customer.id, id), eq(customer.organizationId, tenant.organizationId)));
	return { ...current, ...values };
}

export async function listVehicles(env: Env, request: Request) {
	const tenant = await requireProductTenant(env, request);
	const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
	const normalized = normalizePlate(query);
	const db = getTenantDb(env, tenant.organizationId);
	const scope = eq(vehicle.organizationId, tenant.organizationId);
	const rows = await db.select({ vehicle, customerName: customer.displayName, vehicleTypeName: vehicleType.name }).from(vehicle)
		.leftJoin(customer, eq(customer.id, vehicle.customerId)).innerJoin(vehicleType, eq(vehicleType.id, vehicle.vehicleTypeId))
		.where(query ? and(scope, or(like(vehicle.normalizedPlate, `%${normalized ?? ""}%`), like(customer.displayName, `%${query}%`))) : scope)
		.orderBy(desc(vehicle.createdAt)).limit(100);
	return { vehicles: rows.map((row) => ({ ...row.vehicle, customerName: row.customerName, vehicleTypeName: row.vehicleTypeName })) };
}

export async function createVehicle(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request);
	assertKeys(body, ["customerId", "vehicleTypeId", "plate", "make", "model", "color", "notes"]);
	const db = getTenantDb(env, context.tenant.organizationId);
	const vehicleTypeId = textValue(body.vehicleTypeId)!;
	const [type] = await db.select().from(vehicleType).where(and(eq(vehicleType.id, vehicleTypeId), eq(vehicleType.organizationId, context.tenant.organizationId), eq(vehicleType.isActive, true))).limit(1);
	if (!type) throw new RequestError(400, "INVALID_VEHICLE_TYPE");
	const customerId = textValue(body.customerId, "INVALID_CUSTOMER", 100, true);
	if (customerId) {
		const [owner] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, customerId), eq(customer.organizationId, context.tenant.organizationId), eq(customer.isActive, true))).limit(1);
		if (!owner) throw new RequestError(400, "INVALID_CUSTOMER");
	}
	const plate = textValue(body.plate, "INVALID_PLATE", 30, true);
	const normalizedPlate = normalizePlate(plate);
	if (normalizedPlate) {
		const [existing] = await db.select({ id: vehicle.id }).from(vehicle).where(and(eq(vehicle.organizationId, context.tenant.organizationId), eq(vehicle.normalizedPlate, normalizedPlate))).limit(1);
		if (existing) throw new RequestError(409, "PLATE_ALREADY_EXISTS");
	}
	const id = crypto.randomUUID();
	const values = { id, organizationId: context.tenant.organizationId, customerId, vehicleTypeId, plate, normalizedPlate, make: textValue(body.make, "INVALID_MAKE", 80, true), model: textValue(body.model, "INVALID_MODEL", 80, true), color: textValue(body.color, "INVALID_COLOR", 40, true), notes: textValue(body.notes, "INVALID_NOTES", 1000, true), createdByUserId: context.tenant.userId };
	await db.insert(vehicle).values(values);
	return { ...values, vehicleTypeName: type.name, isActive: true };
}

export async function getVehicle(env: Env, request: Request, id: string) {
	const tenant = await requireProductTenant(env, request); const db = getTenantDb(env, tenant.organizationId);
	const [row] = await db.select({ vehicle, customerName: customer.displayName, vehicleTypeName: vehicleType.name }).from(vehicle).leftJoin(customer, eq(customer.id, vehicle.customerId)).innerJoin(vehicleType, eq(vehicleType.id, vehicle.vehicleTypeId)).where(and(eq(vehicle.id, id), eq(vehicle.organizationId, tenant.organizationId))).limit(1);
	if (!row) throw new AuthError(404, "RESOURCE_NOT_FOUND"); return { ...row.vehicle, customerName: row.customerName, vehicleTypeName: row.vehicleTypeName };
}

export async function updateVehicle(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); assertKeys(body, ["customerId", "vehicleTypeId", "plate", "make", "model", "color", "notes", "isActive"]); const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(vehicle).where(and(eq(vehicle.id, id), eq(vehicle.organizationId, tenant.organizationId))).limit(1); if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND"); if (body.isActive === false) requireManager(tenant);
	const plate = body.plate === undefined ? current.plate : textValue(body.plate, "INVALID_PLATE", 30, true); const normalizedPlate = normalizePlate(plate);
	if (normalizedPlate) { const [duplicate] = await db.select({ id: vehicle.id }).from(vehicle).where(and(eq(vehicle.organizationId, tenant.organizationId), eq(vehicle.normalizedPlate, normalizedPlate), ne(vehicle.id, id))).limit(1); if (duplicate) throw new RequestError(409, "PLATE_ALREADY_EXISTS"); }
	const values = { customerId: body.customerId === undefined ? current.customerId : textValue(body.customerId, "INVALID_CUSTOMER", 100, true), vehicleTypeId: body.vehicleTypeId === undefined ? current.vehicleTypeId : textValue(body.vehicleTypeId)!, plate, normalizedPlate, make: body.make === undefined ? current.make : textValue(body.make, "INVALID_MAKE", 80, true), model: body.model === undefined ? current.model : textValue(body.model, "INVALID_MODEL", 80, true), color: body.color === undefined ? current.color : textValue(body.color, "INVALID_COLOR", 40, true), notes: body.notes === undefined ? current.notes : textValue(body.notes, "INVALID_NOTES", 1000, true), isActive: body.isActive === undefined ? current.isActive : booleanValue(body.isActive), updatedAt: new Date() };
	await db.update(vehicle).set(values).where(and(eq(vehicle.id, id), eq(vehicle.organizationId, tenant.organizationId))); return { ...current, ...values };
}

export async function listServices(env: Env, request: Request) {
	const tenant = await requireProductTenant(env, request);
	const db = getTenantDb(env, tenant.organizationId);
	const services = await db.select().from(serviceCatalog).where(eq(serviceCatalog.organizationId, tenant.organizationId)).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name));
	const prices = await db.select().from(servicePrice).where(eq(servicePrice.organizationId, tenant.organizationId));
	return { services: services.map((service) => ({ ...service, prices: prices.filter((price) => price.serviceId === service.id) })), canEdit: tenant.organizationRole === "owner" || tenant.organizationRole === "admin" };
}

export async function createService(env: Env, request: Request, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); requireManager(tenant);
	assertKeys(body, ["name", "kind", "description", "durationMinutes"]);
	const name = textValue(body.name)!; const kind = body.kind ?? "service";
	if (!["service", "package", "addon"].includes(String(kind))) throw new RequestError(400, "INVALID_SERVICE_KIND");
	const durationMinutes = body.durationMinutes === undefined || body.durationMinutes === null ? null : integerValue(body.durationMinutes, "INVALID_DURATION", 1, 1440);
	const id = crypto.randomUUID(); const db = getTenantDb(env, tenant.organizationId);
	await db.insert(serviceCatalog).values({ id, organizationId: tenant.organizationId, name, normalizedName: normalizeName(name), kind: String(kind), description: textValue(body.description, "INVALID_DESCRIPTION", 500, true), durationMinutes, createdByUserId: tenant.userId });
	return { id, name, kind, description: body.description ?? null, durationMinutes, isActive: true, prices: [] };
}

export async function updateService(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); requireManager(tenant);
	assertKeys(body, ["name", "description", "durationMinutes", "isActive"]);
	const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(serviceCatalog).where(and(eq(serviceCatalog.id, id), eq(serviceCatalog.organizationId, tenant.organizationId))).limit(1);
	if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const name = body.name === undefined ? current.name : textValue(body.name)!;
	const values = { name, normalizedName: normalizeName(name), description: body.description === undefined ? current.description : textValue(body.description, "INVALID_DESCRIPTION", 500, true), durationMinutes: body.durationMinutes === undefined ? current.durationMinutes : body.durationMinutes === null ? null : integerValue(body.durationMinutes, "INVALID_DURATION", 1, 1440), isActive: body.isActive === undefined ? current.isActive : booleanValue(body.isActive), updatedAt: new Date() };
	await db.update(serviceCatalog).set(values).where(and(eq(serviceCatalog.id, id), eq(serviceCatalog.organizationId, tenant.organizationId)));
	return { ...current, ...values };
}

export async function replaceServicePrices(env: Env, request: Request, serviceId: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); requireManager(tenant);
	assertKeys(body, ["prices"]); if (!Array.isArray(body.prices) || body.prices.length > 100) throw new RequestError(400, "INVALID_PRICES");
	const db = getTenantDb(env, tenant.organizationId);
	const [service] = await db.select({ id: serviceCatalog.id }).from(serviceCatalog).where(and(eq(serviceCatalog.id, serviceId), eq(serviceCatalog.organizationId, tenant.organizationId))).limit(1);
	if (!service) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const rows = body.prices.map((raw) => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new RequestError(400, "INVALID_PRICES");
		const value = raw as Record<string, unknown>; assertKeys(value, ["vehicleTypeId", "branchId", "amountMinor"]);
		return { id: crypto.randomUUID(), organizationId: tenant.organizationId, serviceId, vehicleTypeId: textValue(value.vehicleTypeId)!, branchId: textValue(value.branchId, "INVALID_BRANCH", 100, true), amountMinor: integerValue(value.amountMinor, "INVALID_AMOUNT") };
	});
	const types = await db.select({ id: vehicleType.id }).from(vehicleType).where(and(eq(vehicleType.organizationId, tenant.organizationId), eq(vehicleType.isActive, true)));
	if (rows.some((row) => !types.some((type) => type.id === row.vehicleTypeId))) throw new RequestError(400, "INVALID_VEHICLE_TYPE");
	await db.batch([db.delete(servicePrice).where(and(eq(servicePrice.organizationId, tenant.organizationId), eq(servicePrice.serviceId, serviceId))), ...rows.map((row) => db.insert(servicePrice).values(row))]);
	return { serviceId, prices: rows.map((row) => ({ ...row, isActive: true })) };
}

export async function listWorkers(env: Env, request: Request) {
	const tenant = await requireProductTenant(env, request); const db = getTenantDb(env, tenant.organizationId);
	const workers = await db.select().from(washWorker).where(eq(washWorker.organizationId, tenant.organizationId)).orderBy(asc(washWorker.name));
	const rules = await db.select().from(commissionRule).where(eq(commissionRule.organizationId, tenant.organizationId)).orderBy(desc(commissionRule.effectiveFrom));
	return { workers, rules, canEdit: tenant.organizationRole === "owner" || tenant.organizationRole === "admin" };
}

export async function createWorker(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant);
	assertKeys(body, ["name", "phone", "branchId"]); const id = crypto.randomUUID();
	const values = { id, organizationId: context.tenant.organizationId, branchId: textValue(body.branchId, "INVALID_BRANCH", 100, true), name: textValue(body.name)!, phone: textValue(body.phone, "INVALID_PHONE", 40, true), createdByUserId: context.tenant.userId };
	await getTenantDb(env, context.tenant.organizationId).insert(washWorker).values(values); return { ...values, isActive: true };
}

export async function updateWorker(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); requireManager(tenant); assertKeys(body, ["name", "phone", "isActive"]);
	const db = getTenantDb(env, tenant.organizationId); const [current] = await db.select().from(washWorker).where(and(eq(washWorker.id, id), eq(washWorker.organizationId, tenant.organizationId))).limit(1);
	if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const values = { name: body.name === undefined ? current.name : textValue(body.name)!, phone: body.phone === undefined ? current.phone : textValue(body.phone, "INVALID_PHONE", 40, true), isActive: body.isActive === undefined ? current.isActive : booleanValue(body.isActive), updatedAt: new Date() };
	await db.update(washWorker).set(values).where(and(eq(washWorker.id, id), eq(washWorker.organizationId, tenant.organizationId))); return { ...current, ...values };
}

export async function createCommissionRule(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["workerId", "serviceId", "branchId", "percentageBasisPoints", "effectiveFrom", "effectiveTo"]);
	const id = crypto.randomUUID(); const values = { id, organizationId: context.tenant.organizationId, workerId: textValue(body.workerId, "INVALID_WORKER", 100, true), serviceId: textValue(body.serviceId, "INVALID_SERVICE", 100, true), branchId: textValue(body.branchId, "INVALID_BRANCH", 100, true), percentageBasisPoints: integerValue(body.percentageBasisPoints, "INVALID_PERCENTAGE", 0, 10000), effectiveFrom: body.effectiveFrom ? new Date(textValue(body.effectiveFrom)!) : new Date(), effectiveTo: body.effectiveTo ? new Date(textValue(body.effectiveTo)!) : null, createdByUserId: context.tenant.userId };
	if (Number.isNaN(values.effectiveFrom.getTime()) || (values.effectiveTo && Number.isNaN(values.effectiveTo.getTime()))) throw new RequestError(400, "INVALID_DATE");
	await getTenantDb(env, context.tenant.organizationId).insert(commissionRule).values(values); return { ...values, isActive: true };
}

export async function updateCommissionRule(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const tenant = await requireProductTenant(env, request); requireManager(tenant); assertKeys(body, ["percentageBasisPoints", "effectiveTo", "isActive"]); const db = getTenantDb(env, tenant.organizationId);
	const [current] = await db.select().from(commissionRule).where(and(eq(commissionRule.id, id), eq(commissionRule.organizationId, tenant.organizationId))).limit(1); if (!current) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const effectiveTo = body.effectiveTo === undefined ? current.effectiveTo : body.effectiveTo === null ? null : new Date(textValue(body.effectiveTo)!); if (effectiveTo && Number.isNaN(effectiveTo.getTime())) throw new RequestError(400, "INVALID_DATE"); const values = { percentageBasisPoints: body.percentageBasisPoints === undefined ? current.percentageBasisPoints : integerValue(body.percentageBasisPoints, "INVALID_PERCENTAGE", 0, 10000), effectiveTo, isActive: body.isActive === undefined ? current.isActive : booleanValue(body.isActive) };
	await db.update(commissionRule).set(values).where(and(eq(commissionRule.id, id), eq(commissionRule.organizationId, tenant.organizationId))); return { ...current, ...values };
}

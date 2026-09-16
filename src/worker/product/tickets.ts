import { and, asc, desc, eq, inArray, max, sum } from "drizzle-orm";
import { AuthError } from "../auth/session";
import { getTenantDb } from "../db";
import { auditEvent, commissionRule, customer, idempotencyRecord, payment, serviceCatalog, servicePrice, vehicle, vehicleType, washAssignment, washTicket, washTicketLine, washWorker } from "../db/schema";
import { RequestError } from "../http";
import { assertKeys, auditValues, idempotencyValues, integerValue, readIdempotency, requireManager, requireProductContext, textValue } from "./domain";

type TicketLineInput = { serviceId: string; quantity: number; manualPriceMinor: number | null; overrideReason: string | null };

function parseLines(value: unknown): TicketLineInput[] {
	if (!Array.isArray(value) || value.length === 0 || value.length > 30) throw new RequestError(400, "INVALID_LINES");
	return value.map((raw) => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new RequestError(400, "INVALID_LINES");
		const line = raw as Record<string, unknown>; assertKeys(line, ["serviceId", "quantity", "manualPriceMinor", "overrideReason"]);
		return { serviceId: textValue(line.serviceId)!, quantity: line.quantity === undefined ? 1 : integerValue(line.quantity, "INVALID_QUANTITY", 1, 100), manualPriceMinor: line.manualPriceMinor === undefined || line.manualPriceMinor === null ? null : integerValue(line.manualPriceMinor, "INVALID_AMOUNT"), overrideReason: textValue(line.overrideReason, "INVALID_REASON", 300, true) };
	});
}

async function loadTicket(env: Env, organizationId: string, branchId: string, id: string) {
	return (await getTenantDb(env, organizationId).select().from(washTicket).where(and(eq(washTicket.id, id), eq(washTicket.organizationId, organizationId), eq(washTicket.branchId, branchId))).limit(1))[0] ?? null;
}

export async function listTickets(env: Env, request: Request) {
	const context = await requireProductContext(env, request);
	const status = new URL(request.url).searchParams.get("status");
	const allowed = ["waiting", "in_progress", "ready", "delivered", "cancelled"];
	const scope = and(eq(washTicket.organizationId, context.tenant.organizationId), eq(washTicket.branchId, context.branch.branchId));
	const rows = await getTenantDb(env, context.tenant.organizationId).select().from(washTicket).where(status && allowed.includes(status) ? and(scope, eq(washTicket.status, status)) : scope).orderBy(asc(washTicket.status), asc(washTicket.createdAt)).limit(200);
	return { tickets: rows, branch: context.branch, currency: context.currency };
}

export async function getTicket(env: Env, request: Request, id: string) {
	const context = await requireProductContext(env, request); const db = getTenantDb(env, context.tenant.organizationId);
	const ticket = await loadTicket(env, context.tenant.organizationId, context.branch.branchId, id);
	if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const [lines, assignments, payments] = await Promise.all([
		db.select().from(washTicketLine).where(and(eq(washTicketLine.ticketId, id), eq(washTicketLine.organizationId, context.tenant.organizationId))),
		db.select().from(washAssignment).where(and(eq(washAssignment.ticketId, id), eq(washAssignment.organizationId, context.tenant.organizationId))),
		db.select().from(payment).where(and(eq(payment.ticketId, id), eq(payment.organizationId, context.tenant.organizationId), eq(payment.branchId, context.branch.branchId))).orderBy(desc(payment.createdAt)),
	]);
	return { ticket, lines, assignments, payments };
}

export async function getVehicleTicketHistory(env: Env, request: Request, vehicleId: string) {
	const context = await requireProductContext(env, request); return { tickets: await getTenantDb(env, context.tenant.organizationId).select().from(washTicket).where(and(eq(washTicket.organizationId, context.tenant.organizationId), eq(washTicket.branchId, context.branch.branchId), eq(washTicket.vehicleId, vehicleId))).orderBy(desc(washTicket.createdAt)).limit(200) };
}

export async function updateTicket(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["notes", "expectedVersion"]); const ticket = await loadTicket(env, context.tenant.organizationId, context.branch.branchId, id); if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND"); if (!["waiting", "in_progress"].includes(ticket.status)) throw new RequestError(409, "TICKET_LOCKED"); if (integerValue(body.expectedVersion, "STALE_VERSION", 1) !== ticket.version) throw new RequestError(409, "STALE_VERSION"); const notes = textValue(body.notes, "INVALID_NOTES", 1000, true); const db = getTenantDb(env, context.tenant.organizationId); await db.batch([db.update(washTicket).set({ notes, version: ticket.version + 1, updatedAt: new Date() }).where(and(eq(washTicket.id, id), eq(washTicket.version, ticket.version))), db.insert(auditEvent).values(auditValues(context, "ticket.updated", "wash_ticket", id))]); return { ...ticket, notes, version: ticket.version + 1 };
}

export async function createTicket(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request);
	assertKeys(body, ["customerId", "vehicleId", "vehicleTypeId", "plate", "vehicleDisplay", "lines", "discountMinor", "notes", "workerIds"]);
	const idempotency = await readIdempotency(env, request, context.tenant, "ticket.create", body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const linesInput = parseLines(body.lines);
	const vehicleTypeId = textValue(body.vehicleTypeId)!;
	const [type] = await db.select().from(vehicleType).where(and(eq(vehicleType.id, vehicleTypeId), eq(vehicleType.organizationId, context.tenant.organizationId), eq(vehicleType.isActive, true))).limit(1);
	if (!type) throw new RequestError(400, "INVALID_VEHICLE_TYPE");
	const customerId = textValue(body.customerId, "INVALID_CUSTOMER", 100, true); const vehicleId = textValue(body.vehicleId, "INVALID_VEHICLE", 100, true);
	if (customerId) { const [row] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, customerId), eq(customer.organizationId, context.tenant.organizationId), eq(customer.isActive, true))).limit(1); if (!row) throw new RequestError(400, "INVALID_CUSTOMER"); }
	let storedVehicle = null;
	if (vehicleId) { [storedVehicle] = await db.select().from(vehicle).where(and(eq(vehicle.id, vehicleId), eq(vehicle.organizationId, context.tenant.organizationId), eq(vehicle.isActive, true))).limit(1); if (!storedVehicle || storedVehicle.vehicleTypeId !== vehicleTypeId) throw new RequestError(400, "INVALID_VEHICLE"); }
	const catalog = await db.select().from(serviceCatalog).where(and(eq(serviceCatalog.organizationId, context.tenant.organizationId), eq(serviceCatalog.isActive, true), inArray(serviceCatalog.id, linesInput.map((line) => line.serviceId))));
	if (catalog.length !== new Set(linesInput.map((line) => line.serviceId)).size) throw new RequestError(400, "INVALID_SERVICE");
	const prices = await db.select().from(servicePrice).where(and(eq(servicePrice.organizationId, context.tenant.organizationId), eq(servicePrice.vehicleTypeId, vehicleTypeId), eq(servicePrice.isActive, true), inArray(servicePrice.serviceId, linesInput.map((line) => line.serviceId))));
	const lineRows = linesInput.map((input) => {
		const service = catalog.find((row) => row.id === input.serviceId)!;
		const branchPrice = prices.find((row) => row.serviceId === input.serviceId && row.branchId === context.branch.branchId);
		const defaultPrice = prices.find((row) => row.serviceId === input.serviceId && row.branchId === null);
		const rule = branchPrice ?? defaultPrice;
		if (!rule && input.manualPriceMinor === null) throw new RequestError(400, "PRICE_NOT_AVAILABLE");
		if (input.manualPriceMinor !== null && !input.overrideReason) throw new RequestError(400, "PRICE_OVERRIDE_REASON_REQUIRED");
		if (input.manualPriceMinor !== null) requireManager(context.tenant);
		const unitPriceMinor = input.manualPriceMinor ?? rule!.amountMinor;
		return { id: crypto.randomUUID(), ticketId: "", organizationId: context.tenant.organizationId, serviceId: service.id, kind: service.kind, description: service.name, quantity: input.quantity, unitPriceMinor, totalMinor: unitPriceMinor * input.quantity, priceSource: input.manualPriceMinor !== null ? "manual" : branchPrice ? "branch" : "organization" };
	});
	const subtotalMinor = lineRows.reduce((total, line) => total + line.totalMinor, 0); const discountMinor = body.discountMinor === undefined ? 0 : integerValue(body.discountMinor, "INVALID_DISCOUNT", 0, subtotalMinor);
	if (discountMinor > 0) requireManager(context.tenant);
	const [counter] = await db.select({ value: max(washTicket.number) }).from(washTicket).where(and(eq(washTicket.organizationId, context.tenant.organizationId), eq(washTicket.branchId, context.branch.branchId)));
	const id = crypto.randomUUID(); const number = (counter?.value ?? 0) + 1;
	const workerIds = body.workerIds === undefined ? [] : Array.isArray(body.workerIds) ? body.workerIds.map((value) => textValue(value)!) : (() => { throw new RequestError(400, "INVALID_WORKERS"); })();
	const workers = workerIds.length ? await db.select().from(washWorker).where(and(eq(washWorker.organizationId, context.tenant.organizationId), eq(washWorker.isActive, true), inArray(washWorker.id, workerIds))) : [];
	if (workers.length !== new Set(workerIds).size) throw new RequestError(400, "INVALID_WORKER");
	const vehicleDisplay = textValue(body.vehicleDisplay, "INVALID_VEHICLE", 160, true) ?? storedVehicle?.plate ?? `${type.name} #${number}`;
	const response = { id, number, branchId: context.branch.branchId, vehicleDisplay, status: "waiting", paymentStatus: "unpaid", subtotalMinor, discountMinor, totalMinor: subtotalMinor - discountMinor, currency: context.currency, version: 1 };
	lineRows.forEach((line) => { line.ticketId = id; });
	const commands = [
		db.insert(washTicket).values({ ...response, organizationId: context.tenant.organizationId, customerId, vehicleId, vehicleTypeId, retailSubtotalMinor: 0, notes: textValue(body.notes, "INVALID_NOTES", 1000, true), createdByUserId: context.tenant.userId }),
		...lineRows.map((line) => db.insert(washTicketLine).values(line)),
		...workers.map((worker, index) => db.insert(washAssignment).values({ id: crypto.randomUUID(), ticketId: id, organizationId: context.tenant.organizationId, workerId: worker.id, workerName: worker.name, allocationBasisPoints: Math.floor(10000 / workers.length) + (index === 0 ? 10000 % workers.length : 0), commissionMinor: 0 })),
		db.insert(auditEvent).values(auditValues(context, "ticket.created", "wash_ticket", id, null, { number, totalMinor: response.totalMinor })),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, "ticket.create", idempotency, id, response)),
	];
	await db.batch([commands[0]!, ...commands.slice(1)]); return response;
}

const transitions: Record<string, string[]> = { waiting: ["in_progress", "cancelled"], in_progress: ["ready", "cancelled"], ready: ["delivered", "cancelled"], delivered: [], cancelled: [] };

async function calculateCommissions(env: Env, context: Awaited<ReturnType<typeof requireProductContext>>, ticketId: string) {
	const db = getTenantDb(env, context.tenant.organizationId); const assignments = await db.select().from(washAssignment).where(and(eq(washAssignment.ticketId, ticketId), eq(washAssignment.organizationId, context.tenant.organizationId)));
	if (!assignments.length) return [];
	const [rules, lines] = await Promise.all([db.select().from(commissionRule).where(and(eq(commissionRule.organizationId, context.tenant.organizationId), eq(commissionRule.isActive, true))), db.select().from(washTicketLine).where(and(eq(washTicketLine.ticketId, ticketId), eq(washTicketLine.organizationId, context.tenant.organizationId)))]);
	return assignments.map((assignment) => {
		const commissionMinor = lines.reduce((total, line) => {
			const applicable = rules.filter((rule) => (!rule.workerId || rule.workerId === assignment.workerId) && (!rule.serviceId || rule.serviceId === line.serviceId) && (!rule.branchId || rule.branchId === context.branch.branchId) && rule.effectiveFrom.getTime() <= Date.now() && (!rule.effectiveTo || rule.effectiveTo.getTime() >= Date.now())).sort((a, b) => Number(Boolean(b.workerId)) - Number(Boolean(a.workerId)) || Number(Boolean(b.serviceId)) - Number(Boolean(a.serviceId)) || Number(Boolean(b.branchId)) - Number(Boolean(a.branchId)))[0];
			return total + (applicable ? Math.round(line.totalMinor * assignment.allocationBasisPoints * applicable.percentageBasisPoints / 100_000_000) : 0);
		}, 0);
		return { assignment, commissionMinor };
	});
}

export async function transitionTicket(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["to", "expectedVersion", "overrideReason"]);
	const idempotency = await readIdempotency(env, request, context.tenant, `ticket.transition.${id}`, body); if (idempotency.replay) return idempotency.replay;
	const ticket = await loadTicket(env, context.tenant.organizationId, context.branch.branchId, id); if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const to = textValue(body.to)!; if (!transitions[ticket.status]?.includes(to)) throw new RequestError(409, "INVALID_TRANSITION");
	if (integerValue(body.expectedVersion, "STALE_VERSION", 1) !== ticket.version) throw new RequestError(409, "STALE_VERSION");
	const db = getTenantDb(env, context.tenant.organizationId); const commands = [];
	if (to === "delivered") {
		const [collected] = await db.select({ total: sum(payment.amountMinor) }).from(payment).where(and(eq(payment.organizationId, context.tenant.organizationId), eq(payment.ticketId, id)));
		const paid = Number(collected?.total ?? 0); if (paid < ticket.totalMinor) {
			const reason = textValue(body.overrideReason, "DELIVERY_PAYMENT_REQUIRED", 300, true);
			if (!reason) throw new RequestError(409, "DELIVERY_PAYMENT_REQUIRED"); requireManager(context.tenant);
		}
		for (const item of await calculateCommissions(env, context, id)) commands.push(db.update(washAssignment).set({ commissionMinor: item.commissionMinor }).where(eq(washAssignment.id, item.assignment.id)));
	}
	const now = new Date(); const response = { ...ticket, status: to, version: ticket.version + 1, startedAt: to === "in_progress" ? now : ticket.startedAt, readyAt: to === "ready" ? now : ticket.readyAt, deliveredAt: to === "delivered" ? now : ticket.deliveredAt, updatedAt: now };
	commands.push(db.update(washTicket).set({ status: to, version: response.version, startedAt: response.startedAt, readyAt: response.readyAt, deliveredAt: response.deliveredAt, updatedAt: now }).where(and(eq(washTicket.id, id), eq(washTicket.version, ticket.version))));
	commands.push(db.insert(auditEvent).values(auditValues(context, `ticket.${to}`, "wash_ticket", id, textValue(body.overrideReason, "INVALID_REASON", 300, true))));
	commands.push(db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, `ticket.transition.${id}`, idempotency, id, response)));
	await db.batch([commands[0]!, ...commands.slice(1)]); return response;
}

export async function assignWorkers(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["workerIds", "expectedVersion"]); const ticket = await loadTicket(env, context.tenant.organizationId, context.branch.branchId, id);
	if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND"); if (["delivered", "cancelled"].includes(ticket.status)) throw new RequestError(409, "TICKET_TERMINAL");
	if (integerValue(body.expectedVersion, "STALE_VERSION", 1) !== ticket.version || !Array.isArray(body.workerIds) || body.workerIds.length > 10) throw new RequestError(409, "STALE_VERSION");
	const workerIds = body.workerIds.map((value) => textValue(value)!); const db = getTenantDb(env, context.tenant.organizationId); const workers = workerIds.length ? await db.select().from(washWorker).where(and(eq(washWorker.organizationId, context.tenant.organizationId), eq(washWorker.isActive, true), inArray(washWorker.id, workerIds))) : [];
	if (workers.length !== new Set(workerIds).size) throw new RequestError(400, "INVALID_WORKER");
	await db.batch([db.delete(washAssignment).where(and(eq(washAssignment.ticketId, id), eq(washAssignment.organizationId, context.tenant.organizationId))), ...workers.map((worker, index) => db.insert(washAssignment).values({ id: crypto.randomUUID(), ticketId: id, organizationId: context.tenant.organizationId, workerId: worker.id, workerName: worker.name, allocationBasisPoints: Math.floor(10000 / workers.length) + (index === 0 ? 10000 % workers.length : 0), commissionMinor: 0 })), db.update(washTicket).set({ version: ticket.version + 1, updatedAt: new Date() }).where(and(eq(washTicket.id, id), eq(washTicket.version, ticket.version))), db.insert(auditEvent).values(auditValues(context, "ticket.assignments.updated", "wash_ticket", id))]);
	return { ticketId: id, version: ticket.version + 1, assignments: workers.map((worker) => ({ workerId: worker.id, workerName: worker.name })) };
}

export async function cancelTicket(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["reason", "expectedVersion"]); requireManager(context.tenant); const reason = textValue(body.reason, "REASON_REQUIRED", 300)!;
	const ticket = await loadTicket(env, context.tenant.organizationId, context.branch.branchId, id); if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	if (!transitions[ticket.status]?.includes("cancelled") || integerValue(body.expectedVersion, "STALE_VERSION", 1) !== ticket.version) throw new RequestError(409, "INVALID_TRANSITION");
	const db = getTenantDb(env, context.tenant.organizationId); const [collected] = await db.select({ total: sum(payment.amountMinor) }).from(payment).where(and(eq(payment.organizationId, context.tenant.organizationId), eq(payment.ticketId, id)));
	if (Number(collected?.total ?? 0) !== 0) throw new RequestError(409, "REVERSE_PAYMENTS_FIRST");
	await db.batch([db.update(washTicket).set({ status: "cancelled", cancellationReason: reason, version: ticket.version + 1, updatedAt: new Date() }).where(and(eq(washTicket.id, id), eq(washTicket.version, ticket.version))), db.insert(auditEvent).values(auditValues(context, "ticket.cancelled", "wash_ticket", id, reason))]);
	return { ...ticket, status: "cancelled", cancellationReason: reason, version: ticket.version + 1 };
}

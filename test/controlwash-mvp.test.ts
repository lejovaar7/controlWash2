import { env } from "cloudflare:test";
import { and, eq, sum } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getAuth } from "../src/worker/auth";
import { getDb } from "../src/worker/db";
import { financialMovement, inventoryItem, paymentMethod, serviceCatalog, stockMovement, vehicleType, washAssignment, washTicket } from "../src/worker/db/schema";
import { callApi, createActor, type Actor } from "./helpers";

let owner: Actor;
let outsider: Actor;
let organizationId: string;
let outsiderOrganizationId: string;
let branchId: string;
let typeId: string;
let cashId: string;
let nequiId: string;
let serviceId: string;
let workerId: string;

const idempotent = (path: string, actor: Actor, body: unknown, key: string) => callApi(path, actor, body, "POST", { "Idempotency-Key": key });

beforeAll(async () => {
	owner = await createActor("controlwash-mvp-owner@test.invalid"); outsider = await createActor("controlwash-mvp-outsider@test.invalid"); const auth = getAuth(env);
	const organization = await auth.api.createOrganization({ body: { name: "ControlWash MVP", slug: "controlwash-mvp", userId: owner.userId } });
	const outsiderOrganization = await auth.api.createOrganization({ body: { name: "Other Wash", slug: "other-wash-mvp", userId: outsider.userId } });
	if (!organization || !outsiderOrganization) throw new Error("organizations missing"); organizationId = organization.id; outsiderOrganizationId = outsiderOrganization.id;
	await auth.api.setActiveOrganization({ headers: owner.headers, body: { organizationId } }); await auth.api.setActiveOrganization({ headers: outsider.headers, body: { organizationId: outsiderOrganizationId } });
	const branch = await auth.api.createTeam({ headers: owner.headers, body: { name: "Sede Principal", organizationId } }); branchId = branch.id; await auth.api.addTeamMember({ headers: owner.headers, body: { teamId: branchId, userId: owner.userId } }); await auth.api.setActiveTeam({ headers: owner.headers, body: { teamId: branchId } });
	const otherBranch = await auth.api.createTeam({ headers: outsider.headers, body: { name: "Other", organizationId: outsiderOrganizationId } }); await auth.api.addTeamMember({ headers: outsider.headers, body: { teamId: otherBranch.id, userId: outsider.userId } }); await auth.api.setActiveTeam({ headers: outsider.headers, body: { teamId: otherBranch.id } });
	await callApi("/api/product/settings", owner, { currency: "COP", timezone: "America/Bogota", deliveryPaymentPolicy: "block", negativeStockPolicy: "strict" }, "PATCH");
	const [type] = await getDb(env).select().from(vehicleType).where(and(eq(vehicleType.organizationId, organizationId), eq(vehicleType.systemKey, "car"))); const [cash] = await getDb(env).select().from(paymentMethod).where(and(eq(paymentMethod.organizationId, organizationId), eq(paymentMethod.systemKey, "cash"))); if (!type || !cash) throw new Error("defaults missing"); typeId = type.id; cashId = cash.id;
});

describe("ControlWash service, worker, and wash lifecycle", () => {
	it("configures a priced service and a commission rule", async () => {
		const serviceResponse = await callApi("/api/services", owner, { name: "Exterior wash", kind: "service", durationMinutes: 30 }); expect(serviceResponse.status).toBe(201); serviceId = (await serviceResponse.json() as { id: string }).id;
		const priceResponse = await callApi(`/api/services/${serviceId}/prices`, owner, { prices: [{ vehicleTypeId: typeId, branchId: null, amountMinor: 30000 }] }, "PUT"); expect(priceResponse.status).toBe(200);
		const workerResponse = await callApi("/api/workers", owner, { name: "Ana", phone: "3000000000" }); expect(workerResponse.status).toBe(201); workerId = (await workerResponse.json() as { id: string }).id;
		const rule = await callApi("/api/commission-rules", owner, { workerId, serviceId, branchId, percentageBasisPoints: 2000 }); expect(rule.status).toBe(201);
	});

	it("creates one wash under retry, collects it, and advances the valid state machine", async () => {
		const body = { vehicleTypeId: typeId, vehicleDisplay: "ABC123", lines: [{ serviceId, quantity: 1 }], workerIds: [workerId] }; const first = await idempotent("/api/wash-tickets", owner, body, "wash-1"); const retry = await idempotent("/api/wash-tickets", owner, body, "wash-1"); expect(first.status).toBe(201); expect(retry.status).toBe(201); const created = await first.json() as { id: string; totalMinor: number; version: number }; expect(await retry.json()).toMatchObject({ id: created.id });
		expect(await getDb(env).select().from(washTicket).where(eq(washTicket.id, created.id))).toHaveLength(1);
		const partial = await idempotent(`/api/wash-tickets/${created.id}/payments`, owner, { paymentMethodId: cashId, amountMinor: 100 }, "payment-partial"); expect(partial.status).toBe(400);
		const payment = await idempotent(`/api/wash-tickets/${created.id}/payments`, owner, { paymentMethodId: cashId, amountMinor: created.totalMinor }, "payment-1"); expect(payment.status).toBe(201);
		const secondPayment = await idempotent(`/api/wash-tickets/${created.id}/payments`, owner, { paymentMethodId: cashId, amountMinor: created.totalMinor }, "payment-2"); expect(secondPayment.status).toBe(409);
		let version = created.version; for (const [index, to] of ["in_progress", "ready", "delivered"].entries()) { const response = await idempotent(`/api/wash-tickets/${created.id}/transitions`, owner, { to, expectedVersion: version }, `transition-${index}`); expect(response.status).toBe(200); version += 1; }
		const [ticket] = await getDb(env).select().from(washTicket).where(eq(washTicket.id, created.id)); expect(ticket).toMatchObject({ status: "delivered", paymentStatus: "paid" }); const [assignment] = await getDb(env).select().from(washAssignment).where(eq(washAssignment.ticketId, created.id)); expect(assignment?.commissionMinor).toBe(6000);
	});

	it("rejects a stale transition and foreign-tenant access", async () => {
		const [ticket] = await getDb(env).select().from(washTicket).where(eq(washTicket.organizationId, organizationId)).limit(1); if (!ticket) throw new Error("ticket missing"); const stale = await idempotent(`/api/wash-tickets/${ticket.id}/transitions`, owner, { to: "ready", expectedVersion: 1 }, "stale"); expect(stale.status).toBe(409); const foreign = await callApi(`/api/wash-tickets/${ticket.id}`, outsider); expect(foreign.status).toBe(404);
	});
});

describe("ControlWash money, inventory, and retail", () => {
	it("records an opening adjustment, expense reversal, and same-branch method transfer", async () => {
		const nequi = await callApi("/api/payment-methods", owner, { name: "Nequi" }); nequiId = (await nequi.json() as { id: string }).id;
		expect((await idempotent("/api/financial-adjustments", owner, { paymentMethodId: cashId, amountMinor: 100000, description: "Opening balance", reason: "Initial count" }, "opening")).status).toBe(201);
		const categories = await callApi("/api/expense-categories", owner); const categoryId = (await categories.json() as { categories: { id: string }[] }).categories[0]!.id; const expense = await idempotent("/api/expenses", owner, { categoryId, paymentMethodId: cashId, amountMinor: 15000, description: "Maintenance" }, "expense-1"); const expenseId = (await expense.json() as { id: string }).id; expect((await idempotent(`/api/expenses/${expenseId}/reverse`, owner, { reason: "Incorrect value" }, "expense-reverse")).status).toBe(201);
		const transfer = await idempotent("/api/financial-transfers", owner, { fromPaymentMethodId: cashId, toPaymentMethodId: nequiId, amountMinor: 10000, reason: "Deposit" }, "transfer-1"); expect(transfer.status).toBe(201); const balances = await callApi("/api/financial-balances", owner); const values = (await balances.json() as { balances: { id: string; balanceMinor: number }[] }).balances; expect(values.find((row) => row.id === nequiId)?.balanceMinor).toBe(10000);
	});

	it("posts stock, purchase, sale, and exact stock effects", async () => {
		const itemResponse = await callApi("/api/inventory/items", owner, { name: "Water", type: "retail", unit: "unit", costMinor: 1000, priceMinor: 2000, lowStockMilli: 2000 }); const itemId = (await itemResponse.json() as { id: string }).id;
		expect((await idempotent("/api/inventory/opening-stock", owner, { itemId, quantityMilli: 10000 }, "stock-open")).status).toBe(201);
		expect((await idempotent("/api/purchases", owner, { paymentMethodId: nequiId, supplier: "Supplier", lines: [{ itemId, quantityMilli: 5000, unitCostMinor: 1000 }] }, "purchase-1")).status).toBe(201);
		expect((await idempotent("/api/retail-sales", owner, { paymentMethodId: cashId, lines: [{ itemId, quantityMilli: 2000 }] }, "sale-1")).status).toBe(201);
		const [stock] = await getDb(env).select({ value: sum(stockMovement.quantityMilli) }).from(stockMovement).where(and(eq(stockMovement.organizationId, organizationId), eq(stockMovement.branchId, branchId), eq(stockMovement.itemId, itemId))); expect(Number(stock?.value)).toBe(13000);
	});

	it("reconciles dashboard and report endpoints from authoritative movements", async () => {
		const dashboard = await callApi("/api/reports/dashboard", owner); expect(dashboard.status).toBe(200); await expect(dashboard.json()).resolves.toMatchObject({ currency: "COP", washes: expect.any(Number), balances: expect.any(Array) });
		const report = await callApi("/api/reports/finance", owner); expect(report.status).toBe(200); const body = await report.json() as { movements: unknown[]; netMinor: number }; expect(body.movements.length).toBeGreaterThan(0); const [sumRow] = await getDb(env).select({ value: sum(financialMovement.amountMinor) }).from(financialMovement).where(and(eq(financialMovement.organizationId, organizationId), eq(financialMovement.branchId, branchId))); expect(body.netMinor).toBe(Number(sumRow?.value ?? 0));
	});

	it("keeps catalog and inventory rows in their organization", async () => {
		expect(await getDb(env).select().from(serviceCatalog).where(and(eq(serviceCatalog.organizationId, outsiderOrganizationId), eq(serviceCatalog.id, serviceId)))).toHaveLength(0); expect(await getDb(env).select().from(inventoryItem).where(eq(inventoryItem.organizationId, outsiderOrganizationId))).toHaveLength(0);
	});
});

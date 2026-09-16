import { env } from "cloudflare:test";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getAuth } from "../src/worker/auth";
import { getDb } from "../src/worker/db";
import { member, organization } from "../src/worker/db/auth-schema";
import { expenseCategory, paymentMethod, productSettings, vehicleType } from "../src/worker/db/schema";
import { callApi, createActor, type Actor } from "./helpers";

let ownerA: Actor;
let ownerB: Actor;
let limitedAdmin: Actor;
let orgAId: string;
let orgBId: string;

beforeAll(async () => {
	ownerA = await createActor("wash-setup-owner-a@test.invalid");
	ownerB = await createActor("wash-setup-owner-b@test.invalid");
	limitedAdmin = await createActor("wash-setup-limited@test.invalid");
	const auth = getAuth(env);
	const orgA = await auth.api.createOrganization({ body: { name: "Wash Setup A", slug: "wash-setup-a", userId: ownerA.userId } });
	const orgB = await auth.api.createOrganization({ body: { name: "Wash Setup B", slug: "wash-setup-b", userId: ownerB.userId } });
	if (!orgA || !orgB) throw new Error("organizations missing");
	orgAId = orgA.id;
	orgBId = orgB.id;
	await auth.api.setActiveOrganization({ headers: ownerA.headers, body: { organizationId: orgAId } });
	await auth.api.setActiveOrganization({ headers: ownerB.headers, body: { organizationId: orgBId } });
	await getDb(env).insert(member).values({ id: `wash-limited-${limitedAdmin.userId}`, organizationId: orgAId, userId: limitedAdmin.userId, role: "admin", allBranches: false, createdAt: new Date() });
	await auth.api.setActiveOrganization({ headers: limitedAdmin.headers, body: { organizationId: orgAId } });
});

describe("ControlWash product initialization", () => {
	it("seeds one Cash method, standard categories, vehicle types, and settings", async () => {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const response = await callApi("/api/product/settings", ownerA);
			expect(response.status).toBe(200);
		}
		const db = getDb(env);
		expect(await db.select().from(productSettings).where(eq(productSettings.organizationId, orgAId))).toHaveLength(1);
		expect(await db.select().from(paymentMethod).where(eq(paymentMethod.organizationId, orgAId))).toHaveLength(1);
		expect(await db.select().from(expenseCategory).where(eq(expenseCategory.organizationId, orgAId))).toHaveLength(10);
		expect(await db.select().from(vehicleType).where(eq(vehicleType.organizationId, orgAId))).toHaveLength(4);
	});

	it("keeps default catalogs isolated by Organization", async () => {
		await callApi("/api/product/settings", ownerB);
		const methodsA = await getDb(env).select().from(paymentMethod).where(eq(paymentMethod.organizationId, orgAId));
		const methodsB = await getDb(env).select().from(paymentMethod).where(eq(paymentMethod.organizationId, orgBId));
		expect(methodsA).toHaveLength(1);
		expect(methodsB).toHaveLength(1);
		expect(methodsA[0]?.id).not.toBe(methodsB[0]?.id);
	});
});

describe("ControlWash settings and payment methods", () => {
	it("lets the owner save exact operational policies", async () => {
		const response = await callApi("/api/product/settings", ownerA, { currency: "cop", timezone: "America/Bogota", deliveryPaymentPolicy: "block", negativeStockPolicy: "strict" }, "PATCH");
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ currency: "COP", timezone: "America/Bogota", deliveryPaymentPolicy: "block", negativeStockPolicy: "strict" });
		const [company] = await getDb(env).select({ currency: organization.currency, timezone: organization.timezone }).from(organization).where(eq(organization.id, orgAId));
		expect(company).toEqual({ currency: "COP", timezone: "America/Bogota" });
	});

	it("prevents a scoped administrator from changing Organization-wide setup", async () => {
		const response = await callApi("/api/product/settings", limitedAdmin, { currency: "USD", timezone: "UTC", deliveryPaymentPolicy: "warn", negativeStockPolicy: "warn_and_override" }, "PATCH");
		expect(response.status).toBe(403);
	});

	it("adds a simple named method and rejects an active duplicate", async () => {
		const created = await callApi("/api/payment-methods", ownerA, { name: "Nequi" });
		expect(created.status).toBe(201);
		const body = await created.json();
		expect(body).toEqual(expect.objectContaining({ name: "Nequi", isActive: true }));
		expect(body).not.toHaveProperty("kind");
		const duplicate = await callApi("/api/payment-methods", ownerA, { name: " nequi " });
		expect(duplicate.status).toBe(409);
	});

	it("rejects payment-method classifications outside the name-only contract", async () => {
		const response = await callApi("/api/payment-methods", ownerA, { name: "Daviplata", kind: "wallet" });
		expect(response.status).toBe(400);
	});

	it("keeps payment method lists tenant-isolated", async () => {
		const listA = await callApi("/api/payment-methods", ownerA);
		const listB = await callApi("/api/payment-methods", ownerB);
		const methodsA = (await listA.json() as { methods: Array<{ name: string }> }).methods.map((method) => method.name);
		const methodsB = (await listB.json() as { methods: Array<{ name: string }> }).methods.map((method) => method.name);
		expect(methodsA).toEqual(["Cash", "Nequi"]);
		expect(methodsB).toEqual(["Cash"]);
	});

	it("allows Cash deactivation only while another method remains active", async () => {
		const [cash] = await getDb(env).select({ id: paymentMethod.id }).from(paymentMethod).where(and(eq(paymentMethod.organizationId, orgAId), eq(paymentMethod.systemKey, "cash")));
		if (!cash) throw new Error("cash missing");
		const response = await callApi(`/api/payment-methods/${cash.id}`, ownerA, { isActive: false }, "PATCH");
		expect(response.status).toBe(200);
		const [stored] = await getDb(env).select({ isActive: paymentMethod.isActive }).from(paymentMethod).where(eq(paymentMethod.id, cash.id));
		expect(stored?.isActive).toBe(false);
	});

	it("returns the seeded operational catalogs", async () => {
		const categories = await callApi("/api/expense-categories", ownerA);
		const vehicles = await callApi("/api/vehicle-types", ownerA);
		expect((await categories.json() as { categories: unknown[] }).categories).toHaveLength(10);
		expect((await vehicles.json() as { vehicleTypes: unknown[] }).vehicleTypes).toHaveLength(4);
	});
});

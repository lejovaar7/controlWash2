import { and, eq } from "drizzle-orm";
import { AuthError } from "../auth/session";
import { getTenantDb } from "../db";
import { idempotencyRecord } from "../db/schema";
import { RequestError } from "../http";
import { requireTenant, type TenantContext } from "../tenant";
import { requireBranch, type BranchContext } from "../tenant/branch";
import { ensureProductDefaults } from "./setup";

export type ProductContext = { tenant: TenantContext; branch: BranchContext; currency: string };

export async function requireProductContext(env: Env, request: Request): Promise<ProductContext> {
	const tenant = await requireTenant(env, request);
	const branch = await requireBranch(env, request);
	await ensureProductDefaults(env, tenant);
	return { tenant, branch, currency: tenant.currency ?? "COP" };
}

export async function requireProductTenant(env: Env, request: Request) {
	const tenant = await requireTenant(env, request);
	await ensureProductDefaults(env, tenant);
	return tenant;
}

export function requireManager(tenant: TenantContext) {
	if (tenant.organizationRole !== "owner" && tenant.organizationRole !== "admin") throw new AuthError(403, "NOT_AUTHORIZED");
}

export function textValue(value: unknown, code = "INVALID_INPUT", maximum = 200, optional = false) {
	if (value === undefined || value === null) {
		if (optional) return null;
		throw new RequestError(400, code);
	}
	if (typeof value !== "string") throw new RequestError(400, code);
	const result = value.trim().replace(/\s+/g, " ");
	if ((!result && !optional) || result.length > maximum) throw new RequestError(400, code);
	return result || null;
}

export function integerValue(value: unknown, code = "INVALID_INPUT", minimum = 0, maximum = 2_147_483_647) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RequestError(400, code);
	return value;
}

export function booleanValue(value: unknown, code = "INVALID_INPUT") {
	if (typeof value !== "boolean") throw new RequestError(400, code);
	return value;
}

export function normalizeName(value: string) {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function normalizePlate(value: string | null) {
	return value ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") || null : null;
}

export function assertKeys(body: Record<string, unknown>, keys: readonly string[]) {
	if (Object.keys(body).some((key) => !keys.includes(key))) throw new RequestError(400, "INVALID_INPUT");
}

async function hashPayload(value: unknown) {
	const bytes = new TextEncoder().encode(JSON.stringify(value));
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(hash), (part) => part.toString(16).padStart(2, "0")).join("");
}

export type Idempotency = { key: string; hash: string; replay: unknown | null };

export async function readIdempotency(env: Env, request: Request, tenant: TenantContext, operation: string, body: unknown): Promise<Idempotency> {
	const key = request.headers.get("Idempotency-Key")?.trim();
	if (!key || key.length > 120) throw new RequestError(400, "IDEMPOTENCY_KEY_REQUIRED");
	const hash = await hashPayload(body);
	const [existing] = await getTenantDb(env, tenant.organizationId).select().from(idempotencyRecord).where(and(
		eq(idempotencyRecord.organizationId, tenant.organizationId),
		eq(idempotencyRecord.actorUserId, tenant.userId),
		eq(idempotencyRecord.operation, operation),
		eq(idempotencyRecord.key, key),
	)).limit(1);
	if (!existing) return { key, hash, replay: null };
	if (existing.requestHash !== hash) throw new RequestError(409, "IDEMPOTENCY_CONFLICT");
	return { key, hash, replay: JSON.parse(existing.responseJson) as unknown };
}

export function idempotencyValues(tenant: TenantContext, operation: string, idempotency: Idempotency, resourceId: string, response: unknown) {
	return {
		id: crypto.randomUUID(), organizationId: tenant.organizationId, actorUserId: tenant.userId,
		operation, key: idempotency.key, requestHash: idempotency.hash, resourceId,
		responseJson: JSON.stringify(response),
	};
}

export function auditValues(context: ProductContext, action: string, resourceType: string, resourceId: string, reason?: string | null, details?: unknown) {
	return {
		id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId,
		actorUserId: context.tenant.userId, action, resourceType, resourceId,
		reason: reason ?? null, detailsJson: details === undefined ? null : JSON.stringify(details),
	};
}

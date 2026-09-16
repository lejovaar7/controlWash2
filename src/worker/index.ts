import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getAuth } from "./auth";
import { enforceAuthHttpPolicy } from "./auth/http-policy";
import { AuthError, requireAuth, requirePlatformAdmin } from "./auth/session";
import { getDb } from "./db";
import { systemCheck } from "./db/schema";
import { provisionOrganizationWithOwner } from "./platform/provision";
import { hasCredentialAccount, resendAccountSetup } from "./auth/provisioning";
import { readJsonObject, RequestError, requireSameOriginJson } from "./http";
import { requireOrganizationAdmin, requireTenant } from "./tenant";
import { listAccessibleBranches } from "./tenant/branch";
import { listMembers, provisionMember, resendMemberSetup, updateMemberAccess, updateMemberStatus } from "./tenant/members";
import { listCompanies, selectCompany } from "./tenant/companies";
import { getLocalePreferences, readRequiredLocale, updateCompanyLocale, updateUserLocale } from "./localization";
import { createExpenseCategory, createPaymentMethod, createVehicleType, getProductSettings, listExpenseCategories, listPaymentMethods, listVehicleTypes, updateExpenseCategory, updatePaymentMethod, updateProductSettings, updateVehicleType } from "./product/setup";
import { createCommissionRule, createCustomer, createService, createVehicle, createWorker, getVehicle, listCustomers, listServices, listVehicles, listWorkers, replaceServicePrices, updateCommissionRule, updateCustomer, updateService, updateVehicle, updateWorker } from "./product/catalogs";
import { assignWorkers, cancelTicket, createTicket, getTicket, getVehicleTicketHistory, listTickets, transitionTicket, updateTicket } from "./product/tickets";
import { closeCashSession, createAdjustment, createExpense, createTransfer, getExpense, getFinancialBalances, listCashSessions, listExpenses, listFinancialMovements, listTransfers, openCashSession, recordTicketPayment, reverseExpense, reversePayment, reverseTransfer } from "./product/finance";
import { createItem, createPurchase, createSale, createStockMovement, createStockTransfer, getItem, getPurchase, getSale, listItems, listPurchases, listSales, listStock, listStockTransfers, reversePurchase, reverseSale, reverseStockTransfer, updateItem } from "./product/inventory";
import { exportReport, getCommissionReport, getDashboard, getFinanceReport, getInventoryReport, getSalesReport, getWashReport } from "./product/reporting";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", bodyLimit({ maxSize: 16_384, onError: (c) => c.json({ error: "REQUEST_TOO_LARGE" }, 413) }));
app.use("/api/*", async (c, next) => {
	if (!c.req.path.startsWith("/api/auth/")) requireSameOriginJson(c.env, c.req.raw);
	await next();
	c.header("Cache-Control", "no-store");
});

app.all("/api/auth/*", async (c) => {
	await enforceAuthHttpPolicy(c.env, c.req.raw);
	return getAuth(c.env, c.executionCtx, { fallbackLocale: c.req.header("X-App-Locale") }).handler(c.req.raw);
});

app.get("/api/health", async (c) => {
	try {
		const db = getDb(c.env);
		await db.select({ id: systemCheck.id }).from(systemCheck).limit(1);
		return c.json({ status: "ok", database: "ok" });
	} catch {
		console.error("Health check failed");
		return c.json({ status: "error", database: "unavailable" }, 503);
	}
});

/**
 * Branches the caller may use in their active organization. The list is derived
 * from the validated tenant, never from anything the browser sends.
 */
app.get("/api/branches", async (c) => {
	const tenant = await requireTenant(c.env, c.req.raw);
	const branches = await listAccessibleBranches(c.env, tenant);
	return c.json({
		organization: { id: tenant.organizationId, name: tenant.organizationName, role: tenant.organizationRole },
		permissions: { allBranches: tenant.allBranches, canAppointAdmins: tenant.canAppointAdmins },
		branches: branches.map((branch) => ({
			id: branch.branchId,
			name: branch.name,
		})),
	});
});

app.get("/api/companies", async (c) => c.json({ companies: await listCompanies(c.env, c.req.raw) }));
app.post("/api/companies/active", async (c) => c.json(await selectCompany(c.env, c.req.raw, await readJsonObject(c.req.raw))));

app.get("/api/account/locale", async (c) => c.json(await getLocalePreferences(c.env, c.req.raw)));
app.patch("/api/account/locale", async (c) => c.json(await updateUserLocale(c.env, c.req.raw, await readJsonObject(c.req.raw))));
app.patch("/api/company/locale", async (c) => c.json(await updateCompanyLocale(c.env, c.req.raw, await readJsonObject(c.req.raw))));

app.get("/api/product/settings", async (c) => c.json(await getProductSettings(c.env, c.req.raw)));
app.patch("/api/product/settings", async (c) => c.json(await updateProductSettings(c.env, c.req.raw, await readJsonObject(c.req.raw))));
app.get("/api/payment-methods", async (c) => c.json(await listPaymentMethods(c.env, c.req.raw)));
app.post("/api/payment-methods", async (c) => c.json(await createPaymentMethod(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/payment-methods/:id", async (c) => c.json(await updatePaymentMethod(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.get("/api/expense-categories", async (c) => c.json(await listExpenseCategories(c.env, c.req.raw)));
app.post("/api/expense-categories", async (c) => c.json(await createExpenseCategory(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/expense-categories/:id", async (c) => c.json(await updateExpenseCategory(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.get("/api/vehicle-types", async (c) => c.json(await listVehicleTypes(c.env, c.req.raw)));
app.post("/api/vehicle-types", async (c) => c.json(await createVehicleType(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/vehicle-types/:id", async (c) => c.json(await updateVehicleType(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));

app.get("/api/customers", async (c) => c.json(await listCustomers(c.env, c.req.raw)));
app.post("/api/customers", async (c) => c.json(await createCustomer(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/customers/:id", async (c) => c.json(await updateCustomer(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.get("/api/vehicles", async (c) => c.json(await listVehicles(c.env, c.req.raw)));
app.post("/api/vehicles", async (c) => c.json(await createVehicle(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/vehicles/:id", async (c) => c.json(await getVehicle(c.env, c.req.raw, c.req.param("id"))));
app.patch("/api/vehicles/:id", async (c) => c.json(await updateVehicle(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.get("/api/vehicles/:id/tickets", async (c) => c.json(await getVehicleTicketHistory(c.env, c.req.raw, c.req.param("id"))));

app.get("/api/services", async (c) => c.json(await listServices(c.env, c.req.raw)));
app.post("/api/services", async (c) => c.json(await createService(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/services/:id", async (c) => c.json(await updateService(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.put("/api/services/:id/prices", async (c) => c.json(await replaceServicePrices(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.get("/api/workers", async (c) => c.json(await listWorkers(c.env, c.req.raw)));
app.post("/api/workers", async (c) => c.json(await createWorker(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/workers/:id", async (c) => c.json(await updateWorker(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.post("/api/commission-rules", async (c) => c.json(await createCommissionRule(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.patch("/api/commission-rules/:id", async (c) => c.json(await updateCommissionRule(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));

app.get("/api/wash-tickets", async (c) => c.json(await listTickets(c.env, c.req.raw)));
app.post("/api/wash-tickets", async (c) => c.json(await createTicket(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/wash-tickets/:id", async (c) => c.json(await getTicket(c.env, c.req.raw, c.req.param("id"))));
app.patch("/api/wash-tickets/:id", async (c) => c.json(await updateTicket(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.post("/api/wash-tickets/:id/transitions", async (c) => c.json(await transitionTicket(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.put("/api/wash-tickets/:id/assignments", async (c) => c.json(await assignWorkers(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.post("/api/wash-tickets/:id/cancel", async (c) => c.json(await cancelTicket(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.post("/api/wash-tickets/:id/payments", async (c) => c.json(await recordTicketPayment(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));
app.post("/api/payments/:id/reverse", async (c) => c.json(await reversePayment(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));

app.get("/api/expenses", async (c) => c.json(await listExpenses(c.env, c.req.raw)));
app.post("/api/expenses", async (c) => c.json(await createExpense(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/expenses/:id", async (c) => c.json(await getExpense(c.env, c.req.raw, c.req.param("id"))));
app.post("/api/expenses/:id/reverse", async (c) => c.json(await reverseExpense(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));
app.post("/api/financial-adjustments", async (c) => c.json(await createAdjustment(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.post("/api/financial-transfers", async (c) => c.json(await createTransfer(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/financial-transfers", async (c) => c.json(await listTransfers(c.env, c.req.raw)));
app.post("/api/financial-transfers/:id/reverse", async (c) => c.json(await reverseTransfer(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));
app.get("/api/financial-movements", async (c) => c.json(await listFinancialMovements(c.env, c.req.raw)));
app.get("/api/financial-balances", async (c) => c.json(await getFinancialBalances(c.env, c.req.raw)));
app.get("/api/cash-sessions", async (c) => c.json(await listCashSessions(c.env, c.req.raw)));
app.post("/api/cash-sessions", async (c) => c.json(await openCashSession(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.post("/api/cash-sessions/:id/close", async (c) => c.json(await closeCashSession(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));

app.get("/api/inventory/items", async (c) => c.json(await listItems(c.env, c.req.raw)));
app.post("/api/inventory/items", async (c) => c.json(await createItem(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/inventory/stock", async (c) => c.json(await listStock(c.env, c.req.raw)));
app.get("/api/inventory/items/:id", async (c) => c.json(await getItem(c.env, c.req.raw, c.req.param("id"))));
app.patch("/api/inventory/items/:id", async (c) => c.json(await updateItem(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw))));
app.post("/api/inventory/opening-stock", async (c) => c.json(await createStockMovement(c.env, c.req.raw, await readJsonObject(c.req.raw), "opening"), 201));
app.post("/api/inventory/usage", async (c) => c.json(await createStockMovement(c.env, c.req.raw, await readJsonObject(c.req.raw), "usage"), 201));
app.post("/api/inventory/adjustments", async (c) => c.json(await createStockMovement(c.env, c.req.raw, await readJsonObject(c.req.raw), "adjustment"), 201));
app.get("/api/purchases", async (c) => c.json(await listPurchases(c.env, c.req.raw)));
app.post("/api/purchases", async (c) => c.json(await createPurchase(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/purchases/:id", async (c) => c.json(await getPurchase(c.env, c.req.raw, c.req.param("id"))));
app.post("/api/purchases/:id/reverse", async (c) => c.json(await reversePurchase(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));
app.get("/api/retail-sales", async (c) => c.json(await listSales(c.env, c.req.raw)));
app.post("/api/retail-sales", async (c) => c.json(await createSale(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/retail-sales/:id", async (c) => c.json(await getSale(c.env, c.req.raw, c.req.param("id"))));
app.post("/api/retail-sales/:id/reverse", async (c) => c.json(await reverseSale(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));
app.post("/api/stock-transfers", async (c) => c.json(await createStockTransfer(c.env, c.req.raw, await readJsonObject(c.req.raw)), 201));
app.get("/api/stock-transfers", async (c) => c.json(await listStockTransfers(c.env, c.req.raw)));
app.post("/api/stock-transfers/:id/reverse", async (c) => c.json(await reverseStockTransfer(c.env, c.req.raw, c.req.param("id"), await readJsonObject(c.req.raw)), 201));

app.get("/api/reports/dashboard", async (c) => c.json(await getDashboard(c.env, c.req.raw)));
app.get("/api/reports/washes", async (c) => c.json(await getWashReport(c.env, c.req.raw)));
app.get("/api/reports/finance", async (c) => c.json(await getFinanceReport(c.env, c.req.raw)));
app.get("/api/reports/inventory", async (c) => c.json(await getInventoryReport(c.env, c.req.raw)));
app.get("/api/reports/retail-sales", async (c) => c.json(await getSalesReport(c.env, c.req.raw)));
app.get("/api/reports/commissions", async (c) => c.json(await getCommissionReport(c.env, c.req.raw)));
app.get("/api/reports/:report/export", async (c) => c.body(await exportReport(c.env, c.req.raw, c.req.param("report")), 200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="controlwash-${c.req.param("report")}.csv"` }));

/** Tenant-scoped administration; never exposes platform roles. */
app.get("/api/members", async (c) => {
	const tenant = await requireOrganizationAdmin(c.env, c.req.raw);
	return c.json({ organizationId: tenant.organizationId, members: await listMembers(c.env, tenant) });
});

app.post("/api/members", async (c) => {
	const tenant = await requireOrganizationAdmin(c.env, c.req.raw);
	return c.json(await provisionMember(c.env, c.req.raw, tenant, await readJsonObject(c.req.raw)));
});

app.post("/api/members/:membershipId/setup/resend", async (c) => {
	const tenant = await requireOrganizationAdmin(c.env, c.req.raw);
	return c.json(await resendMemberSetup(c.env, tenant, c.req.param("membershipId")));
});

app.patch("/api/members/:membershipId", async (c) => {
	const tenant = await requireOrganizationAdmin(c.env, c.req.raw);
	return c.json(await updateMemberAccess(c.env, c.req.raw, tenant, c.req.param("membershipId"), await readJsonObject(c.req.raw)));
});

app.patch("/api/members/:membershipId/status", async (c) => {
	const tenant = await requireOrganizationAdmin(c.env, c.req.raw);
	return c.json(await updateMemberStatus(c.env, tenant, c.req.param("membershipId"), await readJsonObject(c.req.raw)));
});

/** Platform administration. Organization roles never grant access here. */
app.post("/api/platform/organizations", async (c) => {
	await requirePlatformAdmin(c.env, c.req.raw);

	const body = await readJsonObject(c.req.raw);

	const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
	const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
	const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
	const locale = readRequiredLocale(body.locale);

	if (!companyName || companyName.length > 200 || !ownerName || ownerName.length > 200 || ownerEmail.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
		return c.json({ error: "INVALID_INPUT" }, 400);
	}

	const result = await provisionOrganizationWithOwner(c.env, {
		companyName,
		ownerName,
		ownerEmail,
		locale,
	});

	// Never echo anything derived from the provisional credential.
	return c.json({
		organizationId: result.organizationId,
		organizationName: result.organizationName,
		branchName: result.branchName,
		ownerEmail,
		setupEmailSent: result.setupEmailSent,
		setupEmailStatus: result.setupEmailStatus,
	});
});

app.post("/api/platform/account-setup/resend", async (c) => {
	await requirePlatformAdmin(c.env, c.req.raw);
	const body = await readJsonObject(c.req.raw);
	const email = typeof body.email === "string" ? body.email.trim() : "";
	if (!email) return c.json({ error: "INVALID_INPUT" }, 400);

	if (body.organizationId !== undefined && (typeof body.organizationId !== "string" || !body.organizationId.trim())) return c.json({ error: "INVALID_INPUT" }, 400);
	const sent = await resendAccountSetup(c.env, email, body.organizationId as string | undefined);
	return c.json({ sent });
});

/**
 * First-time credential setup for a provisioned account.
 *
 * Operates only on the authenticated user — no userId is accepted from the
 * browser. Refuses once a credential already exists, so it can never become a
 * way to replace a password without proving the current one.
 */
app.post("/api/account/setup-password", async (c) => {
	const session = await requireAuth(c.env, c.req.raw);
	if (!session.user.emailVerified) throw new AuthError(403, "EMAIL_NOT_VERIFIED");

	if (await hasCredentialAccount(c.env, session.user.id)) {
		return c.json({ error: "PASSWORD_ALREADY_SET" }, 409);
	}

	const body = await readJsonObject(c.req.raw);
	const newPassword =
		typeof body.newPassword === "string" ? body.newPassword : "";
	if (newPassword.length < 8 || newPassword.length > 128) return c.json({ error: "INVALID_INPUT" }, 400);

	await getAuth(c.env).api.setPassword({
		body: { newPassword },
		headers: c.req.raw.headers,
	});

	return c.json({ ok: true });
});

// Only /api/* reaches the Worker (see run_worker_first in wrangler.json),
// so anything unmatched here is an unknown API route.
app.notFound((c) => c.json({ error: "Not Found" }, 404));

// Guards throw AuthError; everything else stays generic so tenant boundaries
// are never revealed through an error body.
app.onError((error, c) => {
	if (error instanceof AuthError || error instanceof RequestError) {
		return c.json({ error: error.code }, error.status);
	}
	console.error("Unhandled request error", { name: error.name });
	return c.json({ error: "Internal Server Error" }, 500);
});

export default app;

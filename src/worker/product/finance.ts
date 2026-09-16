import { and, asc, desc, eq, gte, sum } from "drizzle-orm";
import { AuthError } from "../auth/session";
import { getTenantDb } from "../db";
import { auditEvent, cashSession, expense, expenseCategory, financialMovement, idempotencyRecord, payment, paymentMethod, washTicket } from "../db/schema";
import { RequestError } from "../http";
import { assertKeys, auditValues, idempotencyValues, integerValue, readIdempotency, requireManager, requireProductContext, textValue } from "./domain";

async function activeMethod(env: Env, organizationId: string, id: string) {
	return (await getTenantDb(env, organizationId).select().from(paymentMethod).where(and(eq(paymentMethod.id, id), eq(paymentMethod.organizationId, organizationId), eq(paymentMethod.isActive, true))).limit(1))[0] ?? null;
}

async function ticketBalance(env: Env, organizationId: string, ticketId: string) {
	const [row] = await getTenantDb(env, organizationId).select({ total: sum(payment.amountMinor) }).from(payment).where(and(eq(payment.organizationId, organizationId), eq(payment.ticketId, ticketId)));
	return Number(row?.total ?? 0);
}

export async function recordTicketPayment(env: Env, request: Request, ticketId: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["paymentMethodId", "amountMinor"]);
	const idempotency = await readIdempotency(env, request, context.tenant, `payment.ticket.${ticketId}`, body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const [ticket] = await db.select().from(washTicket).where(and(eq(washTicket.id, ticketId), eq(washTicket.organizationId, context.tenant.organizationId), eq(washTicket.branchId, context.branch.branchId))).limit(1);
	if (!ticket) throw new AuthError(404, "RESOURCE_NOT_FOUND"); if (ticket.status === "cancelled") throw new RequestError(409, "TICKET_CANCELLED");
	const paymentMethodId = textValue(body.paymentMethodId)!; const method = await activeMethod(env, context.tenant.organizationId, paymentMethodId); if (!method) throw new RequestError(400, "INVALID_PAYMENT_METHOD");
	const paidBefore = await ticketBalance(env, context.tenant.organizationId, ticketId); if (paidBefore !== 0) throw new RequestError(409, "TICKET_PAYMENT_ALREADY_RECORDED"); const amountMinor = integerValue(body.amountMinor, "INVALID_AMOUNT", 1); if (amountMinor !== ticket.totalMinor) throw new RequestError(400, "FULL_PAYMENT_REQUIRED");
	const id = crypto.randomUUID(); const movementId = crypto.randomUUID(); const paymentStatus = "paid";
	const response = { id, ticketId, paymentMethodId, paymentMethodName: method.name, amountMinor, currency: context.currency, status: "posted", paymentStatus, remainingMinor: 0 };
	await db.batch([
		db.insert(payment).values({ id, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, ticketId, paymentMethodId, amountMinor, currency: context.currency, createdByUserId: context.tenant.userId }),
		db.insert(financialMovement).values({ id: movementId, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId, kind: "ticket_income", amountMinor, currency: context.currency, description: `Wash #${ticket.number}`, sourceType: "payment", sourceId: id, createdByUserId: context.tenant.userId }),
		db.update(washTicket).set({ paymentStatus, updatedAt: new Date() }).where(eq(washTicket.id, ticketId)),
		db.insert(auditEvent).values(auditValues(context, "payment.posted", "payment", id, null, { ticketId, amountMinor })),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, `payment.ticket.${ticketId}`, idempotency, id, response)),
	]); return response;
}

export async function reversePayment(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["reason"]); const reason = textValue(body.reason, "REASON_REQUIRED", 300)!;
	const idempotency = await readIdempotency(env, request, context.tenant, `payment.reverse.${id}`, body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const [original] = await db.select().from(payment).where(and(eq(payment.id, id), eq(payment.organizationId, context.tenant.organizationId), eq(payment.branchId, context.branch.branchId))).limit(1);
	if (!original || original.amountMinor <= 0) throw new AuthError(404, "RESOURCE_NOT_FOUND"); const [existing] = await db.select({ id: payment.id }).from(payment).where(eq(payment.reversalOfId, id)).limit(1); if (existing) throw new RequestError(409, "ALREADY_REVERSED");
	const reversalId = crypto.randomUUID(); const response = { id: reversalId, reversalOfId: id, amountMinor: -original.amountMinor, status: "reversed" };
	let paymentStatus = "unpaid"; if (original.ticketId) { const total = await ticketBalance(env, context.tenant.organizationId, original.ticketId) - original.amountMinor; const [ticket] = await db.select({ totalMinor: washTicket.totalMinor }).from(washTicket).where(eq(washTicket.id, original.ticketId)).limit(1); paymentStatus = total <= 0 ? "refunded" : total < (ticket?.totalMinor ?? 0) ? "partial" : "paid"; }
	const commands = [
		db.insert(payment).values({ id: reversalId, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, ticketId: original.ticketId, saleId: original.saleId, paymentMethodId: original.paymentMethodId, amountMinor: -original.amountMinor, currency: original.currency, status: "reversed", reversalOfId: id, reason, createdByUserId: context.tenant.userId }),
		db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId: original.paymentMethodId, kind: "payment_reversal", amountMinor: -original.amountMinor, currency: original.currency, description: "Payment reversal", sourceType: "payment", sourceId: reversalId, reversalOfId: id, createdByUserId: context.tenant.userId }),
		db.insert(auditEvent).values(auditValues(context, "payment.reversed", "payment", id, reason)),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, `payment.reverse.${id}`, idempotency, reversalId, response)),
	];
	if (original.ticketId) {
		await db.batch([db.update(washTicket).set({ paymentStatus, updatedAt: new Date() }).where(eq(washTicket.id, original.ticketId)), ...commands]);
	} else {
		await db.batch([commands[0]!, ...commands.slice(1)]);
	}
	return response;
}

export async function listExpenses(env: Env, request: Request) {
	const context = await requireProductContext(env, request); const db = getTenantDb(env, context.tenant.organizationId);
	const rows = await db.select({ expense, categoryName: expenseCategory.name, paymentMethodName: paymentMethod.name }).from(expense).innerJoin(expenseCategory, eq(expenseCategory.id, expense.categoryId)).innerJoin(paymentMethod, eq(paymentMethod.id, expense.paymentMethodId)).where(and(eq(expense.organizationId, context.tenant.organizationId), eq(expense.branchId, context.branch.branchId))).orderBy(desc(expense.createdAt)).limit(200);
	return { expenses: rows.map((row) => ({ ...row.expense, categoryName: row.categoryName, paymentMethodName: row.paymentMethodName })) };
}

export async function getExpense(env: Env, request: Request, id: string) { const context = await requireProductContext(env, request); const [row] = await getTenantDb(env, context.tenant.organizationId).select().from(expense).where(and(eq(expense.id, id), eq(expense.organizationId, context.tenant.organizationId), eq(expense.branchId, context.branch.branchId))).limit(1); if (!row) throw new AuthError(404, "RESOURCE_NOT_FOUND"); return row; }

export async function createExpense(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["categoryId", "paymentMethodId", "description", "amountMinor"]);
	const idempotency = await readIdempotency(env, request, context.tenant, "expense.create", body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const categoryId = textValue(body.categoryId)!; const paymentMethodId = textValue(body.paymentMethodId)!;
	const [[category], method] = await Promise.all([db.select().from(expenseCategory).where(and(eq(expenseCategory.id, categoryId), eq(expenseCategory.organizationId, context.tenant.organizationId), eq(expenseCategory.isActive, true))).limit(1), activeMethod(env, context.tenant.organizationId, paymentMethodId)]);
	if (!category || !method) throw new RequestError(400, "INVALID_REFERENCE"); const id = crypto.randomUUID(); const amountMinor = integerValue(body.amountMinor, "INVALID_AMOUNT", 1); const description = textValue(body.description)!;
	const response = { id, categoryId, categoryName: category.name, paymentMethodId, paymentMethodName: method.name, description, amountMinor, currency: context.currency, status: "posted" };
	await db.batch([
		db.insert(expense).values({ id, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, categoryId, paymentMethodId, description, amountMinor, currency: context.currency, createdByUserId: context.tenant.userId }),
		db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId, kind: "expense", amountMinor: -amountMinor, currency: context.currency, description, sourceType: "expense", sourceId: id, createdByUserId: context.tenant.userId }),
		db.insert(auditEvent).values(auditValues(context, "expense.posted", "expense", id, null, { amountMinor })),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, "expense.create", idempotency, id, response)),
	]); return response;
}

export async function reverseExpense(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["reason"]); const reason = textValue(body.reason, "REASON_REQUIRED", 300)!;
	const idempotency = await readIdempotency(env, request, context.tenant, `expense.reverse.${id}`, body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const [original] = await db.select().from(expense).where(and(eq(expense.id, id), eq(expense.organizationId, context.tenant.organizationId), eq(expense.branchId, context.branch.branchId))).limit(1);
	if (!original || original.amountMinor <= 0) throw new AuthError(404, "RESOURCE_NOT_FOUND"); const [existing] = await db.select({ id: expense.id }).from(expense).where(eq(expense.reversalOfId, id)).limit(1); if (existing) throw new RequestError(409, "ALREADY_REVERSED");
	const reversalId = crypto.randomUUID(); const response = { id: reversalId, reversalOfId: id, amountMinor: -original.amountMinor, status: "reversed" };
	await db.batch([
		db.insert(expense).values({ id: reversalId, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, categoryId: original.categoryId, paymentMethodId: original.paymentMethodId, description: original.description, amountMinor: -original.amountMinor, currency: original.currency, status: "reversed", reversalOfId: id, reason, createdByUserId: context.tenant.userId }),
		db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId: original.paymentMethodId, kind: "expense_reversal", amountMinor: original.amountMinor, currency: original.currency, description: `Reversal: ${original.description}`, sourceType: "expense", sourceId: reversalId, reversalOfId: id, createdByUserId: context.tenant.userId }),
		db.insert(auditEvent).values(auditValues(context, "expense.reversed", "expense", id, reason)),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, `expense.reverse.${id}`, idempotency, reversalId, response)),
	]); return response;
}

export async function createAdjustment(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["paymentMethodId", "amountMinor", "description", "reason"]);
	const idempotency = await readIdempotency(env, request, context.tenant, "financial.adjustment", body); if (idempotency.replay) return idempotency.replay;
	const paymentMethodId = textValue(body.paymentMethodId)!; const method = await activeMethod(env, context.tenant.organizationId, paymentMethodId); if (!method) throw new RequestError(400, "INVALID_PAYMENT_METHOD");
	const amountMinor = integerValue(Math.abs(Number(body.amountMinor)), "INVALID_AMOUNT", 1) * (Number(body.amountMinor) < 0 ? -1 : 1); const description = textValue(body.description)!; const reason = textValue(body.reason, "REASON_REQUIRED", 300)!; const id = crypto.randomUUID();
	const response = { id, paymentMethodId, paymentMethodName: method.name, amountMinor, description, currency: context.currency };
	const db = getTenantDb(env, context.tenant.organizationId); await db.batch([db.insert(financialMovement).values({ id, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId, kind: "adjustment", amountMinor, currency: context.currency, description, sourceType: "adjustment", sourceId: id, createdByUserId: context.tenant.userId }), db.insert(auditEvent).values(auditValues(context, "financial.adjusted", "financial_movement", id, reason, { amountMinor })), db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, "financial.adjustment", idempotency, id, response))]); return response;
}

export async function createTransfer(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["fromPaymentMethodId", "toPaymentMethodId", "amountMinor", "reason"]);
	const idempotency = await readIdempotency(env, request, context.tenant, "financial.transfer", body); if (idempotency.replay) return idempotency.replay;
	const fromPaymentMethodId = textValue(body.fromPaymentMethodId)!; const toPaymentMethodId = textValue(body.toPaymentMethodId)!; if (fromPaymentMethodId === toPaymentMethodId) throw new RequestError(400, "INVALID_TRANSFER");
	const [from, to] = await Promise.all([activeMethod(env, context.tenant.organizationId, fromPaymentMethodId), activeMethod(env, context.tenant.organizationId, toPaymentMethodId)]); if (!from || !to) throw new RequestError(400, "INVALID_PAYMENT_METHOD");
	const amountMinor = integerValue(body.amountMinor, "INVALID_AMOUNT", 1); const reason = textValue(body.reason, "REASON_REQUIRED", 300)!; const id = crypto.randomUUID(); const response = { id, fromPaymentMethodId, fromName: from.name, toPaymentMethodId, toName: to.name, amountMinor, currency: context.currency };
	const db = getTenantDb(env, context.tenant.organizationId); await db.batch([
		db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId: fromPaymentMethodId, kind: "transfer_out", amountMinor: -amountMinor, currency: context.currency, description: `Transfer to ${to.name}`, sourceType: "transfer", sourceId: id, createdByUserId: context.tenant.userId }),
		db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId: toPaymentMethodId, kind: "transfer_in", amountMinor, currency: context.currency, description: `Transfer from ${from.name}`, sourceType: "transfer", sourceId: id, createdByUserId: context.tenant.userId }),
		db.insert(auditEvent).values(auditValues(context, "financial.transferred", "financial_transfer", id, reason, { amountMinor, fromPaymentMethodId, toPaymentMethodId })),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, "financial.transfer", idempotency, id, response)),
	]); return response;
}

export async function reverseTransfer(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); requireManager(context.tenant); assertKeys(body, ["reason"]); const reason = textValue(body.reason, "REASON_REQUIRED", 300)!;
	const idempotency = await readIdempotency(env, request, context.tenant, `financial.transfer.reverse.${id}`, body); if (idempotency.replay) return idempotency.replay;
	const db = getTenantDb(env, context.tenant.organizationId); const original = await db.select().from(financialMovement).where(and(eq(financialMovement.organizationId, context.tenant.organizationId), eq(financialMovement.branchId, context.branch.branchId), eq(financialMovement.sourceType, "transfer"), eq(financialMovement.sourceId, id))).orderBy(asc(financialMovement.createdAt));
	if (original.length !== 2 || original.some((row) => !["transfer_in", "transfer_out"].includes(row.kind))) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const [already] = await db.select({ id: financialMovement.id }).from(financialMovement).where(and(eq(financialMovement.sourceType, "transfer_reversal"), eq(financialMovement.reversalOfId, id))).limit(1); if (already) throw new RequestError(409, "ALREADY_REVERSED");
	const reversalId = crypto.randomUUID(); const response = { id: reversalId, reversalOfId: id, status: "reversed" };
	const reversalMovement = (row: typeof original[number]) => db.insert(financialMovement).values({ id: crypto.randomUUID(), organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId: row.paymentMethodId, kind: row.kind === "transfer_in" ? "transfer_reversal_out" : "transfer_reversal_in", amountMinor: -row.amountMinor, currency: row.currency, description: `Reversal: ${row.description}`, sourceType: "transfer_reversal", sourceId: reversalId, reversalOfId: id, createdByUserId: context.tenant.userId });
	await db.batch([
		reversalMovement(original[0]!), reversalMovement(original[1]!),
		db.insert(auditEvent).values(auditValues(context, "financial.transfer_reversed", "financial_transfer", id, reason)),
		db.insert(idempotencyRecord).values(idempotencyValues(context.tenant, `financial.transfer.reverse.${id}`, idempotency, reversalId, response)),
	]); return response;
}

export async function listTransfers(env: Env, request: Request) { const context = await requireProductContext(env, request); const rows = await getTenantDb(env, context.tenant.organizationId).select().from(financialMovement).where(and(eq(financialMovement.organizationId, context.tenant.organizationId), eq(financialMovement.branchId, context.branch.branchId), eq(financialMovement.sourceType, "transfer"))).orderBy(desc(financialMovement.createdAt)); const ids = [...new Set(rows.map((row) => row.sourceId))]; return { transfers: ids.map((id) => ({ id, movements: rows.filter((row) => row.sourceId === id) })) }; }

export async function listFinancialMovements(env: Env, request: Request) {
	const context = await requireProductContext(env, request); const db = getTenantDb(env, context.tenant.organizationId);
	const rows = await db.select({ movement: financialMovement, paymentMethodName: paymentMethod.name }).from(financialMovement).innerJoin(paymentMethod, eq(paymentMethod.id, financialMovement.paymentMethodId)).where(and(eq(financialMovement.organizationId, context.tenant.organizationId), eq(financialMovement.branchId, context.branch.branchId))).orderBy(desc(financialMovement.createdAt)).limit(300);
	return { movements: rows.map((row) => ({ ...row.movement, paymentMethodName: row.paymentMethodName })) };
}

export async function getFinancialBalances(env: Env, request: Request) {
	const context = await requireProductContext(env, request); const db = getTenantDb(env, context.tenant.organizationId);
	const methods = await db.select().from(paymentMethod).where(eq(paymentMethod.organizationId, context.tenant.organizationId)).orderBy(asc(paymentMethod.displayOrder));
	const totals = await db.select({ paymentMethodId: financialMovement.paymentMethodId, balanceMinor: sum(financialMovement.amountMinor) }).from(financialMovement).where(and(eq(financialMovement.organizationId, context.tenant.organizationId), eq(financialMovement.branchId, context.branch.branchId))).groupBy(financialMovement.paymentMethodId);
	return { currency: context.currency, balances: methods.map((method) => ({ ...method, balanceMinor: Number(totals.find((row) => row.paymentMethodId === method.id)?.balanceMinor ?? 0) })) };
}

export async function listCashSessions(env: Env, request: Request) {
	const context = await requireProductContext(env, request); return { sessions: await getTenantDb(env, context.tenant.organizationId).select().from(cashSession).where(and(eq(cashSession.organizationId, context.tenant.organizationId), eq(cashSession.branchId, context.branch.branchId))).orderBy(desc(cashSession.openedAt)).limit(100) };
}

export async function openCashSession(env: Env, request: Request, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["paymentMethodId", "openingBalanceMinor"]); const paymentMethodId = textValue(body.paymentMethodId)!; const method = await activeMethod(env, context.tenant.organizationId, paymentMethodId); if (!method) throw new RequestError(400, "INVALID_PAYMENT_METHOD");
	if (method.systemKey !== "cash") throw new RequestError(400, "CASH_METHOD_REQUIRED");
	const openingBalanceMinor = integerValue(body.openingBalanceMinor, "INVALID_AMOUNT"); const id = crypto.randomUUID(); const db = getTenantDb(env, context.tenant.organizationId);
	await db.batch([db.insert(cashSession).values({ id, organizationId: context.tenant.organizationId, branchId: context.branch.branchId, paymentMethodId, openingBalanceMinor, openedByUserId: context.tenant.userId }), db.insert(auditEvent).values(auditValues(context, "cash_session.opened", "cash_session", id, null, { openingBalanceMinor }))]);
	return { id, paymentMethodId, openingBalanceMinor, status: "open" };
}

export async function closeCashSession(env: Env, request: Request, id: string, body: Record<string, unknown>) {
	const context = await requireProductContext(env, request); assertKeys(body, ["countedClosingMinor"]); const countedClosingMinor = integerValue(body.countedClosingMinor, "INVALID_AMOUNT"); const db = getTenantDb(env, context.tenant.organizationId);
	const [session] = await db.select().from(cashSession).where(and(eq(cashSession.id, id), eq(cashSession.organizationId, context.tenant.organizationId), eq(cashSession.branchId, context.branch.branchId), eq(cashSession.status, "open"))).limit(1); if (!session) throw new AuthError(404, "RESOURCE_NOT_FOUND");
	const [total] = await db.select({ value: sum(financialMovement.amountMinor) }).from(financialMovement).where(and(eq(financialMovement.organizationId, context.tenant.organizationId), eq(financialMovement.branchId, context.branch.branchId), eq(financialMovement.paymentMethodId, session.paymentMethodId), gte(financialMovement.createdAt, session.openedAt)));
	const expectedClosingMinor = session.openingBalanceMinor + Number(total?.value ?? 0); await db.batch([db.update(cashSession).set({ expectedClosingMinor, countedClosingMinor, status: "closed", closedByUserId: context.tenant.userId, closedAt: new Date() }).where(eq(cashSession.id, id)), db.insert(auditEvent).values(auditValues(context, "cash_session.closed", "cash_session", id, null, { expectedClosingMinor, countedClosingMinor }))]);
	return { ...session, expectedClosingMinor, countedClosingMinor, differenceMinor: countedClosingMinor - expectedClosingMinor, status: "closed" };
}

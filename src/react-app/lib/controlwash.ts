export type VehicleType = { id: string; name: string; systemKey: string | null; isActive: boolean };
export type PaymentMethod = { id: string; name: string; systemKey: string | null; isActive: boolean; balanceMinor?: number };
export type ServicePrice = { id: string; vehicleTypeId: string; branchId: string | null; amountMinor: number };
export type Service = { id: string; name: string; kind: "service" | "package" | "addon"; description: string | null; durationMinutes: number | null; isActive: boolean; prices: ServicePrice[] };
export type Worker = { id: string; name: string; phone: string | null; branchId: string | null; isActive: boolean };
export type CommissionRule = { id: string; workerId: string | null; serviceId: string | null; branchId: string | null; percentageBasisPoints: number; isActive: boolean };
export type Ticket = { id: string; number: number; vehicleDisplay: string; status: "waiting" | "in_progress" | "ready" | "delivered" | "cancelled"; paymentStatus: "unpaid" | "partial" | "paid" | "refunded"; totalMinor: number; currency: string; version: number; createdAt: string };
export type Customer = { id: string; displayName: string; phone: string | null; email: string | null; notes: string | null; isActive: boolean };
export type Vehicle = { id: string; customerId: string | null; customerName: string | null; vehicleTypeId: string; vehicleTypeName: string; plate: string | null; make: string | null; model: string | null; color: string | null; isActive: boolean };
export type InventoryItem = { id: string; name: string; type: "supply" | "retail" | "both"; unit: string; costMinor: number; priceMinor: number | null; lowStockMilli: number; quantityMilli: number; isActive: boolean };
export type FinancialMovement = { id: string; kind: string; amountMinor: number; description: string; paymentMethodId: string; paymentMethodName: string; createdAt: string };

async function requestJson<T>(path: string, organizationId: string, init?: RequestInit, idempotent = false): Promise<T> {
	const headers = new Headers(init?.headers); headers.set("Accept", "application/json"); headers.set("X-Company-Context", organizationId); if (init?.body) headers.set("Content-Type", "application/json"); if (idempotent) headers.set("Idempotency-Key", crypto.randomUUID());
	const response = await fetch(path, { ...init, headers, credentials: "include" }); if (!response.ok) { const value = await response.json().catch(() => ({ error: "REQUEST_FAILED" })) as { error?: string }; throw new Error(value.error ?? "REQUEST_FAILED"); } return await response.json() as T;
}

const post = <T>(path: string, organizationId: string, body: unknown, idempotent = false) => requestJson<T>(path, organizationId, { method: "POST", body: JSON.stringify(body) }, idempotent);
const patch = <T>(path: string, organizationId: string, body: unknown) => requestJson<T>(path, organizationId, { method: "PATCH", body: JSON.stringify(body) });
const put = <T>(path: string, organizationId: string, body: unknown) => requestJson<T>(path, organizationId, { method: "PUT", body: JSON.stringify(body) });

export const washApi = {
	vehicleTypes: (organizationId: string) => requestJson<{ vehicleTypes: VehicleType[] }>("/api/vehicle-types", organizationId),
	paymentMethods: (organizationId: string) => requestJson<{ methods: PaymentMethod[] }>("/api/payment-methods", organizationId),
	expenseCategories: (organizationId: string) => requestJson<{ categories: { id: string; name: string; isActive: boolean }[] }>("/api/expense-categories", organizationId),
	services: (organizationId: string) => requestJson<{ services: Service[]; canEdit: boolean }>("/api/services", organizationId),
	createService: (organizationId: string, body: unknown) => post<Service>("/api/services", organizationId, body),
	updateService: (organizationId: string, id: string, body: unknown) => patch<Service>(`/api/services/${id}`, organizationId, body),
	replacePrices: (organizationId: string, id: string, body: unknown) => put<{ prices: ServicePrice[] }>(`/api/services/${id}/prices`, organizationId, body),
	workers: (organizationId: string) => requestJson<{ workers: Worker[]; rules: CommissionRule[]; canEdit: boolean }>("/api/workers", organizationId),
	createWorker: (organizationId: string, body: unknown) => post<Worker>("/api/workers", organizationId, body),
	updateWorker: (organizationId: string, id: string, body: unknown) => patch<Worker>(`/api/workers/${id}`, organizationId, body),
	createCommissionRule: (organizationId: string, body: unknown) => post<CommissionRule>("/api/commission-rules", organizationId, body),
	tickets: (organizationId: string) => requestJson<{ tickets: Ticket[]; currency: string }>("/api/wash-tickets", organizationId),
	ticket: (organizationId: string, id: string) => requestJson<{ ticket: Ticket; lines: unknown[]; assignments: unknown[]; payments: unknown[] }>(`/api/wash-tickets/${id}`, organizationId),
	createTicket: (organizationId: string, body: unknown) => post<Ticket>("/api/wash-tickets", organizationId, body, true),
	transitionTicket: (organizationId: string, id: string, body: unknown) => post<Ticket>(`/api/wash-tickets/${id}/transitions`, organizationId, body, true),
	recordPayment: (organizationId: string, id: string, body: unknown) => post<unknown>(`/api/wash-tickets/${id}/payments`, organizationId, body, true),
	cancelTicket: (organizationId: string, id: string, body: unknown) => post<Ticket>(`/api/wash-tickets/${id}/cancel`, organizationId, body),
	customers: (organizationId: string, query = "") => requestJson<{ customers: Customer[] }>(`/api/customers?q=${encodeURIComponent(query)}`, organizationId),
	createCustomer: (organizationId: string, body: unknown) => post<Customer>("/api/customers", organizationId, body),
	vehicles: (organizationId: string, query = "") => requestJson<{ vehicles: Vehicle[] }>(`/api/vehicles?q=${encodeURIComponent(query)}`, organizationId),
	createVehicle: (organizationId: string, body: unknown) => post<Vehicle>("/api/vehicles", organizationId, body),
	balances: (organizationId: string) => requestJson<{ currency: string; balances: PaymentMethod[] }>("/api/financial-balances", organizationId),
	movements: (organizationId: string) => requestJson<{ movements: FinancialMovement[] }>("/api/financial-movements", organizationId),
	expenses: (organizationId: string) => requestJson<{ expenses: unknown[] }>("/api/expenses", organizationId),
	createExpense: (organizationId: string, body: unknown) => post<unknown>("/api/expenses", organizationId, body, true),
	createAdjustment: (organizationId: string, body: unknown) => post<unknown>("/api/financial-adjustments", organizationId, body, true),
	createTransfer: (organizationId: string, body: unknown) => post<unknown>("/api/financial-transfers", organizationId, body, true),
	items: (organizationId: string) => requestJson<{ items: InventoryItem[]; currency: string }>("/api/inventory/items", organizationId),
	createItem: (organizationId: string, body: unknown) => post<InventoryItem>("/api/inventory/items", organizationId, body),
	stockMovement: (organizationId: string, kind: "opening-stock" | "usage" | "adjustments", body: unknown) => post<unknown>(`/api/inventory/${kind}`, organizationId, body, true),
	purchases: (organizationId: string) => requestJson<{ purchases: unknown[] }>("/api/purchases", organizationId),
	createPurchase: (organizationId: string, body: unknown) => post<unknown>("/api/purchases", organizationId, body, true),
	sales: (organizationId: string) => requestJson<{ sales: unknown[] }>("/api/retail-sales", organizationId),
	createSale: (organizationId: string, body: unknown) => post<unknown>("/api/retail-sales", organizationId, body, true),
	dashboard: (organizationId: string) => requestJson<Dashboard>("/api/reports/dashboard", organizationId),
	report: <T>(organizationId: string, name: string) => requestJson<T>(`/api/reports/${name}`, organizationId),
};

export type Dashboard = { currency: string; queue: { waiting: number; inProgress: number; ready: number }; washes: number; washRevenueMinor: number; incomeMinor: number; expenseMinor: number; netCashFlowMinor: number; balances: { id: string; name: string; systemKey: string | null; balanceMinor: number }[]; lowStock: { id: string; name: string; quantityMilli: number; lowStockMilli: number }[] };

export function formatMoney(amountMinor: number, currency: string, locale: string) { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amountMinor / 100); }
export function quantityFromInput(value: string) { const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0; }
export function amountFromInput(value: string) { const parsed = Number(value.replace(/[^0-9-]/g, "")); return Number.isSafeInteger(parsed) ? parsed * 100 : 0; }

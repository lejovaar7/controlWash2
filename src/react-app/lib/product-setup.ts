export type ProductSettings = {
	organizationId: string;
	currency: string | null;
	timezone: string | null;
	deliveryPaymentPolicy: "block" | "warn";
	negativeStockPolicy: "strict" | "warn_and_override";
	canEdit: boolean;
};

export type PaymentMethod = {
	id: string;
	name: string;
	systemKey: string | null;
	displayOrder: number;
	isActive: boolean;
};

export type SetupCatalogItem = { id: string; name: string; systemKey: string | null; isActive: boolean };

async function requestJson<T>(path: string, organizationId: string, init?: RequestInit): Promise<T> {
	const headers = new Headers(init?.headers);
	headers.set("Accept", "application/json");
	headers.set("X-Company-Context", organizationId);
	if (init?.body) headers.set("Content-Type", "application/json");
	const response = await fetch(path, { ...init, headers, credentials: "include" });
	if (!response.ok) throw new Error("REQUEST_FAILED");
	return await response.json() as T;
}

export const productSetupApi = {
	settings: (organizationId: string) => requestJson<ProductSettings>("/api/product/settings", organizationId),
	saveSettings: (organizationId: string, input: Omit<ProductSettings, "organizationId" | "canEdit">) => requestJson<ProductSettings>("/api/product/settings", organizationId, { method: "PATCH", body: JSON.stringify(input) }),
	paymentMethods: (organizationId: string) => requestJson<{ methods: PaymentMethod[]; canEdit: boolean }>("/api/payment-methods", organizationId),
	createPaymentMethod: (organizationId: string, input: { name: string }) => requestJson<PaymentMethod>("/api/payment-methods", organizationId, { method: "POST", body: JSON.stringify(input) }),
	updatePaymentMethod: (organizationId: string, id: string, input: { isActive: boolean }) => requestJson<PaymentMethod>(`/api/payment-methods/${id}`, organizationId, { method: "PATCH", body: JSON.stringify(input) }),
	expenseCategories: (organizationId: string) => requestJson<{ categories: SetupCatalogItem[] }>("/api/expense-categories", organizationId),
	vehicleTypes: (organizationId: string) => requestJson<{ vehicleTypes: SetupCatalogItem[] }>("/api/vehicle-types", organizationId),
};

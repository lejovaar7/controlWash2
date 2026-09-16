import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { PageContainer, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppShell } from "@/hooks/use-app-shell";
import { useT } from "@/lib/i18n";
import { productSetupApi, type PaymentMethod, type ProductSettings, type SetupCatalogItem } from "@/lib/product-setup";
import type { MessageKey } from "../../shared/i18n";

type Workspace = { settings: ProductSettings; methods: PaymentMethod[]; categories: SetupCatalogItem[]; vehicleTypes: SetupCatalogItem[] };

export function ProductSetupPage() {
	const shell = useAppShell();
	if (!(shell.organizationRole === "owner" || (shell.organizationRole === "admin" && shell.allBranches))) return <Navigate to="/app/dashboard" replace />;
	return <ProductSetupWorkspace key={shell.organizationId} />;
}

function ProductSetupWorkspace() {
	const t = useT();
	const shell = useAppShell();
	const [workspace, setWorkspace] = useState<Workspace | null>(null);
	const [failed, setFailed] = useState(false);
	const [revision, setRevision] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		Promise.all([productSetupApi.settings(shell.organizationId), productSetupApi.paymentMethods(shell.organizationId), productSetupApi.expenseCategories(shell.organizationId), productSetupApi.vehicleTypes(shell.organizationId)])
			.then(([settings, methods, categories, vehicleTypes]) => { if (!controller.signal.aborted) setWorkspace({ settings, methods: methods.methods, categories: categories.categories, vehicleTypes: vehicleTypes.vehicleTypes }); })
			.catch(() => { if (!controller.signal.aborted) setFailed(true); });
		return () => controller.abort();
	}, [shell.organizationId, revision]);
	return <PageContainer className="space-y-6">
		<PageHeader title={t("Wash setup")} description={t("Configure money and operating defaults before receiving the first vehicle.")} />
		{failed ? <div role="alert" className="rounded-xl border p-4"><p>{t("We could not load wash setup.")}</p><Button className="mt-3" variant="outline" onClick={() => { setFailed(false); setWorkspace(null); setRevision((value) => value + 1); }}>{t("Try again")}</Button></div> : null}
		{!workspace && !failed ? <p role="status" className="text-muted-foreground">{t("Loading wash setup…")}</p> : null}
		{workspace ? <><SettingsForm settings={workspace.settings} onSaved={(settings) => setWorkspace({ ...workspace, settings })} /><div className="grid gap-6 xl:grid-cols-2"><PaymentMethodsPanel methods={workspace.methods} onChange={(methods) => setWorkspace({ ...workspace, methods })} /><DefaultsPanel categories={workspace.categories} vehicleTypes={workspace.vehicleTypes} /></div></> : null}
	</PageContainer>;
}

function SettingsForm({ settings, onSaved }: { settings: ProductSettings; onSaved: (value: ProductSettings) => void }) {
	const t = useT(); const shell = useAppShell();
	const [currency, setCurrency] = useState(settings.currency ?? "COP");
	const [timezone, setTimezone] = useState(settings.timezone ?? "America/Bogota");
	const [deliveryPaymentPolicy, setDeliveryPaymentPolicy] = useState(settings.deliveryPaymentPolicy);
	const [negativeStockPolicy, setNegativeStockPolicy] = useState(settings.negativeStockPolicy);
	const [pending, setPending] = useState(false); const [feedback, setFeedback] = useState<"saved" | "failed" | null>(null);
	async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setFeedback(null); try { onSaved(await productSetupApi.saveSettings(shell.organizationId, { currency, timezone, deliveryPaymentPolicy, negativeStockPolicy })); setFeedback("saved"); } catch { setFeedback("failed"); } finally { setPending(false); } }
	return <form onSubmit={submit} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"><div className="sm:col-span-2"><h2 className="text-lg font-semibold">{t("Operating policies")}</h2><p className="text-sm text-muted-foreground">{t("These defaults keep payments, delivery and stock behavior consistent.")}</p></div>
		<div className="grid gap-2"><Label htmlFor="wash-currency">{t("Currency")}</Label><Input id="wash-currency" maxLength={3} value={currency} required onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></div><div className="grid gap-2"><Label htmlFor="wash-timezone">{t("Timezone")}</Label><Input id="wash-timezone" maxLength={100} value={timezone} required onChange={(event) => setTimezone(event.target.value)} /></div>
		<div className="grid gap-2"><Label htmlFor="delivery-policy">{t("Unpaid delivery")}</Label><select id="delivery-policy" className="h-10 rounded-md border bg-background px-3" value={deliveryPaymentPolicy} onChange={(event) => setDeliveryPaymentPolicy(event.target.value as ProductSettings["deliveryPaymentPolicy"])}><option value="block">{t("Block delivery")}</option><option value="warn">{t("Warn and require confirmation")}</option></select></div>
		<div className="grid gap-2"><Label htmlFor="stock-policy">{t("Negative stock")}</Label><select id="stock-policy" className="h-10 rounded-md border bg-background px-3" value={negativeStockPolicy} onChange={(event) => setNegativeStockPolicy(event.target.value as ProductSettings["negativeStockPolicy"])}><option value="strict">{t("Do not allow")}</option><option value="warn_and_override">{t("Authorized override with reason")}</option></select></div>
		<div className="flex items-center gap-3 sm:col-span-2"><Button disabled={pending}>{t(pending ? "Saving…" : "Save operating policies")}</Button>{feedback ? <span role={feedback === "failed" ? "alert" : "status"} className="text-sm">{t(feedback === "saved" ? "Operating policies saved." : "We could not save operating policies.")}</span> : null}</div>
	</form>;
}

function PaymentMethodsPanel({ methods, onChange }: { methods: PaymentMethod[]; onChange: (value: PaymentMethod[]) => void }) {
	const t = useT(); const shell = useAppShell(); const [name, setName] = useState(""); const [pending, setPending] = useState(false); const [failed, setFailed] = useState(false);
	async function submit(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; setPending(true); setFailed(false); try { const method = await productSetupApi.createPaymentMethod(shell.organizationId, { name }); onChange([...methods, method]); setName(""); } catch { setFailed(true); } finally { setPending(false); } }
	async function toggle(method: PaymentMethod) { setPending(true); setFailed(false); try { const updated = await productSetupApi.updatePaymentMethod(shell.organizationId, method.id, { isActive: !method.isActive }); onChange(methods.map((value) => value.id === updated.id ? updated : value)); } catch { setFailed(true); } finally { setPending(false); } }
	return <section className="space-y-4 rounded-xl border p-4"><div><h2 className="text-lg font-semibold">{t("Payment methods")}</h2><p className="text-sm text-muted-foreground">{t("Cash is ready by default. Add simple labels such as Nequi or Bancolombia.")}</p></div><ul className="grid gap-2">{methods.map((method) => <li key={method.id} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-muted/50 p-3"><div><strong>{method.systemKey === "cash" ? t("Cash") : method.name}</strong><span className="ml-2 text-sm text-muted-foreground">{t(method.isActive ? "Active" : "Inactive")}</span></div><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void toggle(method)}>{t(method.isActive ? "Deactivate" : "Activate")}</Button></li>)}</ul>
		<form onSubmit={submit} className="grid gap-3 border-t pt-4"><h3 className="font-medium">{t("Add payment method")}</h3><div className="grid gap-2"><Label htmlFor="payment-method-name">{t("Method name")}</Label><Input id="payment-method-name" value={name} maxLength={80} placeholder={t("Example: Nequi")} required onChange={(event) => setName(event.target.value)} /></div>{failed ? <p role="alert" className="text-sm">{t("We could not save the payment method.")}</p> : null}<Button disabled={pending || !name.trim()}>{t(pending ? "Saving…" : "Add payment method")}</Button></form>
	</section>;
}

function DefaultsPanel({ categories, vehicleTypes }: { categories: SetupCatalogItem[]; vehicleTypes: SetupCatalogItem[] }) {
	const t = useT(); const defaultLabel = (item: SetupCatalogItem) => item.systemKey ? t(item.name as MessageKey) : item.name;
	return <section className="space-y-5 rounded-xl border p-4"><div><h2 className="text-lg font-semibold">{t("Starting catalogs")}</h2><p className="text-sm text-muted-foreground">{t("These editable defaults prepare expenses and vehicle pricing.")}</p></div><div><h3 className="mb-2 font-medium">{t("Vehicle types")}</h3><div className="flex flex-wrap gap-2">{vehicleTypes.map((item) => <span key={item.id} className="rounded-full border px-3 py-1 text-sm">{defaultLabel(item)}</span>)}</div></div><div><h3 className="mb-2 font-medium">{t("Expense categories")}</h3><div className="flex flex-wrap gap-2">{categories.map((item) => <span key={item.id} className="rounded-full border px-3 py-1 text-sm">{defaultLabel(item)}</span>)}</div></div><p className="text-sm text-muted-foreground">{t("Manage services and prices from their dedicated section.")}</p></section>;
}

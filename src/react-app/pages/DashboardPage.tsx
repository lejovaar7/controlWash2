import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "@/lib/i18n";
import { PageContainer, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { useAppShell } from "@/hooks/use-app-shell";
import { formatMoney, washApi, type Dashboard } from "@/lib/controlwash";

export function DashboardPage() {
	const { t, locale } = useI18n();
	// Shell state is resolved once by AppLayout, so this page issues no
	// additional branch request.
	const shell = useAppShell();

	const [dashboard, setDashboard] = useState<Dashboard | null>(null); const [failed, setFailed] = useState(false);
	useEffect(() => { washApi.dashboard(shell.organizationId).then(setDashboard).catch(() => setFailed(true)); }, [shell.organizationId]);
	return (
		<PageContainer className="space-y-6">
			<PageHeader
				title={t("Dashboard")}
				description={t("Today's operation at a glance.")}
				actions={<Button nativeButton={false} render={<Link to="/app/queue">{t("New wash")}</Link>} />}
			/>
			{failed ? <p role="alert">{t("We could not load the dashboard.")}</p> : null}{dashboard ? <><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={t("Washes today")} value={String(dashboard.washes)} /><Metric label={t("Recorded income")} value={formatMoney(dashboard.incomeMinor, dashboard.currency, locale)} /><Metric label={t("Recorded expenses")} value={formatMoney(dashboard.expenseMinor, dashboard.currency, locale)} /><Metric label={t("Net cash flow")} value={formatMoney(dashboard.netCashFlowMinor, dashboard.currency, locale)} /></dl><div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border p-5"><h2 className="font-semibold">{t("Live queue")}</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><QueueMetric label={t("Waiting")} value={dashboard.queue.waiting} /><QueueMetric label={t("In progress")} value={dashboard.queue.inProgress} /><QueueMetric label={t("Ready")} value={dashboard.queue.ready} /></div></section><section className="rounded-2xl border p-5"><h2 className="font-semibold">{t("Attention needed")}</h2>{dashboard.lowStock.length ? <ul className="mt-3 space-y-2">{dashboard.lowStock.slice(0, 5).map((item) => <li key={item.id} className="flex justify-between text-sm"><span>{item.name}</span><span className="text-amber-700">{t("Low stock")}: {(item.quantityMilli / 1000).toLocaleString(locale)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{t("No low-stock alerts.")}</p>}</section></div></> : !failed ? <p role="status">{t("Loading dashboard…")}</p> : null}
		</PageContainer>
	);
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>; }
function QueueMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted p-3"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }

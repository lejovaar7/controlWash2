import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, CarFront, CircleDollarSign, Clock3, PackageOpen, ReceiptText, Sparkles, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageContainer } from "@/components/page";
import { ProductBrand } from "@/components/product-brand";
import { Button } from "@/components/ui/button";
import { useAppShell } from "@/hooks/use-app-shell";
import { formatMoney, washApi, type Dashboard } from "@/lib/controlwash";

export function DashboardPage() {
	const { t, locale } = useI18n();
	const shell = useAppShell();
	const [dashboard, setDashboard] = useState<Dashboard | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		washApi.dashboard(shell.organizationId).then((result) => {
			setDashboard(result);
			setFailed(false);
		}).catch(() => setFailed(true));
	}, [shell.organizationId]);

	return (
		<PageContainer className="space-y-6">
			<section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground shadow-xl shadow-primary/15 sm:px-8 sm:py-9">
				<div className="absolute -right-20 -top-28 size-80 rounded-full bg-[#02a3f1]/30 blur-2xl" />
				<div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/8 blur-3xl" />
				<div className="relative flex flex-wrap items-center justify-between gap-7">
					<div className="max-w-2xl">
						<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#81d8ff]"><Sparkles className="size-4" />{shell.organizationName}</div>
						<h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">{t("Dashboard")}</h1>
						<p className="mt-2 text-base text-white/70 sm:text-lg">{t("Today's operation at a glance.")}</p>
						<Button className="mt-6 bg-white text-primary shadow-lg hover:bg-white/90" size="lg" nativeButton={false} render={<Link to="/app/queue" />}>{t("New wash")}<ArrowRight /></Button>
					</div>
					<div className="hidden rounded-2xl bg-white p-3 shadow-xl lg:block"><ProductBrand className="h-20 w-72" /></div>
				</div>
			</section>

			{failed ? <div role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">{t("We could not load the dashboard.")}</div> : null}
			{dashboard ? <>
				<dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<Metric icon={<CarFront />} label={t("Washes today")} value={String(dashboard.washes)} tone="blue" />
					<Metric icon={<CircleDollarSign />} label={t("Recorded income")} value={formatMoney(dashboard.incomeMinor, dashboard.currency, locale)} tone="green" />
					<Metric icon={<ReceiptText />} label={t("Recorded expenses")} value={formatMoney(dashboard.expenseMinor, dashboard.currency, locale)} tone="amber" />
					<Metric icon={<TrendingUp />} label={t("Net cash flow")} value={formatMoney(dashboard.netCashFlowMinor, dashboard.currency, locale)} tone="navy" />
				</dl>
				<div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
					<section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6">
						<div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">{t("Live queue")}</p><h2 className="mt-1 text-xl font-bold">{t("Wash queue")}</h2></div><Button variant="outline" size="sm" nativeButton={false} render={<Link to="/app/queue" />}>{t("Open app")}<ArrowRight /></Button></div>
						<div className="mt-5 grid grid-cols-3 gap-3 text-center">
							<QueueMetric icon={<Clock3 />} label={t("Waiting")} value={dashboard.queue.waiting} className="bg-amber-50 text-amber-800" />
							<QueueMetric icon={<CarFront />} label={t("In progress")} value={dashboard.queue.inProgress} className="bg-sky-50 text-sky-800" />
							<QueueMetric icon={<Sparkles />} label={t("Ready")} value={dashboard.queue.ready} className="bg-emerald-50 text-emerald-800" />
						</div>
					</section>
					<section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6">
						<div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><PackageOpen className="size-5" /></span><h2 className="text-lg font-bold">{t("Attention needed")}</h2></div>
						{dashboard.lowStock.length ? <ul className="mt-4 space-y-2.5">{dashboard.lowStock.slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/70 px-3 py-2.5 text-sm"><span className="font-medium">{item.name}</span><span className="shrink-0 font-semibold text-amber-700">{(item.quantityMilli / 1000).toLocaleString(locale)}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{t("No low-stock alerts.")}</p>}
					</section>
				</div>
			</> : !failed ? <DashboardSkeleton label={t("Loading dashboard…")} /> : null}
		</PageContainer>
	);
}

const tones = {
	blue: "bg-sky-50 text-sky-700",
	green: "bg-emerald-50 text-emerald-700",
	amber: "bg-amber-50 text-amber-700",
	navy: "bg-secondary text-secondary-foreground",
};

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: keyof typeof tones }) {
	return <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border transition-transform hover:-translate-y-0.5"><div className={`mb-4 grid size-11 place-items-center rounded-xl [&_svg]:size-5 ${tones[tone]}`}>{icon}</div><dt className="text-sm font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-bold tracking-tight">{value}</dd></div>;
}

function QueueMetric({ icon, label, value, className }: { icon: ReactNode; label: string; value: number; className: string }) {
	return <div className={`rounded-2xl p-3 sm:p-4 ${className}`}><div className="mx-auto mb-2 grid size-8 place-items-center rounded-lg bg-white/70 [&_svg]:size-4">{icon}</div><p className="text-2xl font-bold">{value}</p><p className="mt-0.5 text-xs font-medium opacity-75">{label}</p></div>;
}

function DashboardSkeleton({ label }: { label: string }) {
	return <div role="status" className="space-y-4"><span className="sr-only">{label}</span><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />)}</div><div className="h-56 animate-pulse rounded-3xl bg-muted" /></div>;
}

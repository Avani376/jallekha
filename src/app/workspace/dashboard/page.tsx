"use client";

/**
 * Dashboard: the whole engine state for the selected site in one view —
 * KPIs, the balance waterfall, findings, data quality, meter and delivery
 * trends, run history and tank level. Every number derives from persisted
 * records via src/lib/analytics.ts.
 */

import Link from "next/link";
import { activeRunFor, useWorkspace } from "@/data/store";
import { STATUS_META } from "@/components/equation-card";
import { StatusPill, EmptyState, type Tone } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";
import {
  ChartCard,
  CumulativeLine,
  DayBars,
  Donut,
  FlowWaterfall,
  LevelGauge,
  QualityMixBar,
  RunsTrend,
} from "@/components/charts";
import {
  cumulativeSeries,
  deliveriesByDay,
  findingsBreakdown,
  latestStockFraction,
  qualityMix,
  runsTrend,
  usageByInterval,
} from "@/lib/analytics";
import { formatLiters, formatSignedLiters } from "@/domain/units";

export default function DashboardPage() {
  const { state, selectedSiteId } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId);
  const tank = state.tanks.find((t) => t.siteId === selectedSiteId);
  const meter = state.meters.find((m) => m.siteId === selectedSiteId);

  if (!site || !tank || !meter) {
    return (
      <EmptyState
        title="No workspace yet"
        body="Create your site, tank and meter first — the dashboard fills from your records."
      />
    );
  }

  const run = activeRunFor(state, site.id);
  const dayDeliveries = deliveriesByDay(state.deliveries, site.id);
  const deliveryDayMap = new Map(dayDeliveries.map((d) => [d.label, d.liters]));
  const meterPoints = cumulativeSeries(state.usageReadings, site.id, meter.id);
  const usageIntervals = usageByInterval(state.usageReadings, site.id, meter.id);
  const findings = findingsBreakdown(run?.findings ?? []);
  const quality = run ? qualityMix(run) : { measured: 0, estimated: 0, unknown: 0, total: 0, measuredPct: 0 };
  const trend = runsTrend(state.runs, site.id);
  const level = latestStockFraction(state.tankReadings, site.id, tank.id, tank.capacityLiters);
  const postedTotal = state.deliveries
    .filter((d0) => d0.siteId === site.id && d0.status === "posted")
    .reduce((a, d0) => a + d0.quantityLiters, 0);
  const openCases = state.investigations.filter((i) => i.siteId === site.id && i.status !== "resolved").length;
  const recordsCount =
    state.deliveries.filter((d0) => d0.siteId === site.id).length +
    state.tankReadings.filter((r) => r.siteId === site.id).length +
    state.usageReadings.filter((r) => r.siteId === site.id).length;
  const avgDailyUsage =
    usageIntervals.length > 0
      ? Math.round(usageIntervals.reduce((a, u) => a + u.liters, 0) / usageIntervals.length)
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            The whole engine state for <strong className="text-slate-700">{site.name}</strong> — records, balance, quality and history in one view.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Link href="/workspace"><span className="text-[13px] font-bold text-water-deep hover:underline">Equation detail</span></Link>
          <IconArrowRight className="mt-1 text-slate-300" />
          <Link href="/workspace/reconciliation"><span className="text-[13px] font-bold text-water-deep hover:underline">Reconciliation</span></Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Delivered (posted)" value={`${formatLiters(postedTotal)} L`} sub={`${dayDeliveries.length} day(s) with loads`} />
        <Kpi
          label="Metered usage (period)"
          value={run?.usageLiters === null || run?.usageLiters === undefined ? "—" : `${formatLiters(run.usageLiters)} L`}
          sub={avgDailyUsage === null ? "from meter intervals" : `avg ${formatLiters(avgDailyUsage)} L/day`}
        />
        <Kpi
          label="Residual"
          value={run?.residualLiters === null || run?.residualLiters === undefined ? "unavailable" : formatSignedLiters(run.residualLiters) + " L"}
          sub={run?.status.replace(/-/g, " ") ?? "no run"}
          tone={run ? STATUS_META[run.status].tone : "neutral"}
        />
        <Kpi label="Data quality" value={`${quality.measuredPct}%`} sub={`${quality.measured}/${quality.total} inputs measured`} tone={quality.measuredPct >= 90 ? "ok" : quality.measuredPct >= 70 ? "review" : "warn"} />
        <Kpi label="Open cases" value={String(openCases)} sub={`${state.investigations.filter((i) => i.siteId === site.id).length} total`} tone={openCases > 0 ? "review" : "ok"} />
        <Kpi label="Records" value={String(recordsCount)} sub="deliveries + readings" />
      </div>

      {/* Balance + findings */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Water balance — waterfall"
          sub={run ? `Period ${run.periodStart.slice(0, 10)} → ${run.periodEnd.slice(0, 10)} (IST days) · O + D − U − C` : "Run a reconciliation to draw the balance"}
        >
          {run ? (
            <FlowWaterfall
              opening={run.openingLiters}
              deliveries={run.deliveriesTotalLiters}
              usage={run.usageLiters}
              closing={run.closingLiters}
              residual={run.residualLiters}
            />
          ) : (
            <p className="py-10 text-center text-[13px] text-slate-400">
              No active run for this site yet.
            </p>
          )}
          {run ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_META[run.status].tone}>{STATUS_META[run.status].label}</StatusPill>
              {run.boundsLiters ? (
                <span className="tabular text-xs font-semibold text-slate-500">
                  bounds [{formatLiters(run.boundsLiters.min)}, {formatLiters(run.boundsLiters.max)}] L
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-deep">uncertainty not quantified</span>
              )}
            </div>
          ) : null}
        </ChartCard>

        <ChartCard title="Findings in the active run" sub="Record issues and balance findings by type">
          <Donut slices={findings} centerLabel="findings" centerValue={String(findings.reduce((a, s) => a + s.value, 0))} />
        </ChartCard>
      </div>

      {/* Trends */}
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Cumulative meter — trend" sub="Dots ringed in teal mark days with a recorded delivery">
          <CumulativeLine points={meterPoints} deliveryDays={deliveryDayMap} />
        </ChartCard>
        <ChartCard title="Deliveries by day" sub="Posted tanker loads (as-recorded, voided excluded)">
          <DayBars data={dayDeliveries} unitLabel="Deliveries by day" />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title="Residual across saved runs" sub="Band = conservative bounds; green bands contain zero; faded = superseded">
          <RunsTrend points={trend} />
        </ChartCard>
        <div className="grid gap-5">
          <ChartCard title="Tank level — latest reading" sub={tank.readingMethodNote}>
            <LevelGauge fraction={level.fraction} liters={level.liters} capacity={tank.capacityLiters} />
          </ChartCard>
          <ChartCard title="Measurement quality — active run" sub="Share of inputs that are measured vs estimated vs unknown">
            <QualityMixBar measured={quality.measured} estimated={quality.estimated} unknown={quality.unknown} />
          </ChartCard>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-slate-400">
        Charts aggregate persisted records only — nothing is modelled or forecast. Interval usage is derived from
        consecutive cumulative meter readings; a decreasing meter is excluded (never absolute-valued). A discrepancy is
        not proof of theft or leakage.
      </p>
    </div>
  );
}

function Kpi({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-card">
      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="tabular mt-1 font-display text-xl font-extrabold text-ink">{value}</p>
      {sub ? (
        <p className="mt-0.5 text-[11.5px] font-semibold text-slate-500">
          {tone !== "neutral" ? (
            <StatusPill tone={tone} className="!px-2 !py-0 !text-[10.5px]">{sub}</StatusPill>
          ) : (
            sub
          )}
        </p>
      ) : null}
    </div>
  );
}

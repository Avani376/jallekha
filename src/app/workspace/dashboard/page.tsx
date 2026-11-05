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
import { StatusPill, EmptyState, Card, Input, Button, type Tone } from "@/components/ui";
import { detectAnomalies, configFor, isDismissed } from "@/domain/anomalies";
import { useState } from "react";
import { forecastDemand, FORECAST_DEFAULTS, type ForecastResult } from "@/lib/forecast";
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
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useI18n();
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
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{t("dash.title")}</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {t("dash.subtitle.pre")} <strong className="text-slate-700">{site.name}</strong> {t("dash.subtitle.post")}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Link href="/workspace"><span className="text-[13px] font-bold text-water-deep hover:underline">{t("dash.link.equation")}</span></Link>
          <IconArrowRight className="mt-1 text-slate-300" />
          <Link href="/workspace/reconciliation"><span className="text-[13px] font-bold text-water-deep hover:underline">{t("dash.link.reconciliation")}</span></Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("kpi.delivered")} value={`${formatLiters(postedTotal)} L`} sub={t("kpi.daysWithLoads", { n: dayDeliveries.length })} />
        <Kpi
          label={t("kpi.usage")}
          value={run?.usageLiters === null || run?.usageLiters === undefined ? "—" : `${formatLiters(run.usageLiters)} L`}
          sub={avgDailyUsage === null ? t("kpi.fromMeterIntervals") : t("kpi.avgDaily", { n: formatLiters(avgDailyUsage) })}
        />
        <Kpi
          label={t("kpi.residual")}
          value={run?.residualLiters === null || run?.residualLiters === undefined ? "unavailable" : formatSignedLiters(run.residualLiters) + " L"}
          sub={run ? t(`status.${run.status}`) : t("status.noRun")}
          tone={run ? STATUS_META[run.status].tone : "neutral"}
        />
        <Kpi label={t("kpi.quality")} value={`${quality.measuredPct}%`} sub={t("kpi.inputsMeasured", { m: quality.measured, t: quality.total })} tone={quality.measuredPct >= 90 ? "ok" : quality.measuredPct >= 70 ? "review" : "warn"} />
        <Kpi label={t("kpi.cases")} value={String(openCases)} sub={t("kpi.total")} tone={openCases > 0 ? "review" : "ok"} />
        <Kpi label={t("kpi.records")} value={String(recordsCount)} sub={t("kpi.deliveriesReadings")} />
      </div>

      {/* Balance + findings */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title={t("card.waterfall")}
          sub={run ? `Period ${run.periodStart.slice(0, 10)} → ${run.periodEnd.slice(0, 10)} (IST days) · ${t("card.waterfall.sub")}` : t("card.noRunSub")}
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
              {t("card.noRunBody")}
            </p>
          )}
          {run ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_META[run.status].tone}>{t(`status.${run.status}`)}</StatusPill>
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

        <ChartCard title={t("card.findings")} sub={t("card.findings.sub")}>
          <Donut slices={findings} centerLabel={t("card.findings.center")} centerValue={String(findings.reduce((a, s) => a + s.value, 0))} />
        </ChartCard>
      </div>

      <AnomaliesCard />
      <ForecastCard usageIntervals={usageIntervals.map((u) => ({ day: u.day, label: u.label, liters: u.liters }))} />

      {/* Trends */}
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title={t("card.trend")} sub={t("card.trend.sub")}>
          <CumulativeLine points={meterPoints} deliveryDays={deliveryDayMap} />
        </ChartCard>
        <ChartCard title={t("card.byDay")} sub={t("card.byDay.sub")}>
          <DayBars data={dayDeliveries} unitLabel="Deliveries by day" />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <ChartCard title={t("card.runs")} sub={t("card.runs.sub")}>
          <RunsTrend points={trend} />
        </ChartCard>
        <div className="grid gap-5">
          <ChartCard title={t("card.gauge")} sub={tank.readingMethodNote}>
            <LevelGauge fraction={level.fraction} liters={level.liters} capacity={tank.capacityLiters} />
          </ChartCard>
          <ChartCard title={t("card.quality")}>
            <QualityMixBar measured={quality.measured} estimated={quality.estimated} unknown={quality.unknown} />
          </ChartCard>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-slate-400">
        {t("dash.disclaimer")}
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

/* ------------------------------- Anomalies -------------------------------- */

function AnomaliesCard() {
  const { t } = useI18n();
  const { state, selectedSiteId, actions } = useWorkspace();
  const cfg = configFor(state, selectedSiteId);
  const all = detectAnomalies(state, selectedSiteId, cfg);
  const openList = all.filter((a) => !isDismissed(state, a));
  const dismissed = all.filter((a) => isDismissed(state, a));
  const [showConfig, setShowConfig] = useState(false);
  const [dismissFor, setDismissFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [cfgDraft, setCfgDraft] = useState(cfg);
  const [showDismissed, setShowDismissed] = useState(false);

  return (
    <Card className="print-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-ink">{t("card.anomalies")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("card.anomalies.sub")} {t("card.anomalies.sub2")}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowConfig(!showConfig)}>
          {showConfig ? t("anom.hideThresholds") : t("anom.thresholds")}
        </Button>
      </div>

      {showConfig ? (
        <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] sm:grid-cols-[1fr_1fr_auto]">
          <label className="flex items-center gap-2 font-semibold text-slate-600">
            Usage threshold ±%
            <Input
              aria-label="Usage threshold percent"
              type="number" min="5" max="200" className="w-20"
              value={cfgDraft.usagePctThreshold}
              onChange={(e) => setCfgDraft({ ...cfgDraft, usagePctThreshold: Number(e.target.value) || 40 })}
            />
          </label>
          <label className="flex items-center gap-2 font-semibold text-slate-600">
            Meter jump ×median
            <Input
              aria-label="Meter jump factor"
              type="number" min="1.5" max="10" step="0.1" className="w-20"
              value={cfgDraft.meterJumpFactor}
              onChange={(e) => setCfgDraft({ ...cfgDraft, meterJumpFactor: Number(e.target.value) || 2.5 })}
            />
          </label>
          <Button size="sm" variant="secondary" onClick={() => { actions.setAnomalyConfig(selectedSiteId, cfgDraft, "operator@local"); }}>
            Save thresholds
          </Button>
        </div>
      ) : null}

      {openList.length === 0 ? (
        <EmptyState
          title="No open anomalies"
          body="Statistical checks over usage, meter changes, run history and completeness found nothing to verify."
        />
      ) : (
        <ul className="space-y-3">
          {openList.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={a.severity === "high" ? "danger" : a.severity === "warning" ? "warn" : "info"}>
                  {a.kind}
                </StatusPill>
                <strong className="text-[13.5px] text-ink">{a.title}</strong>
              </div>
              <dl className="tabular mt-1.5 grid gap-1 text-[12.5px] text-slate-600 sm:grid-cols-3">
                <div><dt className="inline font-bold">Observed: </dt><dd className="inline">{a.observed}</dd></div>
                <div><dt className="inline font-bold">Expected: </dt><dd className="inline">{a.expected}</dd></div>
                <div><dt className="inline font-bold">Difference: </dt><dd className="inline">{a.difference}</dd></div>
              </dl>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{a.explanation}</p>
              <p className="mt-1.5 rounded-lg bg-[#e8f1ff] px-3 py-2 text-xs font-semibold text-water-deep">
                Potential anomaly — requires verification. {a.suggestedAction}
              </p>
              <p className="mt-1 text-[10.5px] text-slate-400">method: {a.method} · sources: {a.sourceIds.join(", ") || "run"}</p>
              {dismissFor === a.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Dismissal reason"
                    placeholder="Reason (recorded permanently)"
                    className="max-w-xs"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reason.trim().length < 4}
                    onClick={() => { actions.dismissAnomaly(a.id, reason.trim(), "operator@local"); setDismissFor(null); setReason(""); }}
                  >
                    Dismiss with reason
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDismissFor(null)}>Cancel</Button>
                </div>
              ) : (
                <button onClick={() => { setDismissFor(a.id); setReason(""); }} className="no-print mt-1.5 text-[11.5px] font-bold text-slate-400 hover:text-slate-600">
                  Not a real concern — dismiss (reason required)
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {dismissed.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button onClick={() => setShowDismissed(!showDismissed)} className="text-[11.5px] font-bold text-slate-400 hover:text-slate-600">
            {showDismissed ? "Hide" : "Show"} dismissed ({dismissed.length})
          </button>
          {showDismissed ? (
            <ul className="mt-2 space-y-1.5 text-[12px] text-slate-500">
              {dismissed.map((a) => {
                const d = state.anomalyDismissals?.[a.id];
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-slate-400">dismissed — {d?.reason} ({d?.by})</span>
                    <button onClick={() => actions.reopenAnomaly(a.id, "operator@local")} className="font-bold text-water-deep hover:underline">
                      reopen
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------- Forecast --------------------------------- */

function ForecastCard({ usageIntervals }: { usageIntervals: { day: string; label: string; liters: number }[] }) {

  const { t } = useI18n();  const [horizon, setHorizon] = useState(7);
  const result: ForecastResult = forecastDemand(usageIntervals, { ...FORECAST_DEFAULTS, horizonDays: horizon });

  return (
    <Card className="print-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-ink">{t("card.forecast")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("card.forecast.sub")}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {t("forecast.horizon")}
          <select
            aria-label="Forecast horizon days"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-[12px]"
          >
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>
      </div>

      {!result.sufficient ? (
        <div className="rounded-xl border border-dashed border-amber/50 bg-amber-soft px-4 py-6 text-center">
          <p className="text-[13px] font-bold text-amber-deep">{t("forecast.insufficient")}</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-amber-deep/80">{result.reason}</p>
        </div>
      ) : (
        <div>
          <ForecastSvg intervals={usageIntervals} points={result.points} />
          <div className="mt-3 grid gap-2 text-[12px] text-slate-500 sm:grid-cols-2">
            <p><strong className="text-slate-600">Method:</strong> {result.assumptions.method}</p>
            <p><strong className="text-slate-600">Input range:</strong> {result.assumptions.historyRange} ({result.assumptions.historyIntervals} intervals)</p>
            <p className="sm:col-span-2"><strong className="text-slate-600">Assumptions:</strong> demand continues at recent metered levels{result.assumptions.weekdayAdjustment ? ", adjusted by weekday pattern from the last 4 weeks" : ""}. {result.assumptions.stabilityNote}</p>
            <p className="sm:col-span-2 rounded-lg bg-amber-soft px-3 py-2 font-semibold text-amber-deep">
              {t("forecast.estimate")}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function ForecastSvg({ intervals, points }: { intervals: { label: string; liters: number }[]; points: { label: string; liters: number; low: number; high: number }[] }) {
  const W = 560;
  const H = 220;
  const pad = { l: 52, r: 14, t: 18, b: 30 };
  const all = [...intervals.map((i) => i.liters), ...points.flatMap((p) => [p.low, p.high])];
  const max = Math.max(...all, 1) * 1.12;
  const n = intervals.length + points.length;
  const x = (i: number) => pad.l + (i / Math.max(n - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  const _histPath = intervals.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.liters).toFixed(1)}`).join(" ");
  void _histPath;
  const fcPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(intervals.length + i).toFixed(1)},${y(p.liters).toFixed(1)}`).join(" ");
  const bandTop = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(intervals.length + i).toFixed(1)},${y(p.high).toFixed(1)}`).join(" ");
  const bandBottomRev = [...points].map((p, i) => `L${x(intervals.length + points.length - 1 - i).toFixed(1)},${y(points[points.length - 1 - i].low).toFixed(1)}`).join(" ");
  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Usage history and demand forecast">
      {intervals.map((p, i) => (
        <rect key={"h" + i} x={x(i) - 4} y={y(p.liters)} width={8} height={Math.max(H - pad.b - y(p.liters), 1)} rx="2" fill={AQUA_C} opacity={0.75}>
          <title>{`${p.label}: ${p.liters.toLocaleString("en-IN")} L (measured interval)`}</title>
        </rect>
      ))}
      <path d={bandTop + " " + bandBottomRev.replace("L", "L") + " Z"} fill={AMBER_C} opacity={0.22} />
      <path d={fcPath} fill="none" stroke={AMBER_C} strokeWidth="2.5" strokeDasharray="6 4" />
      {points.map((p, i) => (
        <g key={"f" + i}>
          <circle cx={x(intervals.length + i)} cy={y(p.liters)} r="3.5" fill={AMBER_C}>
            <title>{`${p.label}: ≈${p.liters.toLocaleString("en-IN")} L (band ${p.low.toLocaleString("en-IN")}–${p.high.toLocaleString("en-IN")})`}</title>
          </circle>
        </g>
      ))}
      {Array.from({ length: n }).map((_, i) => {
        const lab = i < intervals.length ? intervals[i].label : points[i - intervals.length].label;
        return i % labelEvery === 0 ? (
          <text key={"l" + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="9.5" fill={i < intervals.length ? "#64748B" : AMBER_C}>{lab}</text>
        ) : null;
      })}
      <text x={pad.l - 6} y={y(max) + 4} textAnchor="end" fontSize="10" fill="#64748B">{Math.round(max).toLocaleString("en-IN")}</text>
    </svg>
  );
}

const AQUA_C = "#25D8D1";
const AMBER_C = "#E9AE45";

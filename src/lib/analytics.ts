/**
 * Pure aggregations that feed the dashboard charts. Everything derives from
 * persisted records — no invented data. Day buckets use Asia/Kolkata.
 */

import type {
  Delivery,
  Finding,
  ReconciliationResult,
  TankReading,
  UsageReading,
} from "@/domain/types";

const IST_OFFSET_MS = 5.5 * 3600_000;

function istDayKey(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istDayLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const d = new Date(t + IST_OFFSET_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${d.toLocaleString("en-IN", { month: "short", timeZone: "UTC" })}`;
}

export interface DayVolume {
  day: string; // ISO date (IST)
  label: string;
  liters: number;
}

/** Posted delivery volumes bucketed by IST day, ascending. */
export function deliveriesByDay(deliveries: Delivery[], siteId: string): DayVolume[] {
  const acc = new Map<string, number>();
  for (const d0 of deliveries) {
    if (d0.siteId !== siteId || d0.status !== "posted") continue;
    const key = istDayKey(d0.deliveredAt);
    acc.set(key, (acc.get(key) ?? 0) + d0.quantityLiters);
  }
  return [...acc.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, liters]) => ({ day, label: istDayLabel(day + "T00:00:00Z"), liters: Math.round(liters) }));
}

export interface CumulativePoint {
  day: string;
  label: string;
  liters: number;
}

/** Cumulative meter series (one point per reading, ascending). */
export function cumulativeSeries(readings: UsageReading[], siteId: string, meterId: string): CumulativePoint[] {
  return readings
    .filter((r) => r.siteId === siteId && r.meterId === meterId)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    .map((r) => ({ day: istDayKey(r.observedAt), label: istDayLabel(r.observedAt), liters: r.cumulativeLiters }));
}

/** Interval usage derived from consecutive cumulative readings. */
export function usageByInterval(readings: UsageReading[], siteId: string, meterId: string): DayVolume[] {
  const sorted = readings
    .filter((r) => r.siteId === siteId && r.meterId === meterId)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const out: DayVolume[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const delta = Math.round(sorted[i].cumulativeLiters - sorted[i - 1].cumulativeLiters);
    out.push({ day: istDayKey(sorted[i].observedAt), label: istDayLabel(sorted[i].observedAt), liters: Math.max(0, delta) });
  }
  return out;
}

export interface StockPoint {
  label: string;
  liters: number;
  estimated: boolean;
}

/** Tank stock over time (ascending). */
export function stockSeries(readings: TankReading[], siteId: string, tankId: string): StockPoint[] {
  return readings
    .filter((r) => r.siteId === siteId && r.tankId === tankId)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    .map((r) => ({ label: istDayLabel(r.observedAt), liters: r.stockLiters, estimated: r.quality !== "measured" }));
}

export interface Slice {
  label: string;
  value: number;
  tone: "ok" | "review" | "warn" | "info" | "neutral" | "danger";
}

/** Findings grouped by type, descending by count. */
export function findingsBreakdown(findings: Finding[]): Slice[] {
  const order: { type: Finding["type"]; label: string; tone: Slice["tone"] }[] = [
    { type: "duplicate-candidate", label: "Duplicate candidates", tone: "warn" },
    { type: "balance-outside-uncertainty", label: "Outside uncertainty", tone: "warn" },
    { type: "missing-reading", label: "Missing readings", tone: "review" },
    { type: "invalid-reading", label: "Invalid readings", tone: "danger" },
    { type: "incomplete-coverage", label: "Coverage gaps", tone: "danger" },
    { type: "balance-within-uncertainty", label: "Within uncertainty", tone: "ok" },
  ];
  const counts = new Map<string, number>();
  for (const f of findings) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  return order
    .map((o) => ({ label: o.label, value: counts.get(o.type) ?? 0, tone: o.tone }))
    .filter((s) => s.value > 0);
}

export interface QualityMix {
  measured: number;
  estimated: number;
  unknown: number;
  total: number;
  measuredPct: number;
}

/** Measurement-quality mix across the run's provenance inputs. */
export function qualityMix(run: ReconciliationResult): QualityMix {
  let measured = 0;
  let estimated = 0;
  let unknown = 0;
  for (const inp of run.inputs) {
    if (inp.status === "voided") continue;
    if (inp.quality === "measured") measured += 1;
    else if (inp.quality === "estimated") estimated += 1;
    else unknown += 1;
  }
  const total = measured + estimated + unknown;
  return {
    measured,
    estimated,
    unknown,
    total,
    measuredPct: total === 0 ? 0 : Math.round((measured / total) * 100),
  };
}

export interface RunPoint {
  label: string;
  residual: number | null;
  min: number | null;
  max: number | null;
  active: boolean;
}

/** All saved runs for a site, chronological (superseded runs included). */
export function runsTrend(runs: ReconciliationResult[], siteId: string): RunPoint[] {
  return runs
    .filter((r) => r.siteId === siteId)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
    .map((r, i) => ({
      label: `#${i + 1} ${r.status === "incomplete" ? "incomplete" : `${Math.round(r.residualLiters ?? 0).toLocaleString("en-IN")} L`}`,
      residual: r.residualLiters,
      min: r.boundsLiters?.min ?? null,
      max: r.boundsLiters?.max ?? null,
      active: !r.supersededByRunId,
    }));
}

/** Stock level as a fraction of capacity (latest reading). */
export function latestStockFraction(readings: TankReading[], siteId: string, tankId: string, capacityLiters: number): { fraction: number; liters: number | null } {
  const latest = readings
    .filter((r) => r.siteId === siteId && r.tankId === tankId)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  if (!latest || capacityLiters <= 0) return { fraction: 0, liters: null };
  return { fraction: Math.max(0, Math.min(1, latest.stockLiters / capacityLiters)), liters: latest.stockLiters };
}

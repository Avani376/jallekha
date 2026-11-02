/**
 * Transparent, explainable anomaly detection over persisted records.
 *
 * Anomalies are review INPUTS, separate from the deterministic
 * reconciliation result: they never alter records, never assert a cause,
 * and are always labeled "potential anomaly — requires verification".
 * Methods are simple statistics (moving average, percentage change,
 * historical baseline) chosen for explainability over sophistication.
 */

import type { UsageReading, WorkspaceState } from "./types";

/** Latest non-superseded run for a site (domain-local copy to stay pure). */
function latestRun(state: WorkspaceState, siteId: string) {
  return state.runs
    .filter((r) => r.siteId === siteId && !r.supersededByRunId)
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
    .at(-1) ?? null;
}

export interface AnomalyConfig {
  /** Usage intervals deviating more than this % from the moving average are flagged. */
  usagePctThreshold: number; // e.g. 40 means ±40%
  /** Consecutive meter delta larger than this multiple of the median is flagged. */
  meterJumpFactor: number; // e.g. 2.5
  /** Moving-average window (in reading intervals). */
  window: number;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  usagePctThreshold: 40,
  meterJumpFactor: 2.5,
  window: 7,
};

export type AnomalyKind =
  | "consumption-anomaly"
  | "sudden-meter-change"
  | "repeated-discrepancy"
  | "missing-records";

export type AnomalySeverity = "info" | "warning" | "high";

export interface Anomaly {
  /** Content-derived stable id — also the dismissal key. */
  id: string;
  siteId: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  observed: string;
  expected: string;
  difference: string;
  method: string;
  dataComplete: boolean;
  explanation: string;
  suggestedAction: string;
  sourceIds: string[];
}

export interface AnomalyDismissal {
  reason: string;
  at: string;
  by: string;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function istDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, v) => a + v, 0) / values.length;
}

export interface UsageAnomalyInput {
  siteId: string;
  meterId: string;
  readings: UsageReading[]; // for ONE site+meter, unsorted
}

/**
 * Consumption + sudden-change detection over consecutive meter intervals.
 * Returns [] with a "reason" via dataComplete=false entries when history is
 * insufficient — never a guess from thin data.
 */
export function detectUsageAnomalies(
  input: UsageAnomalyInput,
  config: AnomalyConfig,
): Anomaly[] {
  const { siteId, meterId, readings } = input;
  const sorted = readings
    .filter((r) => r.siteId === siteId && r.meterId === meterId && r.quality !== "unknown")
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));

  const intervals = sorted.slice(1).map((r, i) => ({
    id: `${sorted[i].id}|${r.id}`,
    day: istDay(r.observedAt),
    liters: Math.round(r.cumulativeLiters - sorted[i].cumulativeLiters),
    sourceIds: [sorted[i].id, r.id],
  }));

  // Negative or zero intervals indicate a meter problem the engine already
  // flags separately — exclude them so one bad pair does not poison the
  // baseline.
  const clean = intervals.filter((iv) => iv.liters > 0);
  const out: Anomaly[] = [];

  if (clean.length < 5) {
    if (sorted.length >= 2) {
      out.push({
        id: hash(`insufficient:${siteId}:${meterId}`),
        siteId,
        kind: "missing-records",
        severity: "info",
        title: "Not enough history for anomaly detection",
        observed: `${clean.length} clean interval(s)`,
        expected: `at least 5 intervals for a moving-average baseline (window ${config.window})`,
        difference: "—",
        method: "data sufficiency check",
        dataComplete: false,
        explanation:
          "Anomaly detection needs a short history before its baseline means anything. Keep recording daily meter values — no anomaly is claimed from thin data.",
        suggestedAction: "Record daily cumulative meter values; re-check after five intervals.",
        sourceIds: sorted.slice(-2).flatMap((r) => [r.id]),
      });
    }
    return out;
  }

  const jumpThresholdLiters = median(clean.map((c) => c.liters)) * config.meterJumpFactor;

  // The two lenses are complementary: a large interval can legitimately be
  // both a meter-pair anomaly and a consumption deviation, so both findings
  // are emitted when both conditions hold.
  clean.forEach((iv, i) => {
    const windowStart = Math.max(0, i - config.window);
    const baselinePool = clean.slice(windowStart, i).map((c) => c.liters);
    if (baselinePool.length < 3) return; // need a minimal baseline per point
    const baseline = Math.round(mean(baselinePool));
    const deviationPct = baseline === 0 ? 0 : ((iv.liters - baseline) / baseline) * 100;
    const isConsumptionSpike = deviationPct >= config.usagePctThreshold;
    const isConsumptionDrop = deviationPct <= -config.usagePctThreshold;
    const isMeterJump = iv.liters > jumpThresholdLiters;

    if (isMeterJump) {
      out.push({
        id: hash(`jump:${siteId}:${iv.id}`),
        siteId,
        kind: "sudden-meter-change",
        severity: "warning",
        title: `Sudden meter change on ${iv.day}`,
        observed: `${fmt(iv.liters)} L between consecutive readings`,
        expected: `typical interval ≈ ${fmt(median(clean.map((c) => c.liters)))} L (median)`,
        difference: `${fmt(iv.liters - median(clean.map((c) => c.liters)))} L vs median`,
        method: `median × ${config.meterJumpFactor} jump factor`,
        dataComplete: true,
        explanation:
          "A single interval far above the typical meter movement may be a data-entry error, a bulk fill, or a real usage event. The meter values themselves are unchanged; this is a pattern flag only.",
        suggestedAction: "Check both meter readings for that interval against the physical meter; correct or annotate as verified.",
        sourceIds: iv.sourceIds,
      });
    }
    if (isConsumptionSpike || isConsumptionDrop) {
      out.push({
        id: hash(`usage:${siteId}:${iv.id}`),
        siteId,
        kind: "consumption-anomaly",
        severity: isConsumptionDrop ? "info" : "warning",
        title: `Unusual consumption on ${iv.day} (${isConsumptionDrop ? "low" : "high"})`,
        observed: `${fmt(iv.liters)} L used`,
        expected: `≈ ${fmt(baseline)} L (moving average, ${baselinePool.length}-interval window)`,
        difference: `${deviationPct > 0 ? "+" : ""}${Math.round(deviationPct)}% vs baseline`,
        method: `moving average ± ${config.usagePctThreshold}% threshold`,
        dataComplete: true,
        explanation:
          "Consumption moved outside the recent baseline band. Low days can mean holidays or a skipped reading routine; high days can mean guests, leakage, or an entry error. This is a verification prompt, not a conclusion.",
        suggestedAction: isConsumptionDrop
          ? "Confirm the meter reading for that day; note the reason (holiday, closure) on the record."
          : "Walk the line: check for open taps, compare with the delivery that day, and confirm the reading.",
        sourceIds: iv.sourceIds,
      });
    }
  });

  return out;
}

/**
 * Repeated-discrepancy detection across saved runs: two or more recent
 * active-period discrepancies for the same site suggest a systematic issue
 * (coverage gap, recurring entry error) rather than a one-off.
 */
export function detectRepeatedDiscrepancies(state: WorkspaceState, siteId: string): Anomaly[] {
  const runs = state.runs
    .filter((r) => r.siteId === siteId && r.status === "discrepancy")
    .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
  if (runs.length < 2) return [];
  const latest = runs[runs.length - 1];
  return [
    {
      id: hash(`repeat-disc:${siteId}:${runs.map((r) => r.id).join("|")}`),
      siteId,
      kind: "repeated-discrepancy",
      severity: "warning",
      title: `Discrepancy recorded in ${runs.length} separate runs`,
      observed: `latest residual ${latest.residualLiters ?? 0} L (run ${latest.id})`,
      expected: "residual within the stated uncertainty for a consistent process",
      difference: "recurring across periods",
      method: "reconciliation run history",
      dataComplete: true,
      explanation:
        "The same site keeps producing out-of-band residuals. That usually points to a systematic cause — a meter that does not cover everything, a recurring entry habit, or a tank whose capacity assumptions changed — rather than a one-off mistake. Each individual discrepancy is still unproven.",
      suggestedAction:
        "Re-verify the meter boundary description and the reading routine before treating any single run as significant.",
      sourceIds: runs.slice(-3).map((r) => r.id),
    },
  ];
}

/** Full detection pass for one site: usage anomalies + repeated discrepancies. */
export function detectAnomalies(state: WorkspaceState, siteId: string, config: AnomalyConfig): Anomaly[] {
  const meter = state.meters.find((m) => m.siteId === siteId);
  const out: Anomaly[] = [];
  if (meter) {
    out.push(...detectUsageAnomalies({ siteId, meterId: meter.id, readings: state.usageReadings }, config));
  }
  out.push(...detectRepeatedDiscrepancies(state, siteId));

  // Missing-reading gaps: a period whose active run reports missing fields.
  const run = latestRun(state, siteId);
  if (run && run.completeness.missingFields.length > 0) {
    out.push({
      id: hash(`missing:${siteId}:${run.id}`),
      siteId,
      kind: "missing-records",
      severity: "warning",
      title: "Reporting gap: required readings missing",
      observed: run.completeness.missingFields.join(", "),
      expected: "a reading at every boundary instant",
      difference: "—",
      method: "completeness check on the active run",
      dataComplete: false,
      explanation:
        "The current period cannot be balanced because required readings are absent. No residual is claimed — completing the readings is the only fix.",
      suggestedAction: "Open the linked case and record the missing reading(s) at the boundary instants.",
      sourceIds: [],
    });
  }
  return out;
}

/** True when an anomaly should be hidden (dismissed with a recorded reason). */
export function isDismissed(state: WorkspaceState, anomaly: Anomaly): boolean {
  return Boolean(state.anomalyDismissals?.[anomaly.id]);
}

/** Applies site thresholds, falling back to defaults for missing keys. */
export function configFor(state: WorkspaceState, siteId: string): AnomalyConfig {
  return { ...DEFAULT_ANOMALY_CONFIG, ...(state.anomalyConfigs?.[siteId] ?? {}) };
}

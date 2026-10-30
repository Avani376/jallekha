"use client";

/**
 * Balance explainer: renders the deterministic result's real values with an
 * uncertainty band. Numbers always come from the ReconciliationResult — the
 * animation never changes, invents or rounds a displayed value.
 */

import type { ReconciliationResult } from "@/domain/types";
import { formatLiters, formatSignedLiters } from "@/domain/units";
import { Card, StatusPill, type Tone } from "@/components/ui";
import { UncertaintyBand } from "@/components/uncertainty-band";

export const STATUS_META: Record<
  ReconciliationResult["status"],
  { tone: Tone; label: string; blurb: string }
> = {
  invalid: {
    tone: "danger",
    label: "Invalid input",
    blurb: "Blocking problems must be fixed before a balance can be attempted.",
  },
  incomplete: {
    tone: "review",
    label: "Incomplete data",
    blurb: "A required reading is missing — no residual is asserted and nothing is treated as zero.",
  },
  "complete-unknown-bounds": {
    tone: "info",
    label: "Uncertainty not quantified",
    blurb: "Residual is provisional; at least one input has no declared measurement uncertainty.",
  },
  "within-uncertainty": {
    tone: "ok",
    label: "Within stated measurement uncertainty",
    blurb: "The interval contains zero: consistent with measurement error under the declared bounds. Not a claim of a perfect balance.",
  },
  discrepancy: {
    tone: "warn",
    label: "Outside uncertainty — investigate",
    blurb: "The residual exceeds the declared measurement error. The cause is NOT determined; this is not proof of theft or leakage.",
  },
};

export function EquationCard({ result }: { result: ReconciliationResult }) {
  const meta = STATUS_META[result.status];
  return (
    <Card className="overflow-hidden print-card">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          <span className="text-xs text-slate-400">
            rule {result.ruleVersion} · boundary convention [start, end) · run {result.id}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-600">{meta.blurb}</p>
      </div>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Equation result={result} />
          <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
            <Fact label="Opening stock (boundary)" value={`${formatLiters(result.openingLiters)} L`} missing={!result.completeness.openingReading} />
            <Fact label="Recorded deliveries" value={`${formatLiters(result.deliveriesTotalLiters)} L`} sub={`${result.deliveriesIncludedCount} posted in period`} />
            <Fact label="Measured usage (meter Δ)" value={result.usageLiters === null ? "—" : `${formatLiters(result.usageLiters)} L`} missing={result.usageLiters === null} />
            <Fact label="Closing stock (boundary)" value={`${formatLiters(result.closingLiters)} L`} missing={!result.completeness.closingReading} />
            <Fact label="Residual R = O + D − U − C" value={result.residualLiters === null ? "unavailable" : `${formatSignedLiters(result.residualLiters)} L`} strong />
            <Fact
              label="Uncertainty interval"
              value={
                result.boundsLiters
                  ? `[${formatLiters(result.boundsLiters.min)}, ${formatLiters(result.boundsLiters.max)}] L`
                  : "not quantified"
              }
            />
          </dl>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <UncertaintyBand
            min={result.boundsLiters?.min ?? null}
            max={result.boundsLiters?.max ?? null}
            residual={result.residualLiters}
          />
          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-600">Scope assumption:</strong> {result.scopeAssumption}
          </p>
        </div>
      </div>

      {result.invalidReasons.length > 0 ? (
        <div className="border-t border-danger/20 bg-danger-soft px-5 py-3.5">
          <p className="text-[13px] font-bold text-danger">Blocking problems</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-danger/90">
            {result.invalidReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.completeness.missingFields.length > 0 && result.status !== "invalid" ? (
        <div className="border-t border-amber/30 bg-amber-soft px-5 py-3.5">
          <p className="text-[13px] font-bold text-amber-deep">
            Missing required readings ({result.completeness.missingFields.length})
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-amber-deep/90">
            {result.completeness.missingFields.map((f) => (
              <li key={f}>{prettyField(f)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function prettyField(f: string): string {
  const map: Record<string, string> = {
    openingStockReading: "Opening stock reading at period start",
    closingStockReading: "Closing stock reading at period end",
    meterStartReading: "Cumulative meter value at period start",
    meterEndReading: "Cumulative meter value at period end",
  };
  return map[f] ?? f;
}

function Fact({ label, value, sub, missing, strong }: { label: string; value: string; sub?: string; missing?: boolean; strong?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${missing ? "border-amber/40 bg-amber-soft" : "border-slate-200 bg-slate-50/60"}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`tabular mt-0.5 font-extrabold ${strong ? "text-lg text-ink" : "text-[15px] text-slate-700"}`}>
        {missing ? <span className="font-bold text-amber-deep">missing — not zero</span> : value}
      </dd>
      {sub ? <dd className="text-[11px] text-slate-400">{sub}</dd> : null}
    </div>
  );
}

export function Equation({ result }: { result: ReconciliationResult }) {
  const parts: { sign: string; label: string; value: number | null; tone: string }[] = [
    { sign: "", label: "O", value: result.openingLiters, tone: "text-water-deep" },
    { sign: "+", label: "D", value: result.status === "incomplete" || result.status === "invalid" ? null : result.deliveriesTotalLiters, tone: "text-aqua-deep" },
    { sign: "−", label: "U", value: result.usageLiters, tone: "text-amber-deep" },
    { sign: "−", label: "C", value: result.closingLiters, tone: "text-slate-600" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-display">
      <span className="text-lg font-extrabold tracking-tight text-ink">R</span>
      <span className="text-slate-400">=</span>
      {parts.map((p, idx) => (
        <span key={p.label} className="flex items-baseline gap-1.5">
          {idx > 0 ? <span className="text-slate-400">{p.sign}</span> : null}
          <span className={`text-lg font-extrabold ${p.tone}`}>{p.label}</span>
          <span className="tabular text-[15px] font-bold text-slate-500">
            {p.value === null ? <span className="text-amber-deep">[missing]</span> : formatLiters(p.value)}
          </span>
        </span>
      ))}
      {result.residualLiters !== null ? (
        <>
          <span className="text-slate-400">→</span>
          <span className="tabular rounded-lg bg-ink px-2.5 py-1 text-lg font-extrabold text-aqua">
            R = {formatSignedLiters(result.residualLiters)} L
          </span>
        </>
      ) : (
        <>
          <span className="text-slate-400">→</span>
          <span className="rounded-lg bg-amber-soft px-2.5 py-1 text-sm font-extrabold text-amber-deep">
            residual unavailable
          </span>
        </>
      )}
    </div>
  );
}

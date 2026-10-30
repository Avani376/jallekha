"use client";

/**
 * Reconciliation screen: equation, bounds, source-by-source drill-down,
 * findings, run history (superseded runs stay inspectable), and the
 * rule-based explanation panel (AI-assist is OFF in this build).
 */

import { useState } from "react";
import { activeRunFor, useWorkspace } from "@/data/store";
import { EquationCard } from "@/components/equation-card";
import { Button, Card, CardHeader, StatusPill, EmptyState } from "@/components/ui";
import { formatLiters } from "@/domain/units";
import { findingTone } from "@/app/workspace/page";
import { istDate } from "@/app/workspace/ledger/page";

export default function ReconciliationPage() {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const run = activeRunFor(state, site.id);
  const history = state.runs
    .filter((r) => r.siteId === site.id)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const [openInput, setOpenInput] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Reconciliation</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Deterministic balance for the demo period. No AI participates in any calculation.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => actions.runReconciliation(site.id)}
          variant="primary"
        >
          ↻ Recompute balance
        </Button>
      </div>

      {run ? (
        <>
          <EquationCard result={run} />

          <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
            <Card className="print-card">
              <CardHeader title="Source-by-source drill-down" sub="Every input, its provenance, quality and declared uncertainty." />
              <ul className="divide-y divide-slate-100">
                {run.inputs.map((inp) => (
                  <li key={`${inp.kind}-${inp.id}`}>
                    <button
                      className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
                      aria-expanded={openInput === inp.id}
                      onClick={() => setOpenInput(openInput === inp.id ? null : inp.id)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-ink">{inp.label}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">{inp.kind}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-[13px] font-bold text-slate-700">{formatLiters(inp.liters)} L</p>
                        <p className="text-[11px] text-slate-400">
                          {inp.uncertaintyLiters === null ? "uncertainty not quantified" : `±${formatLiters(inp.uncertaintyLiters)} L`} · {inp.quality}
                          {inp.status ? ` · ${inp.status}` : ""}
                        </p>
                      </div>
                    </button>
                    {openInput === inp.id ? (
                      <div className="bg-slate-50/80 px-5 py-3 text-xs text-slate-500">
                        <p><strong>Record ID:</strong> {inp.id}</p>
                        <p><strong>Source reference:</strong> {inp.sourceReference ?? "manual entry"}</p>
                        <p>
                          <strong>Role in the equation:</strong>{" "}
                          {inp.kind.includes("reading") ? "stock at the boundary instant (O or C)" : inp.kind.startsWith("meter") ? "cumulative meter value; the delta across boundaries is the flow U" : "inflow flow D inside [start, end)"}
                        </p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-5">
              <Card className="print-card">
                <CardHeader title="Findings" sub="Record-level checks run even when the balance itself is incomplete or invalid." />
                {run.findings.length === 0 ? (
                  <div className="px-5 py-6"><EmptyState title="No findings" body="Nothing flagged in this run." /></div>
                ) : (
                  <ul className="space-y-3 px-5 py-4">
                    {run.findings.map((f) => (
                      <li key={f.id} className="rounded-xl border border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusPill tone={findingTone(f.type)}>{f.type}</StatusPill>
                          <span className="text-[13px] font-bold text-ink">{f.title}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{f.detail}</p>
                        <p className="mt-2 rounded-lg bg-[#e8f1ff] px-3 py-2 text-xs text-water-deep">
                          <strong>Next action:</strong> {f.suggestedAction}
                        </p>
                        {f.matchFields ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            matched on: {f.matchFields.join(", ")} ({f.matchKind})
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="print-card">
                <CardHeader title="Explanation" sub="Rule-based, generated from the run only. No AI was used." />
                <div className="px-5 py-4 text-[13px] leading-relaxed text-slate-600">
                  <RuleBasedExplanation status={run.status} residual={run.residualLiters} bounds={run.boundsLiters} />
                </div>
              </Card>
            </div>
          </div>

          <Card className="print-card">
            <CardHeader
              title="Run history"
              sub="Corrections create a new run and mark the old one superseded — original calculations stay inspectable."
            />
            <ul className="divide-y divide-slate-100 text-[13px]">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
                  <StatusPill tone={r.supersededByRunId ? "neutral" : "info"}>
                    {r.supersededByRunId ? "superseded" : "active"}
                  </StatusPill>
                  <span className="tabular text-slate-500">{istDate(r.generatedAt)} IST</span>
                  <span className="tabular font-bold text-slate-700">
                    R = {r.residualLiters === null ? "unavailable" : `${formatLiters(r.residualLiters)} L`}
                  </span>
                  <span className="text-slate-400">{r.status}</span>
                  <span className="ml-auto text-[11px] text-slate-300">{r.id}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <EmptyState
          title="No run for this site yet"
          body="Press “Recompute balance” to calculate the deterministic water balance for the demo period."
          action={<Button onClick={() => actions.runReconciliation(site.id)}>Recompute balance</Button>}
        />
      )}
    </div>
  );
}

function RuleBasedExplanation({
  status, residual, bounds,
}: {
  status: string; residual: number | null; bounds: { min: number; max: number } | null;
}) {
  const fmt = (n: number) => formatLiters(n);
  switch (status) {
    case "within-uncertainty":
      return (
        <p>
          Opening stock plus recorded deliveries, minus metered usage and closing stock, leaves{" "}
          <strong>{fmt(residual ?? 0)} L</strong>. The conservative interval{" "}
          <strong>[{fmt(bounds!.min)}, {fmt(bounds!.max)}] L</strong> contains zero, so the records are consistent with
          the declared measurement error. This is <em>not</em> a claim of a perfect physical balance: it means the
          residual cannot be distinguished from measurement error. Any record-level findings above still need review.
        </p>
      );
    case "discrepancy":
      return (
        <p>
          The residual of <strong>{fmt(residual ?? 0)} L</strong> lies outside the conservative interval{" "}
          <strong>[{fmt(bounds!.min)}, {fmt(bounds!.max)}] L</strong>, so declared measurement error alone does not
          explain it. Possible explanations include an unrecorded inflow, a coverage gap in the meter boundary, an
          entry error, or a physical issue — <strong>the cause is not determined and this is not proof of theft or
          leakage</strong>. Verification steps are listed in the finding above.
        </p>
      );
    case "incomplete":
      return (
        <p>
          A required boundary reading is missing, so <strong>no residual is calculated</strong>. JalLekha never
          substitutes zero or a nearby reading: it reports what is missing and opens a verification task. Duplicate
          and validation checks still ran on the records that exist.
        </p>
      );
    case "complete-unknown-bounds":
      return (
        <p>
          All required inputs exist and the residual is <strong>{fmt(residual ?? 0)} L</strong>, but at least one
          input has no declared uncertainty, so no interval can be computed. Treat this as provisional — it must not
          be labeled “within uncertainty” with an invented error estimate.
        </p>
      );
    default:
      return (
        <p>
          Blocking input problems were detected (see the list above). The balance was not attempted to avoid
          presenting a misleading number; fix the listed records and recompute.
        </p>
      );
  }
}

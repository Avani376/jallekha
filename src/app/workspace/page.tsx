"use client";

import Link from "next/link";
import { activeRunFor, useWorkspace } from "@/data/store";
import { EquationCard } from "@/components/equation-card";
import { TankCutaway } from "@/components/tank-cutaway";
import { Button, Card, CardHeader, EmptyState, StatusPill, type Tone } from "@/components/ui";
import { IconArrowRight, IconPlus, IconRefresh, IconUpload } from "@/components/icons";
import { formatLiters } from "@/domain/units";
import { mascotReact } from "@/components/mascot";

const INV_TONE: Record<string, Tone> = {
  open: "review",
  "in-review": "info",
  "action-required": "warn",
  resolved: "ok",
  reopened: "warn",
};

export default function OverviewPage() {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const run = activeRunFor(state, site.id);
  const cases = state.investigations.filter((i) => i.siteId === site.id);
  const openCases = cases.filter((i) => i.status !== "resolved");
  const closing = state.tankReadings
    .filter((r) => r.tankId === tank.id)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {site.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">{site.description}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href="/workspace/ledger">
            <Button size="sm" variant="secondary"><IconPlus /> Add delivery</Button>
          </Link>
          <Link href="/workspace/ledger">
            <Button size="sm" variant="secondary"><IconUpload /> Import CSV</Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={() => { mascotReact("think", 1400); actions.runReconciliation(site.id); mascotReact("happy", 2000); }}>
            <IconRefresh /> Recompute
          </Button>
          <Link href="/workspace/reconciliation">
            <Button size="sm">Reconciliation <IconArrowRight /></Button>
          </Link>
        </div>
      </div>

      {run ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <Card className="flex flex-col items-center justify-center bg-ink px-4 py-6 text-white print-card">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-aqua">
                Closing stock · live reading
              </div>
              <div className="[&_figure]:!bg-transparent">
                <TankCutaway
                  fillFraction={(closing?.stockLiters ?? 0) / tank.capacityLiters}
                  capacityLabel={`${formatLiters(tank.capacityLiters)} L`}
                  valueLabel={`${formatLiters(closing?.stockLiters)} L`}
                  tone={run.status === "discrepancy" ? "amber" : "aqua"}
                  height={180}
                />
              </div>
              <p className="mt-3 text-center text-[11px] leading-snug text-white/50">
                {tank.readingMethodNote}
              </p>
            </Card>
            <EquationCard result={run} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="print-card">
              <CardHeader
                title="Findings in this run"
                sub="Record issues and balance findings — every number is recomputed from source records."
                right={
                  <Link href="/workspace/reconciliation" className="text-[13px] font-bold text-water-deep hover:underline">
                    Details
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {run.findings.length === 0 ? (
                  <li className="px-5 py-6"><EmptyState title="No findings" body="This run found no record or balance issues." /></li>
                ) : (
                  run.findings.map((f) => (
                    <li key={f.id} className="flex items-start gap-3 px-5 py-3.5">
                      <StatusPill tone={findingTone(f.type)}>{f.title}</StatusPill>
                      <p className="flex-1 text-[13px] leading-snug text-slate-500 line-clamp-2">{f.detail}</p>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card className="print-card">
              <CardHeader
                title="Verification cases"
                sub="Owned tasks with evidence and a reviewable resolution."
                right={
                  <Link href="/workspace/investigations" className="text-[13px] font-bold text-water-deep hover:underline">
                    All cases
                  </Link>
                }
              />
              {cases.length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyState title="No cases" body="Open findings automatically become verification cases with a suggested next action." />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cases.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={`/workspace/investigations?id=${i.id}`} className="block truncate text-[14px] font-bold text-ink hover:text-water-deep">
                          {i.title}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {i.status !== "resolved" ? `Assignee: ${i.assignee ?? "unassigned"}` : `Resolved: ${i.resolution?.outcome}`}
                        </p>
                      </div>
                      <StatusPill tone={INV_TONE[i.status] ?? "neutral"}>{i.status}</StatusPill>
                    </li>
                  ))}
                </ul>
              )}
              {openCases.length > 0 ? (
                <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
                  {openCases.length} open case{openCases.length > 1 ? "s" : ""} — resolving a case recomputes the balance and keeps the previous run in history.
                </p>
              ) : null}
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title="No reconciliation yet"
          body="Open the Reconciliation screen and run the deterministic balance for this site and period."
          action={<Link href="/workspace/reconciliation"><Button>Run reconciliation</Button></Link>}
        />
      )}
    </div>
  );
}

export function findingTone(t: string): Tone {
  switch (t) {
    case "duplicate-candidate": return "warn";
    case "missing-reading": return "review";
    case "invalid-reading": return "danger";
    case "incomplete-coverage": return "danger";
    case "balance-outside-uncertainty": return "warn";
    case "balance-within-uncertainty": return "ok";
    default: return "neutral";
  }
}

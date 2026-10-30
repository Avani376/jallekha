"use client";

/**
 * Verification cases: list view by default, case detail via ?id=…
 * (query-param routing keeps the app fully static-exportable while the
 * shared workspace UI stays identical).
 */

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { activeRunFor, useWorkspace } from "@/data/store";
import { Button, Card, CardHeader, EmptyState, Field, Input, StatusPill, Textarea, type Tone } from "@/components/ui";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";
import { assertTransition, STATUS_LABELS } from "@/domain/state";
import { formatLiters } from "@/domain/units";
import { istDate, istToUtc } from "@/lib/datetime";
import { mascotReact } from "@/components/mascot";
import type { InvestigationStatus, ResolutionOutcome } from "@/domain/types";

const TONE: Record<InvestigationStatus, Tone> = {
  open: "review", "in-review": "info", "action-required": "warn", resolved: "ok", reopened: "warn",
};

const TYPE_LABEL: Record<string, string> = {
  "duplicate-candidate": "Duplicate candidate",
  "missing-reading": "Missing reading",
  "invalid-reading": "Invalid reading",
  "incomplete-coverage": "Incomplete coverage",
  "balance-outside-uncertainty": "Residual outside uncertainty",
  "balance-within-uncertainty": "Within uncertainty",
};

const OUTCOMES: { value: ResolutionOutcome; label: string }[] = [
  { value: "duplicate-voided", label: "Duplicate record voided" },
  { value: "missing-reading-supplied", label: "Missing reading supplied" },
  { value: "input-corrected", label: "Input/unit corrected" },
  { value: "legitimate-separate-delivery", label: "Legitimate separate delivery verified" },
  { value: "measurement-coverage-incomplete", label: "Measurement coverage incomplete" },
  { value: "unresolved-after-review", label: "Reviewed but unresolved" },
];

export default function InvestigationsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-shimmer rounded-2xl bg-slate-100" aria-busy="true" />}>
      <Investigations />
    </Suspense>
  );
}

function Investigations() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <CaseDetail id={id} />;
  return <CaseList />;
}

/* -------------------------------- List ---------------------------------- */

function CaseList() {
  const { state, selectedSiteId } = useWorkspace();
  const list = state.investigations
    .filter((i) => i.siteId === selectedSiteId)
    .sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Verification cases</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Each finding becomes an owned, evidence-backed case. Finding type and case status are separate; “reviewed
          but unresolved” never appears as a verified physical reconciliation.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No cases for this site" body="When a reconciliation run produces actionable findings, cases appear here automatically." />
      ) : (
        <Card className="print-card">
          <CardHeader title="Case list" sub="Open cases first, then resolved history." />
          <ul className="divide-y divide-slate-100">
            {list.map((i) => (
              <li key={i.id}>
                <Link href={`/workspace/investigations?id=${i.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-50">
                  <StatusPill tone={TONE[i.status] ?? "neutral"}>{i.status}</StatusPill>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{i.title}</p>
                    <p className="text-xs text-slate-400">
                      {TYPE_LABEL[i.findingType] ?? i.findingType} · assignee: {i.assignee ?? "unassigned"} ·{" "}
                      {i.status === "resolved" ? `resolved ${i.resolution?.outcome}` : i.evidenceNotes.length > 0 ? `${i.evidenceNotes.length} evidence note(s)` : "no evidence yet"}
                    </p>
                  </div>
                  <IconArrowRight className="text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------- Detail --------------------------------- */

function CaseDetail({ id }: { id: string }) {
  const { state, actions } = useWorkspace();
  const inv = state.investigations.find((i) => i.id === id);
  const [evidence, setEvidence] = useState("");
  const [assignee, setAssignee] = useState("");
  const [outcome, setOutcome] = useState<ResolutionOutcome>("unresolved-after-review");
  const [explanation, setExplanation] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!inv) {
    return (
      <div className="py-10">
        <EmptyState title="Case not found" body="The case may belong to another demo site or was reset." action={<Link href="/workspace/investigations" className="text-[13px] font-bold text-water-deep"><span className="inline-flex items-center gap-1"><IconArrowLeft /> All cases</span></Link>} />
      </div>
    );
  }

  const site = state.sites.find((s) => s.id === inv.siteId)!;
  const tank = state.tanks.find((t) => t.siteId === inv.siteId)!;
  const run = activeRunFor(state, inv.siteId);
  const linkedDeliveries = state.deliveries.filter((d0) => inv.sourceIds.includes(d0.id));
  const missingClosing = inv.findingType === "missing-reading" && !!run?.completeness.missingFields.includes("closingStockReading");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill tone={TONE[inv.status]}>{STATUS_LABELS[inv.status]}</StatusPill>
            <span className="text-xs text-slate-400">{inv.id}</span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-ink">{inv.title}</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-slate-600">{inv.detail}</p>
        </div>
        <Link href="/workspace/investigations" className="no-print text-[13px] font-bold text-water-deep hover:underline"><span className="inline-flex items-center gap-1"><IconArrowLeft /> All cases</span></Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <Card className="print-card">
            <CardHeader title="Suggested next action" />
            <p className="rounded-xl bg-[#e8f1ff] mx-5 mb-4 px-4 py-3 text-[13px] font-semibold text-water-deep">{inv.suggestedAction}</p>
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Linked source records</p>
              <ul className="mt-1.5 space-y-1.5 text-[13px]">
                {inv.sourceIds.length === 0 ? <li className="text-slate-400">This finding refers to the balance itself, not a specific record.</li> : null}
                {inv.sourceIds.map((sid) => {
                  const d0 = state.deliveries.find((x) => x.id === sid);
                  if (d0) {
                    return (
                      <li key={sid} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <span className="font-mono text-xs text-slate-400">{d0.id}</span>
                        <span className="font-bold text-ink">{d0.supplierLabel}</span>
                        <span className="tabular text-slate-500">receipt {d0.receiptNumber ?? "—"} · {formatLiters(d0.quantityLiters)} L · {istDate(d0.deliveredAt)}</span>
                        <StatusPill tone={d0.status === "voided" ? "neutral" : "ok"}>{d0.status}</StatusPill>
                      </li>
                    );
                  }
                  return <li key={sid} className="text-slate-500">{sid}</li>;
                })}
              </ul>
            </div>
          </Card>

          {/* Signature action: missing closing reading */}
          {missingClosing ? (
            <Card className="print-card border-amber/50">
              <CardHeader title="Record the closing reading" sub={`Adds a stock reading for ${tank.name} at the period end instant, then recomputes the balance. The current run is preserved as superseded history.`} />
              <div className="space-y-3 px-5 py-4">
                <CloseReadingForm
                  onSubmit={(liters, uncertainty) => {
                    actions.addTankReading({
                      siteId: inv.siteId, tankId: tank.id,
                      observedAtUTC: istToUtc("2026-10-29T08:00"),
                      stockLiters: liters, uncertaintyLiters: uncertainty,
                      method: "dipstick", quality: "measured",
                      note: `Recorded via case ${inv.id}`, actor: "data-entry@demo (you)",
                    });
                    actions.addEvidence(inv.id, `Closing stock reading of ${liters} L recorded at the boundary instant; balance recomputed.`, "data-entry@demo (you)");
                    actions.setInvestigationStatus(inv.id, "in-review", "data-entry@demo (you)");
                    mascotReact("happy", 2600);
                  }}
                  onError={setErr}
                />
              </div>
            </Card>
          ) : null}

          <Card className="print-card">
            <CardHeader title="Evidence timeline" sub="Every note is attributed and timestamped." />
            <ol className="space-y-3 px-5 py-4">
              {inv.evidenceNotes.length === 0 ? <li className="text-[13px] text-slate-400">No evidence recorded yet.</li> : null}
              {inv.evidenceNotes.map((e) => (
                <li key={e.id} className="relative rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-[13px] text-slate-700">{e.text}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{e.author} · {istDate(e.addedAt)} IST</p>
                </li>
              ))}
              <li className="no-print space-y-2">
                <Field label="Add evidence note" htmlFor="ev-note">
                  <Textarea id="ev-note" rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="What did you check? What did you find?" />
                </Field>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" disabled={evidence.trim().length < 4} onClick={() => { actions.addEvidence(inv.id, evidence.trim(), "operator@demo (you)"); setEvidence(""); }}>
                    Save evidence
                  </Button>
                </div>
              </li>
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="print-card">
            <CardHeader title="Ownership & status" />
            <div className="space-y-3 px-5 py-4">
              <p className="text-[13px] text-slate-600">
                Assignee: <strong>{inv.assignee ?? "unassigned"}</strong>
              </p>
              <div className="no-print flex flex-wrap items-end gap-2">
                <Field label="Assign to" htmlFor="assign">
                  <Input id="assign" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="name@demo" className="w-44" />
                </Field>
                <Button size="sm" variant="secondary" disabled={!assignee.trim()} onClick={() => actions.assignInvestigation(inv.id, assignee.trim(), "reviewer@demo (you)")}>
                  Assign
                </Button>
              </div>
              <div className="no-print">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Status transitions</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["open", "in-review", "action-required"] as InvestigationStatus[])
                    .filter((s) => s !== inv.status)
                    .map((s) => {
                      const legal = (() => { try { assertTransition(inv.status, s); return true; } catch { return false; } })();
                      return (
                        <Button key={s} size="sm" variant="ghost" disabled={!legal} onClick={() => actions.setInvestigationStatus(inv.id, s, "reviewer@demo (you)")}>
                          → {STATUS_LABELS[s]}
                        </Button>
                      );
                    })}
                </div>
              </div>
            </div>
          </Card>

          {inv.status !== "resolved" ? (
            <Card className="print-card">
              <CardHeader title="Record resolution" sub="Requires an outcome, an explanation and a reviewer — all three are stored." />
              <div className="space-y-3 px-5 py-4">
                <Field label="Outcome" htmlFor="res-outcome">
                  <select
                    id="res-outcome"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as ResolutionOutcome)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-water"
                  >
                    {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Explanation" htmlFor="res-exp" required>
                  <Textarea id="res-exp" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="What was verified, against what evidence…" />
                </Field>
                {err ? <p role="alert" className="text-xs font-semibold text-danger">{err}</p> : null}
                <Button
                  size="sm"
                  disabled={explanation.trim().length < 8}
                  onClick={() => {
                    try {
                      actions.resolveInvestigation(inv.id, outcome, explanation.trim(), "reviewer@demo (you)");
                      mascotReact("happy", 2800);
                      setErr(null);
                    } catch (e) { setErr((e as Error).message); }
                  }}
                >
                  Resolve case
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="print-card border-verd/40">
              <CardHeader title="Resolution" sub={`${inv.resolution?.reviewer} · ${istDate(inv.resolution?.resolvedAt ?? "")} IST`} />
              <div className="px-5 py-4">
                <StatusPill tone="ok">{inv.resolution?.outcome}</StatusPill>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{inv.resolution?.explanation}</p>
                {linkedDeliveries.some((d0) => d0.status === "voided") ? (
                  <p className="mt-3 rounded-xl bg-verd-soft px-3.5 py-2.5 text-xs text-verd">
                    Duplicate record corrected — the original record and the voided record are both retained in history.
                    This is a data correction, not physical water saved.
                  </p>
                ) : null}
              </div>
            </Card>
          )}

          <Card className="print-card">
            <CardHeader title="Linked run" />
            <div className="px-5 py-4 text-[13px] text-slate-600">
              {run ? (
                <>
                  <p className="tabular">Status: <strong>{run.status}</strong> · Residual:{" "}
                    <strong>{run.residualLiters === null ? "unavailable" : `${formatLiters(run.residualLiters)} L`}</strong>
                  </p>
                  <p className="tabular mt-1">
                    Bounds: {run.boundsLiters ? `[${formatLiters(run.boundsLiters.min)}, ${formatLiters(run.boundsLiters.max)}] L` : "not quantified"}
                  </p>
                  <Link href="/workspace/reconciliation" className="mt-2 inline-block font-bold text-water-deep hover:underline">Open reconciliation →</Link>
                </>
              ) : (
                <p className="text-slate-400">No active run — recompute from the Reconciliation screen.</p>
              )}
            </div>
          </Card>

          <p className="text-xs text-slate-400">
            Site: {site.name} (synthetic). Role actions in this demo are demonstrations, not authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

function CloseReadingForm({
  onSubmit, onError,
}: { onSubmit: (liters: number, uncertainty: number | null) => void; onError: (s: string | null) => void }) {
  const [liters, setLiters] = useState("11000");
  const [uncertainty, setUncertainty] = useState("200");
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
      <Field label="Closing stock (L)" htmlFor="case-close-l" required>
        <Input id="case-close-l" type="number" min="0" value={liters} onChange={(e) => setLiters(e.target.value)} />
      </Field>
      <Field label="Uncertainty (±L)" htmlFor="case-close-u">
        <Input id="case-close-u" type="number" min="0" value={uncertainty} onChange={(e) => setUncertainty(e.target.value)} />
      </Field>
      <Button
        size="sm"
        onClick={() => {
          const v = Number(liters);
          if (Number.isNaN(v) || !Number.isFinite(v) || v < 0) { onError("Stock must be a non-negative number."); return; }
          onSubmit(v, uncertainty === "" ? null : Number(uncertainty));
          onError(null);
        }}
      >
        Record & recompute
      </Button>
    </div>
  );
}

"use client";

/**
 * Reports & export: printable review (browser print → PDF), safe CSV export
 * (formula prefixes neutralized), and a JSON workspace export for the demo.
 * Exports include site/period, formula, coverage, uncertainty, findings and
 * outcomes — labeled synthetic.
 */

import { useWorkspace, activeRunFor } from "@/data/store";
import { Button, Card, CardHeader, StatusPill } from "@/components/ui";
import { EquationCard } from "@/components/equation-card";
import { formatLiters } from "@/domain/units";
import { sanitizeCell } from "@/domain/import";
import { useRef } from "react";
import { IconUpload } from "@/components/icons";
import { istDate } from "@/lib/datetime";

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { state, selectedSiteId, mode, actions } = useWorkspace();
  const fileInput = useRef<HTMLInputElement>(null);
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const run = activeRunFor(state, site.id);
  const cases = state.investigations.filter((i) => i.siteId === site.id);
  const deliveries = state.deliveries.filter((d0) => d0.siteId === site.id);

  const exportCsv = () => {
    const esc = (v: string | number | null | undefined) => sanitizeCell(String(v ?? ""));
    const lines = [
      "id,delivered_at_utc,delivered_at_ist,supplier,receipt,volume_liters,unit_original,uncertainty_liters,quality,status,source_reference,note",
      ...deliveries.map((d0) =>
        [
          d0.id, d0.deliveredAt, istDate(d0.deliveredAt), esc(d0.supplierLabel), esc(d0.receiptNumber ?? ""),
          d0.quantityLiters, d0.sourceUnit, d0.uncertaintyLiters ?? "", d0.quality, d0.status,
          esc(d0.sourceReference ?? ""), esc(d0.note ?? ""),
        ].map(esc).join(","),
      ),
    ].join("\n");
    download(`jallekha-${site.id}-deliveries.csv`, lines, "text/csv");
  };

  const exportWorkspace = () => {
    const payload = {
      kind: "jallekha-workspace",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      note: mode === "demo"
        ? "Demo workspace (synthetic). Importing it elsewhere restores the demo sites."
        : "Real records workspace. Contains no credentials; store it with the same care as the records.",
      workspace: state,
    };
    download(`jallekha-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
  };

  const importWorkspaceFile = (file: File) => {
    file.text()
      .then((text) => {
        actions.importWorkspace(text, "operator@local");
      })
      .catch((e) => window.alert((e as Error).message));
  };

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      storageMode: mode,
      disclosure: "SYNTHETIC DEMO DATA — browser-local only; not a shared server or a pilot system.",
      site: site.name,
      period: run ? { start: run.periodStart, end: run.periodEnd, convention: run.boundaryConvention } : null,
      ruleVersion: run?.ruleVersion ?? null,
      result: run
        ? {
            status: run.status,
            opening: run.openingLiters, deliveries: run.deliveriesTotalLiters,
            usage: run.usageLiters, closing: run.closingLiters,
            residual: run.residualLiters, bounds: run.boundsLiters,
            completeness: run.completeness, scopeAssumption: run.scopeAssumption,
          }
        : null,
      findings: run?.findings ?? [],
      cases: cases.map((i) => ({ id: i.id, type: i.findingType, status: i.status, resolution: i.resolution })),
      deliveries,
    };
    download(`jallekha-${site.id}-review.json`, JSON.stringify(payload, null, 2), "application/json");
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Reports & export</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            The printable review reads well without color or animation and is labeled synthetic throughout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={exportCsv}>Export CSV (safe)</Button>
          <Button size="sm" variant="secondary" onClick={exportJson}>Export JSON review</Button>
          <Button size="sm" variant="secondary" onClick={exportWorkspace}>Export workspace (JSON)</Button>
          <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}><IconUpload /> Import workspace</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importWorkspaceFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => window.print()}>Print / save as PDF</Button>
        </div>
      </div>

      <div id="printable" className="space-y-5">
        <div className="rounded-2xl border border-slate-300 bg-white px-6 py-5 print-card">
          <p className="font-display text-lg font-extrabold text-ink">JalLekha documented review</p>
          <p className="mt-1 text-[13px] text-slate-500">
            Site: <strong>{site.name}</strong> (synthetic) · Period: {run ? `${istDate(run.periodStart)} → ${istDate(run.periodEnd)} IST` : "—"} ·{" "}
            Storage mode: <strong>{mode === "demo" ? "synthetic demo (per visitor)" : "your records (this browser)"}</strong> · Generated {istDate(new Date().toISOString())} IST
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Generated by JalLekha prototype (rule {run?.ruleVersion ?? "—"}). All data is synthetic demonstration data.
          </p>
        </div>

        {run ? <EquationCard result={run} /> : null}

        <Card className="print-card">
          <CardHeader title="Cases & outcomes" sub="Finding type, ownership, evidence and the recorded resolution." />
          {cases.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-slate-400">No cases for this site.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-[13px]">
              {cases.map((i) => (
                <li key={i.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={i.status === "resolved" ? "ok" : "review"}>{i.status}</StatusPill>
                    <strong className="text-ink">{i.title}</strong>
                  </div>
                  <p className="mt-1 text-slate-500">Assignee: {i.assignee ?? "unassigned"} · evidence notes: {i.evidenceNotes.length}</p>
                  {i.resolution ? (
                    <p className="mt-1 text-slate-600">
                      Outcome: <strong>{i.resolution.outcome}</strong> — {i.resolution.explanation} (by {i.resolution.reviewer})
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="print-card">
          <CardHeader title="Delivery records (as recorded, including voided history)" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-bold">When (IST)</th>
                  <th className="px-3 py-2 font-bold">Supplier</th>
                  <th className="px-3 py-2 font-bold">Receipt</th>
                  <th className="px-3 py-2 text-right font-bold">Volume</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d0) => (
                  <tr key={d0.id}>
                    <td className="tabular px-5 py-2">{istDate(d0.deliveredAt)}</td>
                    <td className="px-3 py-2">{d0.supplierLabel}</td>
                    <td className="px-3 py-2">{d0.receiptNumber ?? "—"}</td>
                    <td className="tabular px-3 py-2 text-right font-bold">{formatLiters(d0.quantityLiters)} L</td>
                    <td className="px-3 py-2">{d0.status}{d0.status === "voided" ? ` — ${d0.voidReason}` : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="px-5 py-2" colSpan={3}>As-recorded posted total</td>
                  <td className="tabular px-3 py-2 text-right">
                    {formatLiters(deliveries.filter((d0) => d0.status === "posted").reduce((a, d0) => a + d0.quantityLiters, 0))} L
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card className="print-card">
          <CardHeader title="Recent audit events" sub="Actor, action and reason for meaningful mutations on this demo device." />
          <ul className="divide-y divide-slate-100 text-[12px]">
            {state.auditEvents.slice(-12).reverse().map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 px-5 py-2">
                <span className="tabular text-slate-400">{istDate(e.at)} IST</span>
                <span className="font-bold text-slate-600">{e.action}</span>
                <span className="text-slate-400">{e.entityId}</span>
                {e.reason ? <span className="text-slate-500">“{e.reason}”</span> : null}
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-xs text-slate-400">
          Reminder: a corrected duplicate receipt is a data correction, not physical water saved. Residuals outside
          uncertainty are not proof of theft or leakage. Exports never include credentials or private notes.
        </p>
      </div>
    </div>
  );
}

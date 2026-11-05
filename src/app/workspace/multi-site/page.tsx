"use client";

/**
 * Multi-site intelligence: side-by-side reconciliation state across every
 * site in the workspace. Comparison reliability is explicit — sites with
 * incomplete records or unquantified uncertainty are flagged instead of
 * ranked, and no site is called &quot;worst&quot; from raw residual volume alone.
 */

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { useWorkspace } from "@/data/store";
import { siteRows, totals, type SiteRow } from "@/lib/multisite";
import { Card, StatusPill, type Tone } from "@/components/ui";
import { formatLiters, formatSignedLiters } from "@/domain/units";

const STATUS_TONE: Record<string, Tone> = {
  "within-uncertainty": "ok",
  discrepancy: "warn",
  incomplete: "review",
  invalid: "danger",
  "complete-unknown-bounds": "info",
};

const STATUS_LABEL: Record<string, string> = {
  "within-uncertainty": "Within uncertainty",
  discrepancy: "Outside uncertainty",
  incomplete: "Incomplete",
  invalid: "Invalid records",
  "complete-unknown-bounds": "Uncertainty not quantified",
};

type StatusFilter = "all" | "discrepancy" | "incomplete" | "within-uncertainty" | "unreliable";

export default function MultiSitePage() {
  const { t } = useI18n();
  const { state } = useWorkspace();
  const rows = useMemo(() => siteRows(state), [state]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reliableOnly, setReliableOnly] = useState(false);
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) => {
    if (statusFilter === "discrepancy" && r.runStatus !== "discrepancy") return false;
    if (statusFilter === "incomplete" && r.runStatus !== "incomplete") return false;
    if (statusFilter === "within-uncertainty" && r.runStatus !== "within-uncertainty") return false;
    if (statusFilter === "unreliable" && r.comparisonReliable) return false;
    if (reliableOnly && !r.comparisonReliable) return false;
    if (q.trim() && !r.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  const sums = totals(rows);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">{t("ms.title")}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">
          Reconciliation state across every site in this workspace. Each row is built only from that site&#39;s own
          records — the engine rejects cross-site joins by design, so nothing leaks between societies.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("kpi.sites")} value={String(sums.sites)} />
        <Kpi label={t("status.discrepancy")} value={String(sums.withDiscrepancy)} tone={sums.withDiscrepancy > 0 ? "warn" : "ok"} sub={t("anom.verified")} />
        <Kpi label={t("status.incomplete")} value={String(sums.withIncomplete)} tone={sums.withIncomplete > 0 ? "review" : "ok"} sub="readings missing" />
        <Kpi label={t("kpi.cases")} value={String(sums.openCases)} tone={sums.openCases > 0 ? "review" : "ok"} />
        <Kpi label={t("card.anomalies")} value={String(sums.openAnomalies)} tone={sums.openAnomalies > 0 ? "review" : "ok"} />
        <Kpi label={t("kpi.comparableSites")} value={`${sums.reliableCount}/${sums.sites}`} sub="complete + quantified" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
        <input
          aria-label={t("ms.searchAria")}
          placeholder={t("ms.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-52 rounded-xl border border-slate-300 px-3 py-2 text-[13px]"
        />
        <select
          aria-label="Filter by reconciliation status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-[13px]"
        >
          <option value="all">{t("ms.allStatuses")}</option>
          <option value="discrepancy">Outside uncertainty</option>
          <option value="incomplete">Incomplete</option>
          <option value="within-uncertainty">Within uncertainty</option>
          <option value="unreliable">{t("ms.notComparable")}</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
          <input type="checkbox" checked={reliableOnly} onChange={(e) => setReliableOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {t("ms.comparableOnly")}
        </label>
        <span className="tabular ml-auto text-xs font-semibold text-slate-400">{filtered.length} of {rows.length} sites</span>
      </div>

      {/* Comparison table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-slate-400">{t("ms.noMatch")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-bold">Site</th>
                  <th className="px-3 py-2.5 font-bold">Period</th>
                  <th className="px-3 py-2.5 font-bold">Balance status</th>
                  <th className="px-3 py-2.5 text-right font-bold">Residual</th>
                  <th className="px-3 py-2.5 text-right font-bold">Delivered</th>
                  <th className="px-3 py-2.5 text-right font-bold">Usage</th>
                  <th className="px-3 py-2.5 text-right font-bold">Missing</th>
                  <th className="px-3 py-2.5 text-right font-bold">Cases</th>
                  <th className="px-3 py-2.5 font-bold">Comparability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <SiteRowView key={r.siteId} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11.5px] leading-relaxed text-slate-400">
        Comparison caution: sites differ in size, occupancy and measurement quality, so raw volumes are never ranked
        as &quot;best&quot; or &quot;worst&quot; here. A site whose run is incomplete or whose uncertainty is not quantified is marked not
        comparable instead. Recurring discrepancies and anomalies are visible per site on their dashboards.
      </p>
    </div>
  );
}

function SiteRowView({ row }: { row: SiteRow }) {
  const { t } = useI18n();
  return (
    <tr className={row.comparisonReliable ? "hover:bg-slate-50/70" : "bg-slate-50/40"}>
      <td className="px-4 py-2.5">
        <Link href="/workspace" className="font-bold text-ink hover:text-water-deep">
          {row.name}
        </Link>
        {row.isDemo ? <span className="ml-1.5 text-[10px] font-bold text-slate-400">demo</span> : null}
        <p className="text-[11px] text-slate-400">{row.reliabilityNote}</p>
      </td>
      <td className="tabular px-3 py-2.5 text-slate-500">{row.periodLabel}</td>
      <td className="px-3 py-2.5">
        {row.runStatus ? (
          <StatusPill tone={STATUS_TONE[row.runStatus] ?? "neutral"}>{STATUS_LABEL[row.runStatus] ?? row.runStatus}</StatusPill>
        ) : (
          <span className="text-slate-400">no run</span>
        )}
      </td>
      <td className="tabular px-3 py-2.5 text-right font-bold text-ink">
        {row.residualLiters === null ? "—" : formatSignedLiters(row.residualLiters) + " L"}
        {row.boundsKnown && row.residualLiters !== null ? (
          <p className="text-[10px] font-normal text-slate-400">bounds known</p>
        ) : null}
      </td>
      <td className="tabular px-3 py-2.5 text-right text-slate-600">{formatLiters(row.deliveriesTotal)} L</td>
      <td className="tabular px-3 py-2.5 text-right text-slate-600">{formatLiters(row.usageLiters)} L</td>
      <td className="tabular px-3 py-2.5 text-right">{row.missingFields > 0 ? <span className="font-bold text-amber-deep">{row.missingFields}</span> : "0"}</td>
      <td className="tabular px-3 py-2.5 text-right">{row.openCases > 0 ? <span className="font-bold text-amber-deep">{row.openCases}</span> : "0"}</td>
      <td className="px-3 py-2.5">
        <span className={row.comparisonReliable ? "text-[11.5px] font-semibold text-verd" : "text-[11.5px] font-semibold text-amber-deep"}>
          {row.comparisonReliable ? t("ms.comparable") : t("ms.notComparable")}
        </span>
      </td>
    </tr>
  );
}

function Kpi({ label, value, sub, tone: _tone = "neutral" }: { label: string; value: string; sub?: string; tone?: Tone }) {
  void _tone;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-card">
      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="tabular mt-1 font-display text-xl font-extrabold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{sub}</p> : null}
    </div>
  );
}

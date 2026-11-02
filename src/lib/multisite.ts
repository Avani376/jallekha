/**
 * Multi-site aggregation for the intelligence view. Every row derives from
 * that site's OWN records only (the engine rejects cross-site joins by
 * design). Comparison reliability is explicit: a site with incomplete data
 * or unquantified uncertainty is flagged rather than silently ranked.
 */

import type { WorkspaceState } from "@/domain/types";
import { activeRunFor, periodFor } from "@/data/store";
import { configFor, detectAnomalies, isDismissed } from "@/domain/anomalies";

export interface SiteRow {
  siteId: string;
  name: string;
  isDemo: boolean;
  periodLabel: string;
  runStatus: string | null;
  residualLiters: number | null;
  boundsKnown: boolean;
  missingFields: number;
  openCases: number;
  openAnomalies: number;
  recordsCount: number;
  deliveriesTotal: number;
  usageLiters: number | null;
  measuredPct: number;
  /** False when the run is incomplete/invalid or uncertainty is unquantified. */
  comparisonReliable: boolean;
  reliabilityNote: string;
}

function fmtDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function siteRows(state: WorkspaceState): SiteRow[] {
  return state.sites.map((site) => {
    const run = activeRunFor(state, site.id);
    const period = periodFor(state, site.id);
    const recordsCount =
      state.deliveries.filter((d) => d.siteId === site.id).length +
      state.tankReadings.filter((r) => r.siteId === site.id).length +
      state.usageReadings.filter((r) => r.siteId === site.id).length;
    const openCases = state.investigations.filter((i) => i.siteId === site.id && i.status !== "resolved").length;
    const anomalies = detectAnomalies(state, site.id, configFor(state, site.id));
    const openAnomalies = anomalies.filter((a) => !isDismissed(state, a)).length;
    const deliveriesTotal = state.deliveries
      .filter((d) => d.siteId === site.id && d.status === "posted")
      .reduce((a, d) => a + d.quantityLiters, 0);

    let measured = 0;
    let total = 0;
    if (run) {
      for (const inp of run.inputs) {
        if (inp.status === "voided") continue;
        total += 1;
        if (inp.quality === "measured") measured += 1;
      }
    }
    const measuredPct = total === 0 ? 0 : Math.round((measured / total) * 100);

    const missingFields = run?.completeness.missingFields.length ?? 0;
    const boundsKnown = Boolean(run?.boundsLiters);
    const comparisonReliable =
      Boolean(run) && run!.status !== "incomplete" && run!.status !== "invalid" && boundsKnown;
    let reliabilityNote = "complete inputs — comparable";
    if (!run) reliabilityNote = "no reconciliation run yet";
    else if (run.status === "incomplete") reliabilityNote = "incomplete: " + missingFields + " reading(s) missing";
    else if (run.status === "invalid") reliabilityNote = "invalid records — fix before comparing";
    else if (!boundsKnown) reliabilityNote = "uncertainty not quantified — residual is provisional";

    return {
      siteId: site.id,
      name: site.name,
      isDemo: site.isDemo,
      periodLabel: fmtDay(period.start) + " → " + fmtDay(period.end),
      runStatus: run?.status ?? null,
      residualLiters: run?.residualLiters ?? null,
      boundsKnown,
      missingFields,
      openCases,
      openAnomalies,
      recordsCount,
      deliveriesTotal,
      usageLiters: run?.usageLiters ?? null,
      measuredPct,
      comparisonReliable,
      reliabilityNote,
    };
  });
}

export interface MultiSiteTotals {
  sites: number;
  withDiscrepancy: number;
  withIncomplete: number;
  openCases: number;
  openAnomalies: number;
  records: number;
  reliableCount: number;
}

export function totals(rows: SiteRow[]): MultiSiteTotals {
  return {
    sites: rows.length,
    withDiscrepancy: rows.filter((r) => r.runStatus === "discrepancy").length,
    withIncomplete: rows.filter((r) => r.runStatus === "incomplete").length,
    openCases: rows.reduce((a, r) => a + r.openCases, 0),
    openAnomalies: rows.reduce((a, r) => a + r.openAnomalies, 0),
    records: rows.reduce((a, r) => a + r.recordsCount, 0),
    reliableCount: rows.filter((r) => r.comparisonReliable).length,
  };
}

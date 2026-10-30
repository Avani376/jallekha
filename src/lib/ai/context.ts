/**
 * Deterministic workspace snapshot for grounded Q&A. Everything the model is
 * told comes from persisted records — it is never allowed to invent records,
 * and any number it states must exist in this snapshot.
 */

import type { WorkspaceState } from "@/domain/types";
import { activeRunFor, periodFor } from "@/data/store";
import { formatLiters } from "@/domain/units";
import { istDate } from "@/lib/datetime";

export function buildWorkspaceContext(state: WorkspaceState, siteId: string, maxChars = 4200): string {
  const site = state.sites.find((s) => s.id === siteId);
  if (!site) return "WORKSPACE: empty (no site yet).";

  const tank = state.tanks.find((t) => t.siteId === siteId);
  const meter = state.meters.find((m) => m.siteId === siteId);
  const period = periodFor(state, siteId);
  const run = activeRunFor(state, siteId);
  const lines: string[] = [];

  lines.push(`SITE: ${site.name} (id ${site.id}), timezone ${site.timezone}, mode=${site.isDemo ? "demo" : "user records"}`);
  if (tank) lines.push(`TANK: ${tank.name} (id ${tank.id}), capacity ${tank.capacityLiters} L, ${tank.readingMethodNote ?? "method unstated"}`);
  if (meter) lines.push(`METER: ${meter.name} (id ${meter.id}), boundary: ${meter.boundaryDescription}, unit ${meter.unit}, cumulative`);
  lines.push(`PERIOD: ${istDate(period.start)} to ${istDate(period.end)} IST (${period.start} to ${period.end} UTC)`);

  if (run) {
    lines.push(
      `ACTIVE RUN: status=${run.status}; residual=${run.residualLiters === null ? "unavailable" : run.residualLiters + " L"}; ` +
      `bounds=${run.boundsLiters ? `[${run.boundsLiters.min}, ${run.boundsLiters.max}] L` : "not quantified"}; ` +
      `opening=${run.openingLiters === null ? "missing" : run.openingLiters + " L"}; deliveries=${run.deliveriesTotalLiters} L across ${run.deliveriesIncludedCount} posted; ` +
      `usage=${run.usageLiters === null ? "unavailable" : run.usageLiters + " L"}; closing=${run.closingLiters === null ? "missing" : run.closingLiters + " L"}; rule=${run.ruleVersion}`,
    );
    if (run.completeness.missingFields.length > 0) {
      lines.push(`MISSING FIELDS: ${run.completeness.missingFields.join(", ")}`);
    }
    if (run.invalidReasons.length > 0) {
      lines.push(`BLOCKING PROBLEMS: ${run.invalidReasons.join(" | ")}`);
    }
    lines.push(`SCOPE: ${run.scopeAssumption}`);
    for (const f of run.findings) {
      lines.push(`FINDING: ${f.type} — ${f.title} (sources: ${f.sourceIds.join(", ") || "balance itself"})`);
    }
  } else {
    lines.push("ACTIVE RUN: none yet.");
  }

  const posted = state.deliveries
    .filter((d) => d.siteId === siteId)
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
    .slice(0, 10);
  if (posted.length > 0) {
    lines.push("RECENT DELIVERIES (newest first):");
    for (const d0 of posted) {
      lines.push(
        `  ${d0.id}: receipt ${d0.receiptNumber ?? "none"}, ${d0.quantityLiters} L from ${d0.supplierLabel}, ${istDate(d0.deliveredAt)} IST, status ${d0.status}${d0.status === "voided" ? ` (${d0.voidReason ?? "no reason recorded"})` : ""}`,
      );
    }
  } else {
    lines.push("RECENT DELIVERIES: none recorded.");
  }

  const readings = state.tankReadings.filter((r) => r.siteId === siteId);
  const usages = state.usageReadings.filter((u) => u.siteId === siteId);
  lines.push(`READINGS: ${readings.length} tank stock, ${usages.length} cumulative meter values recorded.`);
  const latestStock = readings.slice().sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  if (latestStock) {
    lines.push(
      `LATEST STOCK: ${latestStock.stockLiters} L at ${istDate(latestStock.observedAt)} IST (${latestStock.quality}, ${latestStock.method})`,
    );
  }
  const sortedUsage = usages.slice().sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  if (sortedUsage.length >= 2) {
    const last = sortedUsage[sortedUsage.length - 1];
    const prev = sortedUsage[sortedUsage.length - 2];
    const delta = Math.round(last.cumulativeLiters - prev.cumulativeLiters);
    lines.push(
      `LATEST METER INTERVAL: ${delta >= 0 ? delta : "NEGATIVE (" + delta + ")"} L between ${istDate(prev.observedAt)} and ${istDate(last.observedAt)} IST`,
    );
  }

  const openCases = state.investigations.filter((i) => i.siteId === siteId && i.status !== "resolved");
  if (openCases.length > 0) {
    lines.push("OPEN CASES:");
    for (const i of openCases) {
      lines.push(`  ${i.id}: [${i.status}] ${i.title} (assignee ${i.assignee ?? "unassigned"})`);
    }
  } else {
    lines.push("OPEN CASES: none.");
  }

  const totalRuns = state.runs.filter((r) => r.siteId === siteId).length;
  lines.push(`SAVED RUNS: ${totalRuns} (superseded runs preserved)`);

  const text = lines.join("\n");
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

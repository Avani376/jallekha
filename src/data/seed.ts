/**
 * Synthetic demo workspace (fixtures v1). Every site, supplier, receipt and
 * person here is labeled synthetic. The four sites are the guided-demo
 * signature cases: A baseline, B duplicate receipt, C missing reading,
 * D unexplained residual.
 */

import type {
  Delivery,
  Investigation,
  Meter,
  ReconciliationResult,
  Site,
  Tank,
  TankReading,
  UsageReading,
  WorkspaceState,
} from "@/domain/types";
import { reconcile } from "@/domain/balance";
import { PERIOD_END, PERIOD_START } from "../../fixtures/synthetic/scenarios";

const SEED_AT = "2026-10-31T04:00:00.000Z";

const ACTIONABLE_FINDING_TYPES = new Set([
  "duplicate-candidate",
  "missing-reading",
  "balance-outside-uncertainty",
]);

function sortIds(ids: string[]): string {
  return ids.slice().sort().join("|");
}

/** Shared rule: open one investigation per actionable finding (idempotent). */
export function investigationsForRuns(
  runs: ReconciliationResult[],
  existing: Investigation[],
): Investigation[] {
  const out = [...existing];
  for (const run of runs) {
    for (const f of run.findings) {
      if (!ACTIONABLE_FINDING_TYPES.has(f.type)) continue;
      const exists = out.some(
        (i) =>
          i.siteId === run.siteId && i.findingType === f.type &&
          sortIds(i.sourceIds) === sortIds(f.sourceIds) && i.status !== "resolved",
      );
      if (exists) continue;
      out.push({
        id: `inv-seed-${run.siteId}-${f.type}-${sortIds(f.sourceIds).replace(/\W+/g, "-").slice(0, 40)}`,
        siteId: run.siteId,
        findingType: f.type,
        title: f.title,
        detail: f.detail,
        sourceIds: f.sourceIds,
        suggestedAction: f.suggestedAction,
        assignee: f.type === "missing-reading" ? "data-entry@demo (synthetic)" : null,
        status: "open",
        evidenceNotes: [],
        resolution: null,
        createdAt: run.generatedAt,
        updatedAt: run.generatedAt,
      });
    }
  }
  return out;
}

interface SiteSpec {
  site: Site;
  tank: Tank;
  meter: Meter;
  deliveries: Delivery[];
  tankReadings: TankReading[];
  usageReadings: UsageReading[];
  scenario: "A" | "B" | "C" | "D";
  scenarioLabel: string;
  period?: { start: string; end: string };
}

function d(p: Partial<Delivery> & { id: string; deliveredAt: string; quantityLiters: number }): Delivery {
  return {
    siteId: p.siteId!,
    tankId: p.tankId!,
    supplierLabel: "BlueWave Tankers",
    receiptNumber: null,
    sourceQuantity: p.quantityLiters,
    sourceUnit: "L",
    quality: "measured",
    uncertaintyLiters: 100,
    status: "posted",
    createdBy: "operator@demo (synthetic)",
    createdAt: SEED_AT,
    version: 1,
    ...p,
  } as Delivery;
}

function tr(p: Partial<TankReading> & { id: string; observedAt: string; stockLiters: number }): TankReading {
  return {
    siteId: p.siteId!,
    tankId: p.tankId!,
    method: "dipstick",
    quality: "measured",
    uncertaintyLiters: 100,
    createdBy: "operator@demo (synthetic)",
    createdAt: SEED_AT,
    ...p,
  } as TankReading;
}

function ur(p: Partial<UsageReading> & { id: string; observedAt: string; cumulativeLiters: number }): UsageReading {
  return {
    siteId: p.siteId!,
    meterId: p.meterId!,
    sourceValue: p.cumulativeLiters,
    sourceUnit: "L",
    quality: "measured",
    uncertaintyLiters: 100,
    createdBy: "operator@demo (synthetic)",
    createdAt: SEED_AT,
    ...p,
  } as UsageReading;
}

export function buildSiteSpecs(): SiteSpec[] {
  const A: SiteSpec = {
    scenario: "A",
    scenarioLabel: "Complete baseline",
    site: {
      id: "site-sunrise",
      name: "Sunrise Campus (Synthetic)",
      timezone: "Asia/Kolkata",
      description: "Guided demo, Scenario A: one clean day with complete records.",
      isDemo: true,
    },
    tank: { id: "tank-T01", siteId: "site-sunrise", name: "T-01 Overhead Tank", capacityLiters: 20000, readingMethodNote: "Dipstick; opening +/-100 L, closing +/-200 L declared" },
    meter: { id: "meter-M01", siteId: "site-sunrise", name: "M-01 Main Outflow", boundaryDescription: "All measured outflow from T-01 (hostel wash + kitchen lines)", unit: "L", type: "cumulative" },
    deliveries: [
      d({ id: "dlv-A1", siteId: "site-sunrise", tankId: "tank-T01", receiptNumber: "R-101", deliveredAt: "2026-10-28T09:00:00.000Z", quantityLiters: 5000, sourceReference: "Physical receipt R-101 (synthetic)" }),
    ],
    tankReadings: [
      tr({ id: "tr-A-open", siteId: "site-sunrise", tankId: "tank-T01", observedAt: PERIOD_START, stockLiters: 10000, uncertaintyLiters: 100 }),
      tr({ id: "tr-A-close", siteId: "site-sunrise", tankId: "tank-T01", observedAt: PERIOD_END, stockLiters: 11000, uncertaintyLiters: 200 }),
    ],
    usageReadings: [
      ur({ id: "ur-A-start", siteId: "site-sunrise", meterId: "meter-M01", observedAt: PERIOD_START, cumulativeLiters: 100000 }),
      ur({ id: "ur-A-end", siteId: "site-sunrise", meterId: "meter-M01", observedAt: PERIOD_END, cumulativeLiters: 104000 }),
    ],
  };

  // Scenario B: same baseline + a duplicate of receipt R-101 already POSTED
  // from a legacy ledger import (distinct record id).
  const B: SiteSpec = {
    scenario: "B",
    scenarioLabel: "Legacy ledger week (duplicate receipt present)",
    site: {
      id: "site-legacy",
      name: "Sunrise Campus — Legacy Ledger Week (Synthetic)",
      timezone: "Asia/Kolkata",
      description: "Guided demo, Scenario B: a duplicate delivery record entered from the old spreadsheet.",
      isDemo: true,
    },
    tank: { id: "tank-LT01", siteId: "site-legacy", name: "LT-01 Overhead Tank", capacityLiters: 20000, readingMethodNote: "Dipstick; opening +/-100 L, closing +/-200 L declared" },
    meter: { id: "meter-LM01", siteId: "site-legacy", name: "LM-01 Main Outflow", boundaryDescription: "All measured outflow from LT-01", unit: "L", type: "cumulative" },
    deliveries: [
      d({ id: "dlv-B1", siteId: "site-legacy", tankId: "tank-LT01", receiptNumber: "R-101", deliveredAt: "2026-10-28T09:00:00.000Z", quantityLiters: 5000, sourceReference: "Physical receipt R-101 (synthetic)" }),
      d({
        id: "dlv-B2-dup", siteId: "site-legacy", tankId: "tank-LT01", receiptNumber: "R-101",
        deliveredAt: "2026-10-28T10:15:00.000Z", quantityLiters: 5000,
        sourceReference: "Legacy ledger week import (synthetic)",
        note: "Entered from the old spreadsheet; the receipt photo shows one load.",
      }),
    ],
    tankReadings: [
      tr({ id: "tr-B-open", siteId: "site-legacy", tankId: "tank-LT01", observedAt: PERIOD_START, stockLiters: 10000, uncertaintyLiters: 100 }),
      tr({ id: "tr-B-close", siteId: "site-legacy", tankId: "tank-LT01", observedAt: PERIOD_END, stockLiters: 11000, uncertaintyLiters: 200 }),
    ],
    usageReadings: [
      ur({ id: "ur-B-start", siteId: "site-legacy", meterId: "meter-LM01", observedAt: PERIOD_START, cumulativeLiters: 100000 }),
      ur({ id: "ur-B-end", siteId: "site-legacy", meterId: "meter-LM01", observedAt: PERIOD_END, cumulativeLiters: 104000 }),
    ],
  };

  // Scenario C: closing reading missing.
  const C: SiteSpec = {
    scenario: "C",
    scenarioLabel: "Missing closing reading",
    site: {
      id: "site-hostel",
      name: "Lake View Hostel (Synthetic)",
      timezone: "Asia/Kolkata",
      description: "Guided demo, Scenario C: the closing dipstick reading was never recorded.",
      isDemo: true,
    },
    tank: { id: "tank-HT01", siteId: "site-hostel", name: "HT-01 Overhead Tank", capacityLiters: 20000, readingMethodNote: "Dipstick; opening +/-100 L, closing +/-200 L declared" },
    meter: { id: "meter-HM01", siteId: "site-hostel", name: "HM-01 Main Outflow", boundaryDescription: "All measured outflow from HT-01", unit: "L", type: "cumulative" },
    deliveries: [
      d({ id: "dlv-C1", siteId: "site-hostel", tankId: "tank-HT01", supplierLabel: "AquaServe Services", receiptNumber: "R-201", deliveredAt: "2026-10-28T09:00:00.000Z", quantityLiters: 5000 }),
    ],
    tankReadings: [
      tr({ id: "tr-C-open", siteId: "site-hostel", tankId: "tank-HT01", observedAt: PERIOD_START, stockLiters: 10000, uncertaintyLiters: 100 }),
    ],
    usageReadings: [
      ur({ id: "ur-C-start", siteId: "site-hostel", meterId: "meter-HM01", observedAt: PERIOD_START, cumulativeLiters: 50000 }),
      ur({ id: "ur-C-end", siteId: "site-hostel", meterId: "meter-HM01", observedAt: PERIOD_END, cumulativeLiters: 54000 }),
    ],
  };

  // Scenario D: complete data, residual +2,000 L outside uncertainty.
  const D: SiteSpec = {
    scenario: "D",
    scenarioLabel: "Unexplained residual (complete data)",
    site: {
      id: "site-hillcrest",
      name: "Hillcrest Academy (Synthetic)",
      timezone: "Asia/Kolkata",
      description: "Guided demo, Scenario D: complete inputs, residual outside uncertainty, cause NOT determined.",
      isDemo: true,
    },
    tank: { id: "tank-NT01", siteId: "site-hillcrest", name: "NT-01 Overhead Tank", capacityLiters: 20000, readingMethodNote: "Dipstick; opening +/-100 L, closing +/-200 L declared" },
    meter: { id: "meter-NM01", siteId: "site-hillcrest", name: "NM-01 Main Outflow", boundaryDescription: "All measured outflow from NT-01", unit: "L", type: "cumulative" },
    deliveries: [
      d({ id: "dlv-D1", siteId: "site-hillcrest", tankId: "tank-NT01", supplierLabel: "Hillcrest Water Supply", receiptNumber: "R-301", deliveredAt: "2026-10-28T09:00:00.000Z", quantityLiters: 5000 }),
    ],
    tankReadings: [
      tr({ id: "tr-D-open", siteId: "site-hillcrest", tankId: "tank-NT01", observedAt: PERIOD_START, stockLiters: 10000, uncertaintyLiters: 100 }),
      tr({ id: "tr-D-close", siteId: "site-hillcrest", tankId: "tank-NT01", observedAt: PERIOD_END, stockLiters: 9000, uncertaintyLiters: 200 }),
    ],
    usageReadings: [
      ur({ id: "ur-D-start", siteId: "site-hillcrest", meterId: "meter-NM01", observedAt: PERIOD_START, cumulativeLiters: 200000 }),
      ur({ id: "ur-D-end", siteId: "site-hillcrest", meterId: "meter-NM01", observedAt: PERIOD_END, cumulativeLiters: 204000 }),
    ],
  };

  return [A, B, C, D, buildRiversideSpec()];
}

export function buildEmptyWorkspace(): WorkspaceState {
  return {
    schemaVersion: 1,
    periods: {},
    sites: [],
    tanks: [],
    meters: [],
    deliveries: [],
    tankReadings: [],
    usageReadings: [],
    runs: [],
    investigations: [],
    auditEvents: [],
    importBatches: [],
  };
}

/**
 * A two-week synthetic history (Oct 16–30) used by the Dashboard: daily
 * stock readings, daily cumulative meter values, eight deliveries, and one
 * estimated-quality reading. Its reconciliation period is the last day.
 */
function buildRiversideSpec(): SiteSpec {
  const siteId = "site-riverside";
  const tankId = "tank-RV01";
  const meterId = "meter-RVM01";
  const days = 14; // Oct 17 .. Oct 30 (08:00 IST each day)
  const startDayUTC = Date.UTC(2026, 9, 17, 2, 30); // 08:00 IST

  const tankReadings: TankReading[] = [];
  const usageReadings: UsageReading[] = [];
  const deliveries: Delivery[] = [];
  let cumulative = 412_000;
  let stock = 11_000;

  for (let di = 0; di < days; di += 1) {
    const t = startDayUTC + di * 86_400_000;
    const observedAt = new Date(t).toISOString();
    const day = di + 1;
    // alternate-morning tanker loads (10,000 L); the day-14 load falls inside
    // the reconciliation period
    if (day % 2 === 0) {
      const qty = 10000;
      deliveries.push(
        d({
          id: `dlv-RV-${day}`,
          siteId, tankId,
          supplierLabel: day % 4 === 0 ? "AquaServe Services" : "BlueWave Tankers",
          receiptNumber: `R-5${String(day).padStart(2, "0")}`,
          deliveredAt: new Date(t - 3.5 * 3600_000).toISOString(),
          quantityLiters: qty,
          sourceReference: "Physical receipt (synthetic)",
        }),
      );
      stock += qty;
    }
    const usage = 4300 + ((day * 517) % 700); // ~4.3k–5.0k deterministic variety
    stock -= usage;
    const estimated = day === 9;
    tankReadings.push(
      tr({
        id: `tr-RV-d${day}`,
        siteId, tankId,
        observedAt,
        stockLiters: stock,
        uncertaintyLiters: estimated ? 400 : 150,
        quality: estimated ? "estimated" : "measured",
        method: estimated ? "supplier statement" : "dipstick",
      }),
    );
    cumulative += usage;
    usageReadings.push(
      ur({
        id: `ur-RV-d${day}`,
        siteId, meterId,
        observedAt,
        cumulativeLiters: cumulative,
        uncertaintyLiters: 100,
      }),
    );
  }

  // Reconcile the last COMPLETE day pair (readings exist at both ends).
  const periodStart = new Date(startDayUTC + (days - 2) * 86_400_000).toISOString();
  const periodEnd = new Date(startDayUTC + (days - 1) * 86_400_000).toISOString();

  return {
    scenario: "A",
    scenarioLabel: "Two-week operating history",
    site: {
      id: siteId,
      name: "Riverside Apartments — 14-Day History (Synthetic)",
      timezone: "Asia/Kolkata",
      description: "Richer synthetic history feeding the Dashboard charts.",
      isDemo: true,
    },
    tank: { id: tankId, siteId, name: "RV-01 Sump + Terrace", capacityLiters: 20000, readingMethodNote: "Daily dipstick; one supplier-statement estimate" },
    meter: { id: meterId, siteId, name: "RVM-01 Outlet", boundaryDescription: "All measured outflow from RV-01", unit: "L", type: "cumulative" },
    deliveries,
    tankReadings,
    usageReadings,
    period: { start: periodStart, end: periodEnd },
  };
}

export function buildSeedWorkspace(): WorkspaceState {
  const specs = buildSiteSpecs();
  const deliveries = specs.flatMap((s) => s.deliveries);
  const tankReadings = specs.flatMap((s) => s.tankReadings);
  const usageReadings = specs.flatMap((s) => s.usageReadings);
  const tanks = specs.map((s) => s.tank);
  const meters = specs.map((s) => s.meter);

  // Initial runs are computed deterministically at seed time so no screen is
  // ever empty; later recomputation supersedes these runs, never mutates them.
  // Each run receives ONLY its own site's records — cross-site records are
  // rejected by the engine by design. Sites may carry their own period
  // (Riverside reconciles its last day); the demo default covers the rest.
  const runs: ReconciliationResult[] = specs.map((s) => {
    const period = s.period ?? { start: PERIOD_START, end: PERIOD_END };
    return reconcile({
      siteId: s.site.id,
      tankId: s.tank.id,
      meterId: s.meter.id,
      periodStart: period.start,
      periodEnd: period.end,
      deliveries: deliveries.filter((d) => d.siteId === s.site.id),
      tankReadings: tankReadings.filter((t) => t.siteId === s.site.id),
      usageReadings: usageReadings.filter((u) => u.siteId === s.site.id),
      tanks,
      meters,
      generatedAt: SEED_AT,
      runId: `run-seed-${s.site.id}`,
    });
  });

  return {
    schemaVersion: 1,
    periods: Object.fromEntries(
      specs.filter((s) => s.period).map((s) => [s.site.id, s.period!]),
    ),
    sites: specs.map((s) => s.site),
    tanks,
    meters,
    deliveries,
    tankReadings,
    usageReadings,
    runs,
    investigations: investigationsForRuns(runs, []),
    auditEvents: [],
    importBatches: [],
  };
}

export const DEMO_PERIOD = { start: PERIOD_START, end: PERIOD_END };

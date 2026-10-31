/**
 * Signature synthetic fixtures, versioned v1.
 * All sites, suppliers, receipts, people and notes are SYNTHETIC.
 *
 * Uncertainty declarations (operational assumption, fixture-level):
 *   opening stock +/-100 L, each delivery +/-100 L, each cumulative meter
 *   reading +/-100 L (so metered usage carries +/-200 L), closing stock +/-200 L.
 *
 * Expected outcomes (conservative bounds, recon-v1.0):
 *   A Baseline:      R = 0       bounds [-600, +600]     within uncertainty
 *   B Duplicate:     R = +5,000  bounds [4,300, 5,700]   discrepancy -> after
 *                    reviewed void of the duplicate: R = 0, [-600, +600]
 *   C Missing read:  residual unavailable (incomplete); after closing reading
 *                    11,000 L recorded: R = 0, [-600, +600]
 *   D Unexplained:   R = +2,000  bounds [1,400, 2,600]   cause NOT determined
 */

import { reconcile, RECONCILIATION_RULE_VERSION } from "../../src/domain/balance";
import type {
  Delivery,
  Meter,
  ReconciliationResult,
  Site,
  Tank,
  TankReading,
  UsageReading,
} from "../../src/domain/types";

export const FIXTURE_VERSION = "fixtures-v1";

/** 28 Oct 2026 08:00 IST -> 29 Oct 2026 08:00 IST, stored in UTC. */
export const PERIOD_START = "2026-10-28T02:30:00.000Z";
export const PERIOD_END = "2026-10-29T02:30:00.000Z";

export const GENERATED_AT = "2026-10-31T04:00:00.000Z"; // deterministic runs

export const SITE_A_ID = "site-sunrise";
export const TANK_A_ID = "tank-T01";
export const METER_A_ID = "meter-M01";

export function makeSiteA(): Site {
  return {
    id: SITE_A_ID,
    name: "Sunrise Campus (Synthetic Demo)",
    timezone: "Asia/Kolkata",
    description: "Synthetic demo site: academic block + hostel, one 20,000 L tank.",
    isDemo: true,
  };
}

export function makeTankA(): Tank {
  return {
    id: TANK_A_ID,
    siteId: SITE_A_ID,
    name: "T-01 Overhead Tank",
    capacityLiters: 20000,
    readingMethodNote: "Dipstick calibrated in cm; uncertainty +/-100 L stock, +/-200 L end-of-day",
  };
}

export function makeMeterA(): Meter {
  return {
    id: METER_A_ID,
    siteId: SITE_A_ID,
    name: "M-01 Main Outflow",
    boundaryDescription: "All measured outflow from T-01 (hostel wash + kitchen lines)",
    unit: "L",
    type: "cumulative",
  };
}

const ACTOR = "demo-seed";

export function mkDelivery(partial: Partial<Delivery> & { id: string; quantityLiters: number; deliveredAt: string }): Delivery {
  return {
    siteId: SITE_A_ID,
    tankId: TANK_A_ID,
    supplierLabel: "BlueWave Tankers",
    receiptNumber: null,
    sourceQuantity: partial.quantityLiters,
    sourceUnit: "L",
    quality: "measured",
    uncertaintyLiters: 100,
    status: "posted",
    createdBy: ACTOR,
    createdAt: GENERATED_AT,
    version: 1,
    ...partial,
  };
}

export function mkReading(partial: Partial<TankReading> & { id: string; observedAt: string; stockLiters: number }): TankReading {
  return {
    siteId: SITE_A_ID,
    tankId: TANK_A_ID,
    method: "dipstick",
    quality: "measured",
    uncertaintyLiters: 100,
    createdBy: ACTOR,
    createdAt: GENERATED_AT,
    ...partial,
  };
}

export function mkUsage(partial: Partial<UsageReading> & { id: string; observedAt: string; cumulativeLiters: number }): UsageReading {
  return {
    siteId: SITE_A_ID,
    meterId: METER_A_ID,
    sourceValue: partial.cumulativeLiters,
    sourceUnit: "L",
    quality: "measured",
    uncertaintyLiters: 100,
    createdBy: ACTOR,
    createdAt: GENERATED_AT,
    ...partial,
  };
}

function baseInputs(deliveries: Delivery[], readings: TankReading[], usage: UsageReading[]) {
  return {
    siteId: SITE_A_ID,
    tankId: TANK_A_ID,
    meterId: METER_A_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    deliveries,
    tankReadings: readings,
    usageReadings: usage,
    tanks: [makeTankA()],
    meters: [makeMeterA()],
    generatedAt: GENERATED_AT,
  };
}

/** Scenario A - complete baseline: O 10,000 + D 5,000 - U 4,000 - C 11,000. */
export function scenarioA() {
  const deliveries = [
    mkDelivery({
      id: "dlv-A1",
      receiptNumber: "R-101",
      deliveredAt: "2026-10-28T09:00:00.000Z", // 14:30 IST, inside period
      quantityLiters: 5000,
      sourceReference: "Physical receipt R-101 (synthetic)",
    }),
  ];
  const readings = [
    mkReading({ id: "tr-A-open", observedAt: PERIOD_START, stockLiters: 10000, uncertaintyLiters: 100 }),
    mkReading({ id: "tr-A-close", observedAt: PERIOD_END, stockLiters: 11000, uncertaintyLiters: 200 }),
  ];
  const usage = [
    mkUsage({ id: "ur-A-start", observedAt: PERIOD_START, cumulativeLiters: 100000 }),
    mkUsage({ id: "ur-A-end", observedAt: PERIOD_END, cumulativeLiters: 104000 }),
  ];
  const result = reconcile(baseInputs(deliveries, readings, usage));
  return { deliveries, readings, usage, result };
}

/**
 * Scenario B - legacy ledger already contains a duplicate of receipt R-101:
 * distinct record id, same receipt + volume, POSTED. Raw residual +5,000.
 */
export function scenarioB() {
  const a = scenarioA();
  const duplicate = mkDelivery({
    id: "dlv-A2-dup",
    receiptNumber: "R-101",
    deliveredAt: "2026-10-28T10:15:00.000Z", // 15:45 IST, same day re-entry
    quantityLiters: 5000,
    sourceReference: "Legacy ledger week import (synthetic)",
    note: "Entered from the old spreadsheet; receipt photo shows one load.",
  });
  const deliveries = [...a.deliveries, duplicate];
  const result = reconcile(baseInputs(deliveries, a.readings, a.usage));
  return { ...a, deliveries, duplicate, result };
}

/** Scenario B after a reviewer voids the duplicate with a reason. */
export function scenarioBAfterVoid() {
  const b = scenarioB();
  const voided = { ...b.duplicate, status: "voided" as const, voidReason: "Duplicate of receipt R-101 confirmed against the physical receipt; same load entered twice from the legacy ledger.", voidedBy: "reviewer@demo", voidedAt: GENERATED_AT };
  const deliveries = [b.deliveries[0], voided];
  const result = reconcile(baseInputs(deliveries, b.readings, b.usage));
  return { ...b, deliveries, duplicate: voided, result };
}

/** Scenario C - opening, delivery and meter usage present; closing missing. */
export function scenarioC() {
  const deliveries = [
    mkDelivery({
      id: "dlv-C1",
      receiptNumber: "R-201",
      deliveredAt: "2026-10-28T09:00:00.000Z",
      quantityLiters: 5000,
      supplierLabel: "AquaServe Services",
    }),
  ];
  const readings = [
    mkReading({ id: "tr-C-open", observedAt: PERIOD_START, stockLiters: 10000 }),
    // closing reading intentionally absent
  ];
  const usage = [
    mkUsage({ id: "ur-C-start", observedAt: PERIOD_START, cumulativeLiters: 50000 }),
    mkUsage({ id: "ur-C-end", observedAt: PERIOD_END, cumulativeLiters: 54000 }),
  ];
  const result = reconcile(baseInputs(deliveries, readings, usage));
  return { deliveries, readings, usage, result };
}

/** Scenario C after the operator records the closing reading (11,000 L). */
export function scenarioCAfterReading() {
  const c = scenarioC();
  const readings = [
    ...c.readings,
    mkReading({ id: "tr-C-close", observedAt: PERIOD_END, stockLiters: 11000, uncertaintyLiters: 200, createdBy: "operator@demo" }),
  ];
  const result = reconcile(baseInputs(c.deliveries, readings, c.usage));
  return { ...c, readings, result };
}

/** Scenario D - complete data, unexplained residual of +2,000 L. */
export function scenarioD() {
  const deliveries = [
    mkDelivery({
      id: "dlv-D1",
      receiptNumber: "R-301",
      deliveredAt: "2026-10-28T09:00:00.000Z",
      quantityLiters: 5000,
      supplierLabel: "Hillcrest Water Supply",
    }),
  ];
  const readings = [
    mkReading({ id: "tr-D-open", observedAt: PERIOD_START, stockLiters: 10000 }),
    mkReading({ id: "tr-D-close", observedAt: PERIOD_END, stockLiters: 9000, uncertaintyLiters: 200 }),
  ];
  const usage = [
    mkUsage({ id: "ur-D-start", observedAt: PERIOD_START, cumulativeLiters: 200000 }),
    mkUsage({ id: "ur-D-end", observedAt: PERIOD_END, cumulativeLiters: 204000 }),
  ];
  const result = reconcile(baseInputs(deliveries, readings, usage));
  return { deliveries, readings, usage, result };
}

export interface ExpectedOutcome {
  status: ReconciliationResult["status"];
  residual: number | null;
  bounds: { min: number; max: number } | null;
  usage?: number;
}

/** Ground-truth table used by tests, the demo QA panel and VALIDATION.md. */
export const EXPECTED: Record<string, ExpectedOutcome> = {
  A: { status: "within-uncertainty", residual: 0, bounds: { min: -600, max: 600 }, usage: 4000 },
  B: { status: "discrepancy", residual: 5000, bounds: { min: 4300, max: 5700 } },
  "B-voided": { status: "within-uncertainty", residual: 0, bounds: { min: -600, max: 600 }, usage: 4000 },
  C: { status: "incomplete", residual: null, bounds: null },
  "C-completed": { status: "within-uncertainty", residual: 0, bounds: { min: -600, max: 600 }, usage: 4000 },
  D: { status: "discrepancy", residual: 2000, bounds: { min: 1400, max: 2600 } },
};

export const RULE_VERSION = RECONCILIATION_RULE_VERSION;

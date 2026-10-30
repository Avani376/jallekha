import { describe, expect, it } from "vitest";
import { reconcile, RECONCILIATION_RULE_VERSION } from "../../src/domain/balance";
import {
  EXPECTED,
  mkDelivery,
  mkReading,
  mkUsage,
  METER_A_ID,
  PERIOD_END,
  PERIOD_START,
  scenarioA,
  scenarioB,
  scenarioBAfterVoid,
  scenarioC,
  scenarioCAfterReading,
  scenarioD,
  SITE_A_ID,
  TANK_A_ID,
  makeTankA,
} from "../../fixtures/synthetic/scenarios";

function baseInputs(over: Partial<Parameters<typeof reconcile>[0]>) {
  return {
    siteId: SITE_A_ID,
    tankId: TANK_A_ID,
    meterId: METER_A_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    deliveries: [],
    tankReadings: [],
    usageReadings: [],
    tanks: [makeTankA()],
    meters: [
      {
        id: METER_A_ID,
        siteId: SITE_A_ID,
        name: "M-01 Main Outflow",
        boundaryDescription: "All measured outflow from T-01",
        unit: "L" as const,
        type: "cumulative" as const,
      },
    ],
    generatedAt: "2026-10-31T04:00:00.000Z",
    ...over,
  };
}

describe("reconciliation engine - signature scenarios", () => {
  it("Scenario A: baseline residual 0 within [-600,+600], usage 4,000", () => {
    const { result } = scenarioA();
    expect(result.status).toBe(EXPECTED.A.status);
    expect(result.residualLiters).toBe(EXPECTED.A.residual);
    expect(result.boundsLiters).toEqual(EXPECTED.A.bounds);
    expect(result.usageLiters).toBe(EXPECTED.A.usage);
    expect(result.uncertaintyQuantified).toBe(true);
    expect(result.deliveriesTotalLiters).toBe(5000);
    expect(result.ruleVersion).toBe(RECONCILIATION_RULE_VERSION);
  });

  it("Scenario B: legacy duplicate yields +5,000 within [4,300,5,700] plus a duplicate-candidate finding linked to both rows", () => {
    const { result } = scenarioB();
    expect(result.status).toBe(EXPECTED.B.status);
    expect(result.residualLiters).toBe(EXPECTED.B.residual);
    expect(result.boundsLiters).toEqual(EXPECTED.B.bounds);
    expect(result.deliveriesTotalLiters).toBe(10000); // both posted rows count
    const dup = result.findings.filter((f) => f.type === "duplicate-candidate");
    expect(dup.length).toBe(1);
    expect(dup[0].sourceIds.sort()).toEqual(["dlv-A1", "dlv-A2-dup"]);
    expect(dup[0].matchKind).toBe("exact");
    const discrepancy = result.findings.filter((f) => f.type === "balance-outside-uncertainty");
    expect(discrepancy.length).toBe(1);
    expect(discrepancy[0].detail).toMatch(/not proof/i);
  });

  it("Scenario B after reviewed void: total 5,000, residual 0, duplicate retained in history", () => {
    const { result, duplicate } = scenarioBAfterVoid();
    expect(duplicate.status).toBe("voided");
    expect(duplicate.voidReason).toBeTruthy();
    expect(result.status).toBe(EXPECTED["B-voided"].status);
    expect(result.residualLiters).toBe(0);
    expect(result.boundsLiters).toEqual(EXPECTED["B-voided"].bounds);
    expect(result.deliveriesTotalLiters).toBe(5000);
    expect(result.findings.some((f) => f.type === "duplicate-candidate")).toBe(false);
    // voided record remains visible in provenance
    const voidedProv = result.inputs.find((i) => i.id === "dlv-A2-dup");
    expect(voidedProv?.status).toBe("voided");
  });

  it("Scenario C: missing closing reading -> incomplete, residual unavailable, precise missing field", () => {
    const { result } = scenarioC();
    expect(result.status).toBe(EXPECTED.C.status);
    expect(result.residualLiters).toBeNull();
    expect(result.boundsLiters).toBeNull();
    expect(result.completeness.missingFields).toEqual(["closingStockReading"]);
    expect(result.findings.some((f) => f.type === "missing-reading")).toBe(true);
  });

  it("Scenario C after recording 11,000 L at the boundary: complete run, residual 0", () => {
    const { result } = scenarioCAfterReading();
    expect(result.status).toBe(EXPECTED["C-completed"].status);
    expect(result.residualLiters).toBe(0);
    expect(result.boundsLiters).toEqual(EXPECTED["C-completed"].bounds);
  });

  it("Scenario D: complete data, residual +2,000 within [1,400,2,600], cause not asserted", () => {
    const { result } = scenarioD();
    expect(result.status).toBe(EXPECTED.D.status);
    expect(result.residualLiters).toBe(EXPECTED.D.residual);
    expect(result.boundsLiters).toEqual(EXPECTED.D.bounds);
    const f = result.findings.find((x) => x.type === "balance-outside-uncertainty");
    expect(f).toBeTruthy();
    expect(f!.detail).not.toMatch(/is (proof|caused by)/i);
    expect(f!.suggestedAction).toMatch(/inspection only if/i);
  });
});

describe("reconciliation engine - edge cases", () => {
  it("rejects cross-site deliveries and marks coverage invalid", () => {
    const a = scenarioA();
    const foreign = mkDelivery({
      id: "dlv-X",
      siteId: "site-elsewhere",
      tankId: TANK_A_ID,
      deliveredAt: "2026-10-28T09:00:00.000Z",
      quantityLiters: 1000,
    });
    const r = reconcile(baseInputs({ deliveries: [...a.deliveries, foreign] }));
    expect(r.status).toBe("invalid");
    expect(r.invalidReasons.join(" ")).toMatch(/different site\/tank/);
    expect(r.residualLiters).toBeNull();
  });

  it("rejects a stock reading above tank capacity without clamping", () => {
    const a = scenarioA();
    const over = mkReading({ id: "tr-over", observedAt: PERIOD_END, stockLiters: 25000, uncertaintyLiters: 200 });
    const r = reconcile(baseInputs({
      deliveries: a.deliveries,
      tankReadings: [a.readings[0], over],
      usageReadings: a.usage,
    }));
    expect(r.status).toBe("invalid");
    expect(r.invalidReasons.join(" ")).toMatch(/above the tank capacity/);
  });

  it("treats a negative cumulative meter delta as invalid, never absolute value", () => {
    const a = scenarioA();
    const usage = [
      a.usage[0],
      mkUsage({ id: "ur-end-low", observedAt: PERIOD_END, cumulativeLiters: 98000 }),
    ];
    const r = reconcile(baseInputs({
      deliveries: a.deliveries,
      tankReadings: a.readings,
      usageReadings: usage,
    }));
    expect(r.status).toBe("invalid");
    expect(r.invalidReasons.join(" ")).toMatch(/went backwards/);
  });

  it("detects an ambiguous duplicate boundary reading as blocking", () => {
    const a = scenarioA();
    const extra = mkReading({ id: "tr-open-2", observedAt: PERIOD_START, stockLiters: 10500 });
    const r = reconcile(baseInputs({
      deliveries: a.deliveries,
      tankReadings: [a.readings[0], extra, a.readings[1]],
      usageReadings: a.usage,
    }));
    expect(r.status).toBe("invalid");
    expect(r.invalidReasons.join(" ")).toMatch(/Multiple opening stock readings/);
  });

  it("provisional residual with unknown bounds is labeled, never 'within uncertainty'", () => {
    const a = scenarioA();
    const noBounds = { ...a.deliveries[0], uncertaintyLiters: null, quality: "unknown" as const };
    const r = reconcile(baseInputs({
      deliveries: [noBounds],
      tankReadings: a.readings,
      usageReadings: a.usage,
    }));
    expect(r.status).toBe("complete-unknown-bounds");
    expect(r.residualLiters).toBe(0);
    expect(r.boundsLiters).toBeNull();
    expect(r.uncertaintyQuantified).toBe(false);
    expect(r.findings.some((f) => f.detail.includes("Uncertainty not quantified") || f.title.includes("Uncertainty not quantified"))).toBe(true);
  });

  it("excludes voided deliveries from totals but keeps them in provenance", () => {
    const a = scenarioA();
    const voided = mkDelivery({
      id: "dlv-V", receiptNumber: "R-555",
      deliveredAt: "2026-10-28T11:00:00.000Z", quantityLiters: 700,
      status: "voided", voidReason: "Wrong tank selected; re-entered under T-02.",
    });
    const r = reconcile(baseInputs({
      deliveries: [...a.deliveries, voided],
      tankReadings: a.readings,
      usageReadings: a.usage,
    }));
    expect(r.deliveriesTotalLiters).toBe(5000);
    expect(r.inputs.find((i) => i.id === "dlv-V")?.status).toBe("voided");
  });

  it("counts deliveries in [start,end) and excludes boundary-landing deliveries exactly once", () => {
    const a = scenarioA();
    const atStart = mkDelivery({ id: "dlv-at-start", deliveredAt: PERIOD_START, quantityLiters: 10, receiptNumber: "R-900" });
    const atEnd = mkDelivery({ id: "dlv-at-end", deliveredAt: PERIOD_END, quantityLiters: 20, receiptNumber: "R-901" });
    const r = reconcile(baseInputs({
      deliveries: [...a.deliveries, atStart, atEnd],
      tankReadings: a.readings,
      usageReadings: a.usage,
    }));
    // start inclusive, end exclusive: atStart counted, atEnd NOT counted
    expect(r.deliveriesIncludedCount).toBe(2);
    expect(r.deliveriesTotalLiters).toBe(5010);
  });

  it("makes duplicate checks even when the balance is incomplete", () => {
    const c = scenarioC();
    const dup = mkDelivery({
      id: "dlv-C1-dup", receiptNumber: "R-201",
      deliveredAt: "2026-10-28T10:00:00.000Z", quantityLiters: 5000,
      supplierLabel: "AquaServe Services",
    });
    const r = reconcile(baseInputs({
      deliveries: [...c.deliveries, dup],
      tankReadings: c.readings,
      usageReadings: c.usage,
    }));
    expect(r.status).toBe("incomplete");
    expect(r.findings.some((f) => f.type === "duplicate-candidate")).toBe(true);
    expect(r.findings.some((f) => f.type === "missing-reading")).toBe(true);
  });

  it("missing opening meter value blocks the balance with a precise field", () => {
    const a = scenarioA();
    const r = reconcile(baseInputs({
      deliveries: a.deliveries,
      tankReadings: a.readings,
      usageReadings: [a.usage[1]],
    }));
    expect(r.status).toBe("incomplete");
    expect(r.completeness.missingFields).toContain("meterStartReading");
  });

  it("is deterministic: same inputs produce identical results", () => {
    const a1 = scenarioA();
    const a2 = scenarioA();
    expect(a1.result).toEqual(a2.result);
  });
});

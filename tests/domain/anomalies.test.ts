import { describe, expect, it } from "vitest";
import {
  detectAnomalies,
  detectUsageAnomalies,
  configFor,
  DEFAULT_ANOMALY_CONFIG,
  isDismissed,
  type Anomaly,
} from "../../src/domain/anomalies";
import type { UsageReading, WorkspaceState } from "../../src/domain/types";

const SITE = "site-x";
const METER = "meter-x";

function reading(id: string, hoursAfterStart: number, cum: number, quality = "measured"): UsageReading {
  return {
    id,
    siteId: SITE,
    meterId: METER,
    observedAt: new Date(Date.UTC(2026, 9, 20, 2, 30) + hoursAfterStart * 3600_000).toISOString(),
    sourceValue: cum,
    sourceUnit: "L",
    cumulativeLiters: cum,
    uncertaintyLiters: 100,
    quality: quality as UsageReading["quality"],
    createdBy: "test",
    createdAt: "2026-10-31T00:00:00Z",
  };
}

/** Seven steady days of ~3,000 L, then a variation. */
function steadyHistory(finalLiters: number, finalQuality = "measured"): UsageReading[] {
  const out: UsageReading[] = [];
  let cum = 100_000;
  for (let d = 0; d < 8; d += 1) {
    out.push(reading(`r${d}`, d * 24, Math.round(cum)));
    cum += 3000;
  }
  out.push(reading("r-final", 8 * 24, Math.round(100_000 + 7 * 3000 + finalLiters), finalQuality));
  return out;
}

function stateWith(readings: UsageReading[], runs: WorkspaceState["runs"] = []): WorkspaceState {
  return {
    schemaVersion: 1,
    sites: [], tanks: [], meters: [], deliveries: [],
    tankReadings: [], usageReadings: readings,
    runs, investigations: [], auditEvents: [], importBatches: [],
  };
}

describe("anomaly detection", () => {
  it("flags a consumption spike above the threshold with method and baseline", () => {
    const readings = steadyHistory(3000 * 2); // last interval ~2x baseline
    const r = detectUsageAnomalies({ siteId: SITE, meterId: METER, readings }, DEFAULT_ANOMALY_CONFIG);
    const spike = r.find((a) => a.kind === "consumption-anomaly");
    expect(spike).toBeTruthy();
    expect(spike!.severity).toBe("warning");
    expect(spike!.method).toMatch(/moving average/);
    expect(spike!.explanation).toMatch(/verification prompt, not a conclusion/i);
    expect(spike!.sourceIds.length).toBe(2);
  });

  it("flags a sudden meter jump larger than the median factor", () => {
    const readings = steadyHistory(3000 * 8); // last interval ~3.7x median
    const r = detectUsageAnomalies({ siteId: SITE, meterId: METER, readings }, DEFAULT_ANOMALY_CONFIG);
    expect(r.some((a) => a.kind === "sudden-meter-change")).toBe(true);
  });

  it("stays silent on steady consumption", () => {
    const readings = steadyHistory(3000); // identical intervals
    const r = detectUsageAnomalies({ siteId: SITE, meterId: METER, readings }, DEFAULT_ANOMALY_CONFIG);
    expect(r.filter((a) => a.kind === "consumption-anomaly" || a.kind === "sudden-meter-change")).toHaveLength(0);
  });

  it("reports insufficient history instead of guessing", () => {
    const readings = [reading("a", 0, 100000), reading("b", 24, 103000)];
    const r = detectUsageAnomalies({ siteId: SITE, meterId: METER, readings }, DEFAULT_ANOMALY_CONFIG);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("missing-records");
    expect(r[0].dataComplete).toBe(false);
    expect(r[0].title).toMatch(/not enough history/i);
  });

  it("excludes negative meter intervals from the baseline (never abs-valued)", () => {
    const readings = [
      ...steadyHistory(0).slice(0, 8), // steady through r7
      reading("r8-reset", 8 * 24, 100_000), // meter reset: cumulative goes DOWN
      reading("r9", 9 * 24, 103_000),
    ];
    const r = detectUsageAnomalies({ siteId: SITE, meterId: METER, readings }, DEFAULT_ANOMALY_CONFIG);
    // The reset pair must not create a huge fake spike; steady data = quiet.
    expect(r.filter((a) => a.kind === "sudden-meter-change")).toHaveLength(0);
  });

  it("detects repeated discrepancies only from two or more discrepancy runs", () => {
    const run = (id: string, status: "discrepancy" | "within-uncertainty") => ({
      id, siteId: SITE, tankId: "t", meterId: "m",
      periodStart: PERIOD_START, periodEnd: PERIOD_END, boundaryConvention: "x",
      status, openingLiters: 0, closingLiters: 0, deliveriesTotalLiters: 0,
      deliveriesIncludedCount: 0, usageLiters: 0, residualLiters: 500,
      boundsLiters: null, uncertaintyQuantified: false,
      completeness: { openingReading: true, closingReading: true, meterStart: true, meterEnd: true, missingFields: [] },
      invalidReasons: [], scopeAssumption: "", inputs: [], findings: [],
      ruleVersion: "recon-v1.0", generatedAt: id,
    });
    const PERIOD_START = "2026-10-28T02:30:00Z", PERIOD_END = "2026-10-29T02:30:00Z";
    const one = stateWith([], [run("run1", "discrepancy")]);
    expect(detectAnomalies(one, SITE, DEFAULT_ANOMALY_CONFIG).filter((a) => a.kind === "repeated-discrepancy")).toHaveLength(0);
    const two = stateWith([], [run("run1", "discrepancy"), run("run2", "discrepancy")]);
    const found = detectAnomalies(two, SITE, DEFAULT_ANOMALY_CONFIG).filter((a) => a.kind === "repeated-discrepancy");
    expect(found).toHaveLength(1);
    expect(found[0].explanation).toMatch(/systematic cause/i);
  });

  it("respects per-site config and dismissals", () => {
    const readings = steadyHistory(3000 * 2);
    const tight = configFor(
      { ...stateWith(readings), anomalyConfigs: { [SITE]: { ...DEFAULT_ANOMALY_CONFIG, usagePctThreshold: 5 } } },
      SITE,
    );
    expect(tight.usagePctThreshold).toBe(5);
    const loose = configFor({ ...stateWith(readings) }, SITE);
    expect(loose).toEqual(DEFAULT_ANOMALY_CONFIG);

    const fake = { id: "a1" } as Anomaly;
    const st = { ...stateWith(readings), anomalyDismissals: { a1: { reason: "verified holiday", at: "2026-10-31T00:00:00Z", by: "op" } } };
    expect(isDismissed(st, fake)).toBe(true);
  });
});

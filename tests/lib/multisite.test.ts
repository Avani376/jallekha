import { describe, expect, it } from "vitest";
import { siteRows, totals } from "../../src/lib/multisite";
import type { WorkspaceState } from "../../src/domain/types";

function run(siteId: string, id: string, status: WorkspaceState["runs"][number]["status"], residual: number | null) {
  return {
    id, siteId, tankId: "t", meterId: "m",
    periodStart: "2026-10-28T02:30:00Z", periodEnd: "2026-10-29T02:30:00Z",
    boundaryConvention: "x", status,
    openingLiters: 0, closingLiters: 0, deliveriesTotalLiters: 0,
    deliveriesIncludedCount: 0, usageLiters: 1000, residualLiters: residual,
    boundsLiters: status === "incomplete" ? null : { min: residual === null ? 0 : residual - 100, max: (residual ?? 0) + 100 },
    uncertaintyQuantified: status !== "incomplete",
    completeness: { openingReading: true, closingReading: status !== "incomplete", meterStart: true, meterEnd: true, missingFields: status === "incomplete" ? ["closingStockReading"] : [] },
    invalidReasons: [], scopeAssumption: "", inputs: [], findings: [],
    ruleVersion: "recon-v1.0", generatedAt: id,
  };
}

function site(id: string, name: string) {
  return { id, name, timezone: "Asia/Kolkata", isDemo: true };
}

function state(): WorkspaceState {
  return {
    schemaVersion: 1,
    periods: {},
    sites: [site("s1", "Alpha Campus"), site("s2", "Beta Society"), site("s3", "Gamma Hostel")],
    tanks: [], meters: [],
    deliveries: [
      { id: "d1", siteId: "s1", tankId: "t", supplierLabel: "X", receiptNumber: "R1", deliveredAt: "2026-10-28T09:00:00Z", sourceQuantity: 1000, sourceUnit: "L" as const, quantityLiters: 1000, quality: "measured" as const, uncertaintyLiters: 100, status: "posted" as const, createdBy: "t", createdAt: "t", version: 1 },
    ],
    tankReadings: [], usageReadings: [],
    runs: [run("s1", "r1", "within-uncertainty", 0), run("s2", "r2", "incomplete", null), run("s3", "r3", "discrepancy", 2000)],
    investigations: [], auditEvents: [], importBatches: [],
  } as WorkspaceState;
}

describe("multi-site aggregation", () => {
  it("produces one row per site from that site's own records only", () => {
    const rows = siteRows(state());
    expect(rows).toHaveLength(3);
    const alpha = rows.find((r) => r.siteId === "s1")!;
    expect(alpha.deliveriesTotal).toBe(1000); // s1's delivery counted once
    const beta = rows.find((r) => r.siteId === "s2")!;
    expect(beta.deliveriesTotal).toBe(0); // isolation: s1's records don't leak
  });

  it("flags comparison reliability per run state", () => {
    const rows = siteRows(state());
    expect(rows.find((r) => r.siteId === "s1")!.comparisonReliable).toBe(true);
    const beta = rows.find((r) => r.siteId === "s2")!;
    expect(beta.comparisonReliable).toBe(false);
    expect(beta.reliabilityNote).toMatch(/incomplete/);
    const gamma = rows.find((r) => r.siteId === "s3")!;
    expect(gamma.comparisonReliable).toBe(true);
    expect(gamma.runStatus).toBe("discrepancy");
  });

  it("totals reflect honest counts (no double counting)", () => {
    const t = totals(siteRows(state()));
    expect(t.sites).toBe(3);
    expect(t.withDiscrepancy).toBe(1);
    expect(t.withIncomplete).toBe(1);
    expect(t.records).toBe(1); // one delivery record in the whole workspace
    expect(t.reliableCount).toBe(2);
  });
});

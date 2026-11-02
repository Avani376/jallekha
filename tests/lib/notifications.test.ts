import { describe, expect, it } from "vitest";
import { deriveNotifications, unreadCount } from "../../src/lib/notifications";
import type { WorkspaceState } from "../../src/domain/types";

const SITE = "site-x";

function baseState(over: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    schemaVersion: 1,
    sites: [], tanks: [], meters: [], deliveries: [],
    tankReadings: [], usageReadings: [], runs: [],
    investigations: [], auditEvents: [], importBatches: [],
    ...over,
  };
}

const discrepancyRun = {
  id: "run1", siteId: SITE, tankId: "t", meterId: "m",
  periodStart: "2026-10-28T02:30:00Z", periodEnd: "2026-10-29T02:30:00Z",
  boundaryConvention: "x", status: "discrepancy" as const,
  openingLiters: 0, closingLiters: 0, deliveriesTotalLiters: 0,
  deliveriesIncludedCount: 0, usageLiters: 0, residualLiters: 900,
  boundsLiters: { min: 500, max: 1300 }, uncertaintyQuantified: true,
  completeness: { openingReading: true, closingReading: true, meterStart: true, meterEnd: true, missingFields: [] as string[] },
  invalidReasons: [] as string[], scopeAssumption: "", inputs: [] as never[],
  findings: [
    {
      id: "find-1", type: "duplicate-candidate" as const, severity: "warning" as const,
      title: "Possible duplicate delivery record", detail: "", sourceIds: ["dlv-1", "dlv-2"],
      suggestedAction: "Compare with the physical receipt",
    },
  ],
  ruleVersion: "recon-v1.0", generatedAt: "2026-10-29T10:00:00Z",
};

const openCase = {
  id: "inv-1", siteId: SITE, findingType: "duplicate-candidate" as const,
  title: "Possible duplicate delivery record", detail: "", sourceIds: ["dlv-1"],
  suggestedAction: "", assignee: "op@demo", status: "in-review" as const,
  evidenceNotes: [], resolution: null,
  createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("notification derivation", () => {
  it("derives findings + open cases with deduped stable ids", () => {
    const st = baseState({ runs: [discrepancyRun], investigations: [openCase] });
    const list = deriveNotifications(st, SITE);
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = list.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length); // dedupe keys are unique
    const caseN = list.find((n) => n.source === "cases")!;
    expect(caseN.severity).toBe("high"); // 9 days open -> high
    expect(caseN.body).toMatch(/Overdue/);
  });

  it("counts only unread, non-snoozed items for the bell", () => {
    const st = baseState({
      runs: [discrepancyRun],
      notificationStates: {
        "ntf-find-find-1": { readAt: "2026-10-30T00:00:00Z" },
      },
    });
    const list = deriveNotifications(st, SITE);
    const findings = list.filter((n) => n.source === "reconciliation");
    expect(findings.every((n) => n.read)).toBe(true);
    expect(unreadCount(st, SITE)).toBe(list.filter((n) => !n.read && !n.snoozed).length);
  });

  it("snoozed items are excluded from unread but not deleted", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const st = baseState({
      runs: [discrepancyRun],
      investigations: [openCase],
      notificationStates: {
        "ntf-case-inv-1-in-review-stale": { snoozedUntil: future },
      },
    });
    const list = deriveNotifications(st, SITE);
    const caseN = list.find((n) => n.source === "cases")!;
    expect(caseN.snoozed).toBe(true);
    expect(list.find((n) => n.id === "ntf-case-inv-1-in-review-stale")).toBeTruthy();
  });

  it("dismissed items with a reason disappear from the list", () => {
    const st = baseState({
      runs: [discrepancyRun],
      notificationStates: {
        "ntf-find-find-1": { dismissedAt: "2026-10-30T00:00:00Z", dismissReason: "verified not a duplicate" },
      },
    });
    const list = deriveNotifications(st, SITE);
    expect(list.find((n) => n.id === "ntf-find-find-1")).toBeUndefined();
  });

  it("missing fields produce completeness notifications", () => {
    const st = baseState({
      runs: [{
        ...discrepancyRun,
        status: "incomplete" as const,
        residualLiters: null, boundsLiters: null,
        completeness: { openingReading: true, closingReading: false, meterStart: true, meterEnd: true, missingFields: ["closingStockReading"] },
      }],
    });
    const list = deriveNotifications(st, SITE);
    expect(list.some((n) => n.source === "completeness" && n.title.match(/closing stock reading/i))).toBe(true);
  });
});

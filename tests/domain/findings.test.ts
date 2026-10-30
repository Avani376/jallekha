import { describe, expect, it } from "vitest";
import {
  detectExactDuplicateCandidates,
  detectFuzzyDuplicateCandidates,
  duplicateFindings,
} from "../../src/domain/findings";
import { mkDelivery, PERIOD_START } from "../../fixtures/synthetic/scenarios";

const DAY = 24 * 3600 * 1000;

describe("duplicate detection", () => {
  it("flags exact duplicates (same supplier + receipt + site) and links both rows", () => {
    const a = mkDelivery({ id: "d1", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000 });
    const b = mkDelivery({ id: "d2", receiptNumber: "R-1", deliveredAt: new Date(Date.parse(PERIOD_START) + 3600e3).toISOString(), quantityLiters: 5000 });
    const pairs = detectExactDuplicateCandidates([a, b]);
    expect(pairs.length).toBe(1);
    const f = duplicateFindings([a, b]);
    expect(f[0].matchFields).toContain("receipt number");
    expect(f[0].sourceIds.sort()).toEqual(["d1", "d2"]);
  });

  it("does NOT flag legitimate equal-volume deliveries with different receipts", () => {
    const a = mkDelivery({ id: "d1", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000 });
    const b = mkDelivery({ id: "d2", receiptNumber: "R-2", deliveredAt: new Date(Date.parse(PERIOD_START) + 2 * DAY).toISOString(), quantityLiters: 5000 });
    expect(detectExactDuplicateCandidates([a, b]).length).toBe(0);
    expect(detectFuzzyDuplicateCandidates([a, b]).length).toBe(0);
  });

  it("does NOT flag same-receipt deliveries on different sites", () => {
    const a = mkDelivery({ id: "d1", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000 });
    const b = mkDelivery({ id: "d2", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000, siteId: "site-other" });
    expect(detectExactDuplicateCandidates([a, b]).length).toBe(0);
  });

  it("emits a fuzzy candidate when a receipt number is missing, labeled unconfirmed", () => {
    const a = mkDelivery({ id: "d1", receiptNumber: null, deliveredAt: PERIOD_START, quantityLiters: 5000 });
    const b = mkDelivery({ id: "d2", receiptNumber: null, deliveredAt: new Date(Date.parse(PERIOD_START) + 2 * 3600e3).toISOString(), quantityLiters: 5000 });
    const f = duplicateFindings([a, b]);
    expect(f.length).toBe(1);
    expect(f[0].matchKind).toBe("fuzzy");
    expect(f[0].detail).toMatch(/cannot be confirmed/i);
  });

  it("ignores voided records", () => {
    const a = mkDelivery({ id: "d1", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000 });
    const b = mkDelivery({ id: "d2", receiptNumber: "R-1", deliveredAt: PERIOD_START, quantityLiters: 5000, status: "voided", voidReason: "dup" });
    expect(detectExactDuplicateCandidates([a, b]).length).toBe(0);
  });

  it("does not flag three identical receipts as only one pair (all pairs found)", () => {
    const mk = (id: string) => mkDelivery({ id, receiptNumber: "R-9", deliveredAt: PERIOD_START, quantityLiters: 1000 });
    expect(detectExactDuplicateCandidates([mk("a"), mk("b"), mk("c")]).length).toBe(3);
  });
});

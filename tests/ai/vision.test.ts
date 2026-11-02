import { describe, expect, it } from "vitest";
import { validateScanFile, validateReceiptDraft, receiptDraftSchema, MAX_SCAN_BYTES } from "../../src/lib/ai/vision";

describe("receipt scan validation", () => {
  it("accepts jpg/png/webp under 5 MB and rejects the rest", () => {
    expect(validateScanFile({ type: "image/jpeg", size: 800_000 })).toBeNull();
    expect(validateScanFile({ type: "image/png", size: 2_000_000 })).toBeNull();
    expect(validateScanFile({ type: "application/pdf", size: 800_000 })).toMatch(/PDF support is planned/);
    expect(validateScanFile({ type: "image/gif", size: 800_000 })).toMatch(/Unsupported file type/);
    expect(validateScanFile({ type: "image/jpeg", size: MAX_SCAN_BYTES + 1 })).toMatch(/larger than 5 MB/);
    expect(validateScanFile({ type: "image/jpeg", size: 200 })).toMatch(/too small/);
  });

  it("parses a well-formed extraction draft", () => {
    const parsed = receiptDraftSchema.safeParse({
      supplier: "BlueWave Tankers", receipt_number: "R-118",
      observed_at: "2026-10-28T14:30:00+05:30", quantity_value: 5000,
      quantity_unit: "L", vehicle_number: "MH-12-AB-1234",
      confidence: "high", warnings: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects impossible drafts (negative quantity, bad unit)", () => {
    expect(receiptDraftSchema.safeParse({ supplier: "X", receipt_number: "R", observed_at: null, quantity_value: -5, quantity_unit: "L", vehicle_number: null, warnings: [] }).success).toBe(false);
    expect(receiptDraftSchema.safeParse({ supplier: "X", receipt_number: "R", observed_at: null, quantity_value: 100, quantity_unit: "gallons", vehicle_number: null, warnings: [] }).success).toBe(false);
  });

  it("deterministic validation flags missing fields and duplicates", () => {
    const existing = [
      { id: "dlv-1", receiptNumber: "R-101", supplierLabel: "BlueWave Tankers", deliveredAt: "2026-10-28T09:00:00Z", quantityLiters: 5000, status: "posted" },
    ];
    const dup = validateReceiptDraft(
      { supplier: "BlueWave Tankers", receipt_number: "R-101", observed_at: "2026-10-28T14:30:00+05:30", quantity_value: 5000, quantity_unit: "L", vehicle_number: null, confidence: "high", warnings: [] },
      existing,
    );
    expect(dup.duplicateOfId).toBe("dlv-1");
    expect(dup.warnings.join(" ")).toMatch(/Possible duplicate/);
    expect(dup.missing).toHaveLength(0);

    const empty = validateReceiptDraft(
      { supplier: null, receipt_number: null, observed_at: null, quantity_value: null, quantity_unit: null, vehicle_number: null, confidence: "low", warnings: [] },
      existing,
    );
    expect(empty.missing).toEqual(["supplier", "receipt number", "delivery date/time", "quantity"]);
    expect(empty.warnings.join(" ")).toMatch(/cannot be duplicate-checked/);
  });
});

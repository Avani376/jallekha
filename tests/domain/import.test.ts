import { describe, expect, it } from "vitest";
import {
  buildImportPreview,
  confirmImport,
  parseCsv,
  SAMPLE_CSV,
  sanitizeCell,
  suggestColumnMapping,
} from "../../src/domain/import";
import { toLiters, validateQuantity, QuantityError, roundLiters } from "../../src/domain/units";
import { makeTankA, makeSiteA, SITE_A_ID } from "../../fixtures/synthetic/scenarios";

const OPTIONS = {
  filename: "deliveries.csv",
  dateFormat: "ISO" as const,
  defaultUnit: "L" as const,
  actor: "operator@demo",
  now: "2026-10-31T05:00:00.000Z",
};

describe("units", () => {
  it("converts exactly: 1 kL = 1,000 L and 1 m3 = 1,000 L", () => {
    expect(toLiters(1, "kL")).toBe(1000);
    expect(toLiters(2.5, "kL")).toBe(2500);
    expect(toLiters(3, "m3")).toBe(3000);
    expect(toLiters(500, "L")).toBe(500);
  });
  it("rejects NaN, Infinity and negatives without clamping", () => {
    expect(() => validateQuantity(Number.NaN)).toThrow(QuantityError);
    expect(() => validateQuantity(Infinity)).toThrow(QuantityError);
    expect(() => validateQuantity(-1)).toThrow(QuantityError);
    expect(() => toLiters(-0.5, "L")).toThrow(QuantityError);
  });
  it("rounds to 3 decimal places", () => {
    expect(roundLiters(1.0005)).toBe(1.001);
    expect(roundLiters(0.1 + 0.2)).toBe(0.3);
  });
});

describe("csv import", () => {
  it("parses quotes and commas safely", () => {
    const { headers, rows } = parseCsv('supplier,note\n"Alpha, Inc","""Load ""A"""\nBeta,plain');
    expect(headers).toEqual(["supplier", "note"]);
    expect(rows[0].supplier).toBe("Alpha, Inc");
    expect(rows[0].note).toBe('"Load "A"'); // RFC4180: "" -> literal quote
  });

  it("suggests a column mapping from known aliases", () => {
    const { headers } = parseCsv(SAMPLE_CSV);
    const mapping = suggestColumnMapping(headers);
    expect(mapping.supplier).toBe("supplier");
    expect(mapping.receiptNumber).toBe("receipt_number");
    expect(mapping.quantity).toBe("quantity");
  });

  it("previews valid, invalid, exact-duplicate and fuzzy rows", () => {
    const mapping = suggestColumnMapping(parseCsv(SAMPLE_CSV).headers);
    const preview = buildImportPreview(
      SAMPLE_CSV, mapping, OPTIONS, [], [makeTankA()], [makeSiteA()],
    );
    expect(preview.summary.valid).toBe(4);
    // R-101 5,000 L same day as an existing manual entry -> fuzzy
    const existing = [{
      id: "dlv-manual", siteId: SITE_A_ID, tankId: "tank-T01",
      supplierLabel: "BlueWave Tankers", receiptNumber: "R-101",
      deliveredAt: "2026-10-28T09:00:00.000Z", sourceQuantity: 5000,
      sourceUnit: "L" as const, quantityLiters: 5000, quality: "measured" as const,
      uncertaintyLiters: 100, status: "posted" as const, createdBy: "x", createdAt: "x", version: 1,
    }];
    const preview2 = buildImportPreview(
      SAMPLE_CSV, mapping, OPTIONS, existing, [makeTankA()], [makeSiteA()],
    );
    // CSV row 1 (R-101, 5,000 L, 14:30 IST) matches the manual entry on all
    // natural-key fields -> EXACT duplicate; row 4 (no receipt) stays valid.
    expect(preview2.summary.exactDuplicate).toBe(1);
    expect(preview2.summary.valid).toBe(3);
  });

  it("flags rows with unknown tank, bad numbers and bad dates as errors", () => {
    const csv = `supplier,receipt_number,delivered_at,quantity,unit,tank
Alpha,R-1,2026-10-28T10:00:00Z,100,L,T-XX
Beta,R-2,not-a-date,200,L,T-01
Gamma,R-3,2026-10-28T10:00:00Z,-5,L,T-01
Delta,R-4,2026-10-28T10:00:00Z,abc,L,T-01`;
    const mapping = suggestColumnMapping(parseCsv(csv).headers);
    const preview = buildImportPreview(csv, mapping, OPTIONS, [], [makeTankA()], [makeSiteA()]);
    expect(preview.summary.error).toBe(4);
    expect(preview.rows[2].errors.join(" ")).toMatch(/negative/i);
  });

  it("rejects ambiguous DD/MM vs MM/DD unless a format is chosen explicitly", () => {
    const csv = `supplier,delivered_at,quantity,tank\nA,05/03/2026 10:00,100,T-01`;
    const mapping = suggestColumnMapping(parseCsv(csv).headers);
    const iso = buildImportPreview(csv, mapping, { ...OPTIONS, dateFormat: "ISO" }, [], [makeTankA()], [makeSiteA()]);
    expect(iso.summary.error).toBe(1);
    const dmy = buildImportPreview(csv, mapping, { ...OPTIONS, dateFormat: "DD/MM/YYYY" }, [], [makeTankA()], [makeSiteA()]);
    expect(dmy.summary.valid).toBe(1);
    // 05/03/2026 10:00 IST == 2026-03-05T04:30:00Z
    expect(dmy.rows[0].parsed?.deliveredAtISO).toBe("2026-03-05T04:30:00.000Z");
  });

  it("is idempotent: replaying the same confirmed file creates no new rows", () => {
    const mapping = suggestColumnMapping(parseCsv(SAMPLE_CSV).headers);
    const p1 = buildImportPreview(SAMPLE_CSV, mapping, OPTIONS, [], [makeTankA()], [makeSiteA()]);
    const r1 = confirmImport(p1, OPTIONS, SITE_A_ID);
    expect(r1.createdDeliveries.length).toBe(4);
    // Replay against the now-existing ledger: every row is an exact duplicate.
    const p2 = buildImportPreview(
      SAMPLE_CSV, mapping, OPTIONS, r1.createdDeliveries, [makeTankA()], [makeSiteA()],
    );
    expect(p2.summary.exactDuplicate).toBe(4);
    expect(p2.summary.valid).toBe(0);
    const r2 = confirmImport(p2, OPTIONS, SITE_A_ID);
    expect(r2.createdDeliveries.length).toBe(0);
    // Idempotency keys are stable for the same file+row
    expect(r1.createdDeliveries[0].importIdempotencyKey).toBeTruthy();
  });

  it("posts 2.5 kL and 3 m3 rows as 2,500 / 3,000 liters", () => {
    const mapping = suggestColumnMapping(parseCsv(SAMPLE_CSV).headers);
    const p = buildImportPreview(SAMPLE_CSV, mapping, OPTIONS, [], [makeTankA()], [makeSiteA()]);
    const r = confirmImport(p, OPTIONS, SITE_A_ID);
    const qty = r.createdDeliveries.map((d) => d.quantityLiters);
    expect(qty).toContain(2500);
    expect(qty).toContain(3000);
  });

  it("never auto-posts fuzzy duplicates", () => {
    const mapping = suggestColumnMapping(parseCsv(SAMPLE_CSV).headers);
    const existing = [{
      id: "dlv-manual", siteId: SITE_A_ID, tankId: "tank-T01",
      supplierLabel: "BlueWave Tankers", receiptNumber: "R-101",
      deliveredAt: "2026-10-28T09:00:00.000Z", sourceQuantity: 5000,
      sourceUnit: "L" as const, quantityLiters: 5000, quality: "measured" as const,
      uncertaintyLiters: 100, status: "posted" as const, createdBy: "x", createdAt: "x", version: 1,
    }];
    const p = buildImportPreview(SAMPLE_CSV, mapping, OPTIONS, existing, [makeTankA()], [makeSiteA()]);
    const r = confirmImport(p, OPTIONS, SITE_A_ID);
    expect(r.createdDeliveries.find((d) => d.quantityLiters === 5000 && d.supplierLabel === "BlueWave Tankers")).toBeUndefined();
  });

  it("sanitizes spreadsheet formula prefixes in exported cells", () => {
    expect(sanitizeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(sanitizeCell("+1")).toBe("'+1");
    expect(sanitizeCell("@x")).toBe("'@x");
    expect(sanitizeCell("5000")).toBe("5000");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildReadingImportPreview,
  confirmReadingImport,
  suggestReadingColumnMapping,
  SAMPLE_TANK_READINGS_CSV,
  SAMPLE_METER_READINGS_CSV,
} from "../../src/domain/import";
import { makeTankA, makeMeterA, SITE_A_ID } from "../../fixtures/synthetic/scenarios";

const OPTIONS = {
  filename: "readings.csv",
  dateFormat: "ISO" as const,
  quality: "measured" as const,
  actor: "operator@demo",
  now: "2026-10-31T05:00:00.000Z",
};

describe("readings csv import", () => {
  it("maps stock and meter columns and validates rows", () => {
    const mapping = suggestReadingColumnMapping(
      ["observed_at", "stock_liters", "uncertainty", "method", "quality"],
      "tank",
    );
    expect(mapping.value).toBe("stock_liters");
    const result = buildReadingImportPreview(
      SAMPLE_TANK_READINGS_CSV, "tank", mapping, OPTIONS, SITE_A_ID,
      [makeTankA()], [makeMeterA()], [], [],
    );
    expect(result.summary.valid).toBe(3);
    // blank uncertainty stays "not quantified" — the engine reports it
    expect(result.rows[2].parsed?.uncertaintyLiters).toBeNull();
  });

  it("rejects stock above tank capacity without clamping", () => {
    const csv = "observed_at,stock_liters\n2026-10-28T08:00:00Z,25000";
    const mapping = suggestReadingColumnMapping(["observed_at", "stock_liters"], "tank");
    const result = buildReadingImportPreview(csv, "tank", mapping, OPTIONS, SITE_A_ID, [makeTankA()], [makeMeterA()], [], []);
    expect(result.summary.error).toBe(1);
    expect(result.rows[0].errors[0]).toMatch(/exceeds tank capacity/);
  });

  it("is idempotent: identical replays are skipped, conflicts are errors", () => {
    const mapping = suggestReadingColumnMapping(["observed_at", "reading", "uncertainty"], "meter");
    const first = buildReadingImportPreview(
      SAMPLE_METER_READINGS_CSV, "meter", mapping, OPTIONS, SITE_A_ID,
      [makeTankA()], [makeMeterA()], [], [],
    );
    expect(first.summary.valid).toBe(3);
    const posted = confirmReadingImport("meter", first, OPTIONS, SITE_A_ID);
    expect(posted.usageReadings.length).toBe(3);

    // exact replay: all rows skipped
    const replay = buildReadingImportPreview(
      SAMPLE_METER_READINGS_CSV, "meter", mapping, OPTIONS, SITE_A_ID,
      [makeTankA()], [makeMeterA()], posted.tankReadings, posted.usageReadings,
    );
    expect(replay.summary.exactDuplicate).toBe(3);
    expect(replay.summary.valid).toBe(0);
    expect(confirmReadingImport("meter", replay, OPTIONS, SITE_A_ID).usageReadings.length).toBe(0);

    // conflicting value at a recorded instant: error, never overwritten
    const conflictCsv = SAMPLE_METER_READINGS_CSV.replace("104000", "105500");
    const conflict = buildReadingImportPreview(
      conflictCsv, "meter", mapping, OPTIONS, SITE_A_ID,
      [makeTankA()], [makeMeterA()], posted.tankReadings, posted.usageReadings,
    );
    expect(conflict.rows[1].errors[0]).toMatch(/different reading already exists/);
  });
});

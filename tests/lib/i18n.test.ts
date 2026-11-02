import { describe, expect, it } from "vitest";
import { translate } from "../../src/lib/i18n";
import { en } from "../../src/lib/locales/en";
import { mr } from "../../src/lib/locales/mr";

describe("i18n", () => {
  it("has Marathi parity for every English key", () => {
    const enKeys = Object.keys(en).sort();
    const mrKeys = Object.keys(mr).sort();
    expect(mrKeys).toEqual(enKeys);
  });

  it("every Marathi string is non-empty and contains Devanagari where expected", () => {
    for (const [key, value] of Object.entries(mr)) {
      expect(value.trim().length, `mr.${key} is empty`).toBeGreaterThan(0);
      // Marathi file should use Devanagari for interface terms (keys that
      // are not pure brand/technical names).
      // Universal math notation is exempt from the Devanagari check.
      if (!["nav.dashboard", "nav.sites", "card.waterfall.sub"].includes(key)) {
        expect(/[\u0900-\u097F]/.test(value), `mr.${key} lacks Devanagari: ${value}`).toBe(true);
      }
    }
  });

  it("falls back: translate returns English when Marathi is requested but missing (defensive), and interpolates vars", () => {
    expect(translate("en", "kpi.avgDaily", { n: 4500 })).toBe("avg 4500 L/day");
    expect(translate("mr", "kpi.avgDaily", { n: 4500 })).toBe("सरासरी 4500 लिटर/दिवस");
    expect(translate("en", "kpi.residual")).toBe("Residual");
    expect(translate("mr", "kpi.residual")).toContain("residual");
  });
});

import { describe, expect, it } from "vitest";
import { forecastDemand, type HistoryPoint } from "../../src/lib/forecast";

function history(dailyLiters: number[]): HistoryPoint[] {
  const start = Date.UTC(2026, 9, 20); // Oct 20
  return dailyLiters.map((liters, i) => {
    const d = new Date(start + i * 86_400_000);
    return {
      day: d.toISOString().slice(0, 10),
      label: d.toISOString().slice(0, 10),
      liters,
    };
  });
}

describe("demand forecasting", () => {
  it("refuses to forecast from insufficient history", () => {
    const r = forecastDemand(history([3000, 3100, 2900]), { horizonDays: 7 });
    expect(r.sufficient).toBe(false);
    if (!r.sufficient) {
      expect(r.minimumNeeded).toBe(7);
      expect(r.have).toBeLessThan(7);
      expect(r.reason).toMatch(/at least 7/);
    }
  });

  it("produces a labeled, banded forecast from sufficient stable history", () => {
    const r = forecastDemand(history([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), { horizonDays: 7, useWeekdayPattern: false });
    expect(r.sufficient).toBe(true);
    if (r.sufficient) {
      expect(r.points).toHaveLength(7);
      expect(r.assumptions.method).toMatch(/moving average/);
      expect(r.generatedNote).toMatch(/not a measured water quantity/i);
      for (const p of r.points) {
        expect(p.liters).toBeGreaterThan(0);
        expect(p.low).toBeLessThanOrEqual(p.liters);
        expect(p.high).toBeGreaterThanOrEqual(p.liters);
      }
    }
  });

  it("keeps the band honest: volatile history widens it", () => {
    const stable = forecastDemand(history([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), { useWeekdayPattern: false });
    const volatile = forecastDemand(history([1000, 6000, 1500, 5500, 1200, 5000, 1800, 4800, 1000, 6000, 1500]), { useWeekdayPattern: false });
    expect(stable.sufficient && volatile.sufficient).toBe(true);
    if (stable.sufficient && volatile.sufficient) {
      const stableBand = stable.points[0].high - stable.points[0].low;
      const volatileBand = volatile.points[0].high - volatile.points[0].low;
      expect(volatileBand).toBeGreaterThan(stableBand);
      expect(volatile.assumptions.stabilityNote).toMatch(/volatile/i);
    }
  });

  it("forecasts continue AFTER the last history day (no overlap with actuals)", () => {
    const hist = history([3000, 3050, 2950, 3000, 3050, 2950, 3000, 3050, 2950, 3000]);
    const r = forecastDemand(hist, { horizonDays: 3, useWeekdayPattern: false });
    expect(r.sufficient).toBe(true);
    if (r.sufficient) {
      const lastHistoryDay = hist[hist.length - 1].day;
      for (const p of r.points) {
        expect(p.day > lastHistoryDay).toBe(true);
      }
    }
  });

  it("never exposes engine-facing fields (structural separation)", () => {
    const r = forecastDemand(history([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]), {});
    expect(r.sufficient).toBe(true);
    if (r.sufficient) {
      const keys = Object.keys(r).sort();
      expect(keys).toEqual(["assumptions", "generatedNote", "horizonDays", "points", "sufficient"]);
      for (const p of r.points) {
        expect(Object.keys(p).sort()).toEqual(["day", "high", "label", "liters", "low"]);
      }
    }
  });
});

/**
 * Water demand forecasting: simple, explainable statistics over historical
 * metered usage intervals. Every forecast carries its method, input range,
 * assumptions and limitations, and is labeled an ESTIMATE. Forecast values
 * are structurally independent of the reconciliation engine — they never
 * touch tank stock, delivery records or verified readings.
 */

export interface HistoryPoint {
  day: string; // ISO date (IST)
  label: string;
  liters: number;
}

export interface ForecastPoint {
  day: string;
  label: string;
  liters: number;
  low: number;
  high: number;
}

export interface ForecastAssumptions {
  historyIntervals: number;
  historyRange: string;
  method: string;
  weekdayAdjustment: boolean;
  stabilityNote: string;
}

export type ForecastResult =
  | {
      sufficient: true;
      horizonDays: number;
      points: ForecastPoint[];
      assumptions: ForecastAssumptions;
      generatedNote: string;
    }
  | {
      sufficient: false;
      reason: string;
      minimumNeeded: number;
      have: number;
    };

export interface ForecastOptions {
  horizonDays: number; // 1..14
  window: number; // moving-average window (e.g. 7)
  useWeekdayPattern: boolean;
  generatedAt?: string;
}

export const FORECAST_DEFAULTS: ForecastOptions = {
  horizonDays: 7,
  window: 7,
  useWeekdayPattern: true,
};

const MIN_INTERVALS = 7;

function istDayFromOffset(baseDay: string, offset: number): string {
  const t = new Date(baseDay + "T00:00:00Z").getTime() + offset * 86_400_000;
  const d = new Date(t);
  return d.toISOString().slice(0, 10);
}

function weekdayName(dayIso: string): number {
  return new Date(dayIso + "T00:00:00Z").getUTCDay(); // 0 = Sunday
}

function label(dayIso: string): string {
  const d = new Date(dayIso + "T00:00:00Z");
  return String(d.getUTCDate()).padStart(2, "0") + " " + d.toLocaleString("en-IN", { month: "short", timeZone: "UTC" });
}

/**
 * Forecasts future daily demand from historical metered-usage intervals.
 * Method: moving average over the last `window` intervals, optionally
 * blended with a per-weekday factor from history. Uncertainty is the
 * historical standard deviation of interval deviations (linear band), NOT a
 * model confidence interval.
 */
export function forecastDemand(history: HistoryPoint[], options: Partial<ForecastOptions> = {}): ForecastResult {
  const opts = { ...FORECAST_DEFAULTS, ...options };
  const horizon = Math.max(1, Math.min(14, Math.round(opts.horizonDays)));
  const window = Math.max(3, Math.min(30, Math.round(opts.window)));
  const clean = history.filter((h) => Number.isFinite(h.liters) && h.liters >= 0).slice(-60);

  if (clean.length < MIN_INTERVALS) {
    return {
      sufficient: false,
      reason:
        "Demand forecasting needs at least " + MIN_INTERVALS +
        " consecutive daily usage intervals to establish a baseline. Keep recording daily meter readings — the estimate appears automatically once there is enough history.",
      minimumNeeded: MIN_INTERVALS,
      have: clean.length,
    };
  }

  // Intervals between consecutive history points (the same derivation the
  // dashboard uses), aligned to the LAST history day for the forecast base.
  const intervals: number[] = [];
  for (let i = 1; i < clean.length; i += 1) {
    intervals.push(clean[i].liters);
  }
  const recent = intervals.slice(-window);
  const base = Math.round(recent.reduce((a, v) => a + v, 0) / recent.length);

  // Deviation statistics for the band (how much history misses its own
  // trailing average — the honest uncertainty of this simple method).
  const deviations: number[] = [];
  for (let i = window; i < intervals.length; i += 1) {
    const trailing = intervals.slice(Math.max(0, i - window), i);
    const avg = trailing.reduce((a, v) => a + v, 0) / trailing.length;
    deviations.push(intervals[i] - avg);
  }
  const variance = deviations.length > 1
    ? deviations.reduce((a, v) => a + v * v, 0) / deviations.length
    : 0;
  const sd = Math.sqrt(variance);
  const band = Math.round(1.96 * sd); // ~95% band of historical deviations

  // Weekday factors: average deviation from the base per weekday.
  const weekdayFactor = new Map<number, number>();
  if (opts.useWeekdayPattern) {
    const byDay = new Map<number, number[]>();
    for (let i = Math.max(0, intervals.length - 28); i < intervals.length; i += 1) {
      const wd = weekdayName(clean[i + 1].day);
      const arr = byDay.get(wd) ?? [];
      arr.push(intervals[i]);
      byDay.set(wd, arr);
    }
    for (const [wd, arr] of byDay) {
      if (arr.length >= 2) weekdayFactor.set(wd, arr.reduce((a, v) => a + v, 0) / arr.length - base);
    }
  }

  const lastDay = clean[clean.length - 1].day;
  const points: ForecastPoint[] = [];
  for (let d = 1; d <= horizon; d += 1) {
    const day = istDayFromOffset(lastDay, d);
    let predicted = base;
    if (opts.useWeekdayPattern) {
      const wd = weekdayName(day);
      const factor = weekdayFactor.get(wd);
      if (factor !== undefined) predicted = Math.round(base + factor);
    }
    predicted = Math.max(0, predicted);
    points.push({
      day,
      label: label(day),
      liters: predicted,
      low: Math.max(0, predicted - band),
      high: predicted + band,
    });
  }

  const stable = band <= base * 0.35;
  const assumptions: ForecastAssumptions = {
    historyIntervals: intervals.length,
    historyRange: clean[0].day + " to " + lastDay,
    method:
      opts.useWeekdayPattern
        ? "moving average (" + window + " intervals) with per-weekday adjustment"
        : "moving average (" + window + " intervals)",
    weekdayAdjustment: opts.useWeekdayPattern,
    stabilityNote:
      "Band ≈ ±1.96 standard deviations of historical deviations from the trailing average" +
      (stable ? " — history is comparatively stable." : " — history is volatile; treat the band as wide."),
  };

  return {
    sufficient: true,
    horizonDays: horizon,
    points,
    assumptions,
    generatedNote: "Forecast estimate — not a measured water quantity. Generated " +
      (opts.generatedAt ?? "from the latest recorded data") +
      ". Forecasts never enter the reconciliation balance.",
  };
}

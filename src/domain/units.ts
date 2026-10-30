/**
 * Liters are the internal unit (3 decimal places, mL precision). Invalid
 * quantities — NaN, Infinity, negatives — throw; nothing is clamped.
 */

import type { VolumeUnit } from "./types";

export const ROUND_DP = 3;

export function roundLiters(n: number): number {
  const f = 10 ** ROUND_DP;
  return Math.round(n * f) / f;
}

export class QuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuantityError";
  }
}

/** Validates a finite, non-negative quantity and returns it rounded. */
export function validateQuantity(
  value: number,
  label = "quantity",
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new QuantityError(`${label} is not a number (NaN)`);
  }
  if (!Number.isFinite(value)) {
    throw new QuantityError(`${label} must be finite (got Infinity)`);
  }
  if (value < 0) {
    throw new QuantityError(`${label} must not be negative (got ${value})`);
  }
  return roundLiters(value);
}

/** Converts a source-unit quantity to liters. Throws on invalid input. */
export function toLiters(
  quantity: number,
  unit: VolumeUnit,
  label = "quantity",
): number {
  const q = validateQuantity(quantity, label);
  switch (unit) {
    case "L":
      return q;
    case "kL":
      return roundLiters(q * 1000);
    case "m3":
      return roundLiters(q * 1000);
    default: {
      const _exhaustive: never = unit;
      throw new QuantityError(`unknown unit ${String(_exhaustive)}`);
    }
  }
}

/** Formats liters with Indian-style grouping for display. */
export function formatLiters(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatSignedLiters(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = formatLiters(Math.abs(n));
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return "0";
}

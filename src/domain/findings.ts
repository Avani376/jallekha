/**
 * Duplicate-candidate detection and finding construction. A candidate is
 * review input, not proof: exact means same site + supplier + receipt number;
 * fuzzy means same supplier and volume within 24 h with a receipt missing.
 * Flagged rows stay in as-recorded totals until a reviewer voids one with a
 * documented reason — nothing is auto-deleted.
 */

import type { Delivery, Finding, FindingSeverity, FindingType } from "./types";
import { stableHash } from "./hash";
import { formatLiters } from "./units";

const FUZZY_WINDOW_MS = 24 * 60 * 60 * 1000;

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Content-derived, deterministic finding ID (no mutable counter). */
function findingId(type: string, sourceIds: string[], detail: string): string {
  const kind = type.replace(/[^a-z]+/g, "");
  return `find-${kind}-${stableHash(`${sourceIds.slice().sort().join("|")}|${detail}`)}`;
}

export function makeFinding(
  type: FindingType,
  severity: FindingSeverity,
  title: string,
  detail: string,
  sourceIds: string[],
  suggestedAction: string,
  extra?: Pick<Finding, "matchFields" | "matchKind">,
): Finding {
  return {
    id: findingId(type, sourceIds, detail),
    type,
    severity,
    title,
    detail,
    sourceIds,
    suggestedAction,
    ...extra,
  };
}

/** Exact: same site + supplier + non-null receipt number. */
export function detectExactDuplicateCandidates(
  deliveries: Delivery[],
): { a: Delivery; b: Delivery }[] {
  const posted = deliveries.filter((d) => d.status === "posted");
  const groups = new Map<string, Delivery[]>();
  for (const d of posted) {
    if (!d.receiptNumber) continue;
    const key = `${d.siteId}|${norm(d.supplierLabel)}|${norm(d.receiptNumber)}`;
    const arr = groups.get(key) ?? [];
    arr.push(d);
    groups.set(key, arr);
  }
  const pairs: { a: Delivery; b: Delivery }[] = [];
  for (const arr of groups.values()) {
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        pairs.push({ a: arr[i], b: arr[j] });
      }
    }
  }
  return pairs;
}

/**
 * Fuzzy: same supplier + same normalized volume + deliveries within 24h,
 * where at least one record lacks a receipt number (so exact matching is
 * impossible). This is a review cue only and says so.
 */
export function detectFuzzyDuplicateCandidates(
  deliveries: Delivery[],
): { a: Delivery; b: Delivery }[] {
  const posted = deliveries.filter((d) => d.status === "posted");
  const exactPairs = new Set(
    detectExactDuplicateCandidates(deliveries).map(
      (p) => [p.a.id, p.b.id].sort().join("--"),
    ),
  );
  const pairs: { a: Delivery; b: Delivery }[] = [];
  for (let i = 0; i < posted.length; i += 1) {
    for (let j = i + 1; j < posted.length; j += 1) {
      const a = posted[i];
      const b = posted[j];
      if (a.siteId !== b.siteId) continue;
      if (norm(a.supplierLabel) !== norm(b.supplierLabel)) continue;
      if (a.quantityLiters !== b.quantityLiters) continue;
      const dt = Math.abs(
        new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime(),
      );
      if (dt > FUZZY_WINDOW_MS) continue;
      const pairKey = [a.id, b.id].sort().join("--");
      if (exactPairs.has(pairKey)) continue;
      pairs.push({ a, b });
    }
  }
  return pairs;
}

export function duplicateFindings(deliveries: Delivery[]): Finding[] {
  const out: Finding[] = [];
  for (const p of detectExactDuplicateCandidates(deliveries)) {
    const sameQty = p.a.quantityLiters === p.b.quantityLiters;
    out.push(
      makeFinding(
        "duplicate-candidate",
        "warning",
        "Possible duplicate delivery record",
        `Records ${p.a.id} and ${p.b.id} share the same supplier ("${p.a.supplierLabel}"), receipt number "${p.a.receiptNumber}" and site${sameQty ? `, and both record ${formatLiters(p.a.quantityLiters)} L` : ``}. One may be a repeated entry of the same delivery, but identical receipts can also be legitimate re-records. Both records remain in the as-recorded total until a reviewer voids one with a reason.`,
        [p.a.id, p.b.id],
        "Open the two records, compare receipt details with the physical receipt, and void the repeated record with a documented reason if confirmed.",
        { matchFields: ["supplier", "receipt number", "site"], matchKind: "exact" },
      ),
    );
  }
  for (const p of detectFuzzyDuplicateCandidates(deliveries)) {
    out.push(
      makeFinding(
        "duplicate-candidate",
        "info",
        "Delivery records need a receipt check",
        `Records ${p.a.id} and ${p.b.id} have the same supplier and volume (${formatLiters(p.a.quantityLiters)} L) within 24 hours, but at least one has no receipt number, so this cannot be confirmed as a duplicate. Legitimate top-up deliveries can look identical.`,
        [p.a.id, p.b.id],
        "Attach the receipt number(s) for both records or verify with the supplier log before deciding.",
        { matchFields: ["supplier", "volume", "time window"], matchKind: "fuzzy" },
      ),
    );
  }
  return out;
}

export function balanceFindingForStatus(
  status: "within-uncertainty" | "discrepancy",
  residual: number,
  bounds: { min: number; max: number },
  scopeAssumption: string,
): Finding {
  if (status === "within-uncertainty") {
    return makeFinding(
      "balance-within-uncertainty",
      "info",
      "Balance within stated measurement uncertainty",
      `Residual ${formatLiters(residual)} L with conservative bounds [${formatLiters(bounds.min)}, ${formatLiters(bounds.max)}] L contains zero, so the records are consistent with measurement error under the stated bounds. ${scopeAssumption} Record-level findings above, if any, still need review.`,
      [],
      "No balance investigation required; resolve any record-level findings.",
    );
  }
  return makeFinding(
    "balance-outside-uncertainty",
    "high",
    "Residual outside stated measurement uncertainty",
    `Residual ${formatLiters(residual)} L lies outside the conservative bounds [${formatLiters(bounds.min)}, ${formatLiters(bounds.max)}] L, so the imbalance is larger than the declared measurement error can explain. ${scopeAssumption} The cause is NOT determined: this is not proof of theft, leakage or supplier error. Possible explanations include an unrecorded delivery, a measurement-coverage gap, an entry error, or a physical issue.`,
    [],
    "Verify that the meter covers all outflow, re-check both stock readings, review other inflows/outflows, and arrange a physical inspection only if the review warrants it.",
  );
}

export function missingReadingFinding(field: string): Finding {
  const labels: Record<string, { title: string; action: string }> = {
    openingStockReading: {
      title: "Opening stock reading missing",
      action: "Record the tank stock at the period start instant, then recompute.",
    },
    closingStockReading: {
      title: "Closing stock reading missing",
      action: "Record the tank stock at the period end instant, then recompute.",
    },
    meterStartReading: {
      title: "Meter reading at period start missing",
      action: "Record the cumulative meter value at the period start instant, then recompute.",
    },
    meterEndReading: {
      title: "Meter reading at period end missing",
      action: "Record the cumulative meter value at the period end instant, then recompute.",
    },
  };
  const l = labels[field] ?? { title: `Missing reading: ${field}`, action: "Record the missing reading, then recompute." };
  return makeFinding(
    "missing-reading",
    "warning",
    l.title,
    `${l.title}. The residual cannot be calculated without it, so no balance is asserted — a missing measurement is not a discrepancy and must not be treated as zero.`,
    [],
    l.action,
  );
}

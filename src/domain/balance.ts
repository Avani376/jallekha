/**
 * JalLekha deterministic reconciliation engine (rule version recon-v1.0).
 *
 * For one tank and one fully covered period:
 *
 *   R = opening stock O + recorded inflows D - measured outflows U - closing stock C
 *
 * O and C are STOCK quantities at the boundary instants. D and U are FLOW
 * totals inside the [start, end) period. Conservative interval bounds:
 *
 *   R_min = O_min + D_min - U_max - C_max
 *   R_max = O_max + D_max - U_min - C_min
 *
 * No root-sum-square: bounds are summed conservatively, which is an
 * operational assumption, not a calibrated confidence interval.
 *
 * Status precedence (higher blocks lower):
 *   1. invalid            - blocking input/coverage problems
 *   2. incomplete         - required boundary reading absent -> NO residual
 *   3. complete-unknown-bounds - residual provisional, uncertainty unquantified
 *   4. within-uncertainty - bounds contain zero (other findings retained)
 *   5. discrepancy        - bounds exclude zero (cause NOT determined)
 *
 * Duplicate and record-validation checks run even when no balance can be
 * calculated. This engine never asserts theft, leakage or any cause, never
 * substitutes zero for a missing reading, and never clamps bad values.
 */

import {
  balanceFindingForStatus,
  duplicateFindings,
  makeFinding,
  missingReadingFinding,
} from "./findings";
import type {
  CompletenessState,
  Delivery,
  Finding,
  InputProvenance,
  Meter,
  ReconciliationResult,
  Tank,
  TankReading,
  UsageReading,
} from "./types";
import { formatLiters, roundLiters } from "./units";

export const RECONCILIATION_RULE_VERSION = "recon-v1.0";
export const BOUNDARY_CONVENTION = "start-inclusive-end-exclusive";

export interface ReconcileInput {
  siteId: string;
  tankId: string;
  meterId: string;
  periodStart: string; // ISO UTC instant
  periodEnd: string; // ISO UTC instant
  deliveries: Delivery[];
  tankReadings: TankReading[];
  usageReadings: UsageReading[];
  tanks: Tank[];
  meters: Meter[];
  generatedAt?: string; // injectable for deterministic tests
  runId?: string;
}

function missingState(o: boolean, c: boolean, ms: boolean, me: boolean): CompletenessState {
  const missingFields: string[] = [];
  if (!o) missingFields.push("openingStockReading");
  if (!c) missingFields.push("closingStockReading");
  if (!ms) missingFields.push("meterStartReading");
  if (!me) missingFields.push("meterEndReading");
  return { openingReading: o, closingReading: c, meterStart: ms, meterEnd: me, missingFields };
}

/**
 * Runs reconciliation. MVP requires the boundary readings to be at the exact
 * period instants (tolerance 0); a visible note says so. Ambiguous duplicate
 * boundary readings are blocking, never silently averaged.
 */
export function reconcile(input: ReconcileInput): ReconciliationResult {
  const {
    siteId, tankId, meterId, periodStart, periodEnd,
    deliveries, tankReadings, usageReadings, tanks, meters,
  } = input;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const invalidReasons: string[] = [];
  const findings: Finding[] = [];
  const t0 = Date.parse(periodStart);
  const t1 = Date.parse(periodEnd);
  const runId = input.runId ?? `run-${periodStart}-${periodEnd}-${tankId}`;

  // --- Period validity -----------------------------------------------------
  if (Number.isNaN(t0) || Number.isNaN(t1)) {
    invalidReasons.push("Period start/end are not valid timestamps.");
  } else if (t1 <= t0) {
    invalidReasons.push("Period end must be after period start.");
  }

  // --- Coverage: tank and meter must exist within the site -----------------
  const tank = tanks.find((tk) => tk.id === tankId);
  const meter = meters.find((m) => m.id === meterId);
  if (!tank || tank.siteId !== siteId) {
    invalidReasons.push(`Tank ${tankId} not found in site ${siteId}; cross-site joins are rejected.`);
  }
  if (!meter || meter.siteId !== siteId) {
    invalidReasons.push(`Meter ${meterId} not found in site ${siteId}; cross-site joins are rejected.`);
  }
  if (meter && meter.type !== "cumulative") {
    invalidReasons.push(`Meter ${meterId} is not cumulative; interval meters need explicit support.`);
  }
  if (invalidReasons.length > 0) {
    findings.push(
      makeFinding(
        "incomplete-coverage",
        "high",
        "Reconciliation coverage invalid",
        invalidReasons.join(" "),
        [],
        "Fix the tank/meter configuration for this site before running a balance.",
      ),
    );
  }

  // --- Defensive record validation (never clamp, never guess) --------------
  for (const d of deliveries) {
    if (d.siteId !== siteId || d.tankId !== tankId) {
      invalidReasons.push(
        `Delivery ${d.id} belongs to a different site/tank and was not joined.`,
      );
      continue;
    }
    if (!Number.isFinite(d.quantityLiters) || d.quantityLiters < 0) {
      invalidReasons.push(`Delivery ${d.id} has an invalid quantity (${d.quantityLiters} L).`);
      findings.push(
        makeFinding(
          "invalid-reading",
          "high",
          `Invalid delivery quantity on ${d.id}`,
          `Recorded quantity ${d.quantityLiters} L is negative or not a number. The record is excluded from totals and must be corrected or voided by a reviewer.`,
          [d.id],
          "Correct the record with a documented correction or void it with a reason.",
        ),
      );
    }
  }
  for (const tr of tankReadings) {
    if (tr.siteId !== siteId || tr.tankId !== tankId) continue;
    if (tank && tr.stockLiters > tank.capacityLiters) {
      invalidReasons.push(
        `Reading ${tr.id} records ${formatLiters(tr.stockLiters)} L, above the tank capacity of ${formatLiters(tank.capacityLiters)} L.`,
      );
      findings.push(
        makeFinding(
          "invalid-reading",
          "high",
          `Stock reading exceeds tank capacity (${tr.id})`,
          `Stock ${formatLiters(tr.stockLiters)} L > capacity ${formatLiters(tank.capacityLiters)} L. The value was NOT clamped; the reading must be re-measured or corrected.`,
          [tr.id],
          "Re-measure and record a corrected reading; keep the original in history.",
        ),
      );
    }
  }
  const startUsage = usageReadings.find(
    (u) => u.siteId === siteId && u.meterId === meterId && Date.parse(u.observedAt) === t0,
  );
  const endUsage = usageReadings.find(
    (u) => u.siteId === siteId && u.meterId === meterId && Date.parse(u.observedAt) === t1,
  );
  if (startUsage && endUsage) {
    const delta = roundLiters(endUsage.cumulativeLiters - startUsage.cumulativeLiters);
    if (delta < 0) {
      invalidReasons.push(
        `Meter ${meterId} went backwards across the period (${formatLiters(startUsage.cumulativeLiters)} -> ${formatLiters(endUsage.cumulativeLiters)} L). A negative delta is not used as usage; it needs a documented reset/rollover record.`,
      );
      findings.push(
        makeFinding(
          "invalid-reading",
          "high",
          "Cumulative meter decreased across the period",
          `The meter delta is ${formatLiters(delta)} L. JalLekha never takes the absolute value of a negative delta; document the reset/rollover with evidence, then correct the records.`,
          [startUsage.id, endUsage.id],
          "Document the meter reset with evidence or correct the mis-entered reading.",
        ),
      );
    }
  }

  // --- Boundary readings (exact instant match, MVP tolerance 0) ------------
  const readingsForTank = tankReadings.filter(
    (tr) => tr.siteId === siteId && tr.tankId === tankId,
  );
  const openingReadings = readingsForTank.filter((tr) => Date.parse(tr.observedAt) === t0);
  const closingReadings = readingsForTank.filter((tr) => Date.parse(tr.observedAt) === t1);
  let opening: TankReading | undefined;
  let closing: TankReading | undefined;
  if (openingReadings.length > 1) {
    invalidReasons.push("Multiple opening stock readings exist at the exact period start; ambiguous input.");
  } else opening = openingReadings[0];
  if (closingReadings.length > 1) {
    invalidReasons.push("Multiple closing stock readings exist at the exact period end; ambiguous input.");
  } else closing = closingReadings[0];

  // --- Posted deliveries inside [start, end) -------------------------------
  const inPeriod = deliveries.filter((d) => {
    const t = Date.parse(d.deliveredAt);
    return d.siteId === siteId && d.tankId === tankId && t >= t0 && t < t1;
  });
  const posted = inPeriod.filter((d) => d.status === "posted");
  const deliveriesTotal = roundLiters(
    posted.reduce((acc, d) => acc + (Number.isFinite(d.quantityLiters) && d.quantityLiters >= 0 ? d.quantityLiters : 0), 0),
  );

  // --- Completeness ---------------------------------------------------------
  const completeness = missingState(!!opening, !!closing, !!startUsage, !!endUsage);

  // --- Record-level findings run regardless of balance availability ---------
  findings.push(...duplicateFindings(deliveries.filter((d) => d.siteId === siteId)));
  for (const f of completeness.missingFields) {
    findings.push(missingReadingFinding(f));
  }

  // --- Provenance -----------------------------------------------------------
  const inputs: InputProvenance[] = [];
  if (opening) {
    inputs.push({
      id: opening.id, kind: "opening-reading", label: "Opening stock (boundary)",
      liters: opening.stockLiters, uncertaintyLiters: opening.uncertaintyLiters,
      quality: opening.quality, sourceReference: opening.sourceReference,
    });
  }
  for (const d of inPeriod) {
    inputs.push({
      id: d.id, kind: "delivery",
      label: `Delivery ${d.receiptNumber ? `#${d.receiptNumber}` : "(no receipt)"} — ${d.supplierLabel}`,
      liters: d.quantityLiters, uncertaintyLiters: d.uncertaintyLiters,
      quality: d.quality, sourceReference: d.sourceReference, status: d.status,
    });
  }
  if (startUsage) {
    inputs.push({
      id: startUsage.id, kind: "meter-start", label: "Meter at period start (cumulative)",
      liters: startUsage.cumulativeLiters, uncertaintyLiters: startUsage.uncertaintyLiters,
      quality: startUsage.quality, sourceReference: startUsage.sourceReference,
    });
  }
  if (endUsage) {
    inputs.push({
      id: endUsage.id, kind: "meter-end", label: "Meter at period end (cumulative)",
      liters: endUsage.cumulativeLiters, uncertaintyLiters: endUsage.uncertaintyLiters,
      quality: endUsage.quality, sourceReference: endUsage.sourceReference,
    });
  }
  if (closing) {
    inputs.push({
      id: closing.id, kind: "closing-reading", label: "Closing stock (boundary)",
      liters: closing.stockLiters, uncertaintyLiters: closing.uncertaintyLiters,
      quality: closing.quality, sourceReference: closing.sourceReference,
    });
  }

  const scopeAssumption =
    `Scope: tanker deliveries recorded in the ledger are the only inflow, and meter ` +
    `${meter ? `"${meter.name}"` : meterId} (${meter?.boundaryDescription ?? "coverage unstated"}) is assumed to cover all measured outflow for tank ${tank?.name ?? tankId}. ` +
    `Boundary readings must sit at the exact period instants (tolerance 0 in recon-v1.0).`;

  const base = {
    id: runId,
    siteId, tankId, meterId, periodStart, periodEnd,
    boundaryConvention: BOUNDARY_CONVENTION,
    deliveriesTotalLiters: deliveriesTotal,
    deliveriesIncludedCount: posted.length,
    completeness,
    invalidReasons,
    scopeAssumption,
    inputs,
    ruleVersion: RECONCILIATION_RULE_VERSION,
    generatedAt,
  };

  // --- Status 1: invalid -----------------------------------------------------
  if (invalidReasons.length > 0) {
    return {
      ...base,
      status: "invalid",
      openingLiters: null, closingLiters: null, usageLiters: null,
      residualLiters: null, boundsLiters: null, uncertaintyQuantified: false,
      findings,
    };
  }

  // --- Status 2: incomplete (residual unavailable, never guessed) ------------
  if (completeness.missingFields.length > 0) {
    return {
      ...base,
      status: "incomplete",
      openingLiters: opening ? opening.stockLiters : null,
      closingLiters: closing ? closing.stockLiters : null,
      usageLiters: null,
      residualLiters: null, boundsLiters: null, uncertaintyQuantified: false,
      findings,
    };
  }

  // --- Compute residual and conservative bounds ------------------------------
  // Opening/closing are stock at the boundaries; usage = meter delta across
  // the exact same instants, so no boundary double counting occurs.
  const usage = roundLiters(endUsage!.cumulativeLiters - startUsage!.cumulativeLiters);
  const residuals = {
    openingLiters: opening!.stockLiters,
    closingLiters: closing!.stockLiters,
    usageLiters: usage,
  };
  const residual = roundLiters(
    opening!.stockLiters + deliveriesTotal - usage - closing!.stockLiters,
  );

  const unknownBounds =
    opening!.uncertaintyLiters === null ||
    closing!.uncertaintyLiters === null ||
    startUsage!.uncertaintyLiters === null ||
    endUsage!.uncertaintyLiters === null ||
    posted.some((d) => d.uncertaintyLiters === null);

  if (unknownBounds) {
    findings.push(
      makeFinding(
        "balance-within-uncertainty",
        "info",
        "Uncertainty not quantified",
        "At least one input has no declared measurement uncertainty, so no interval can be computed. The residual is provisional and must not be described as 'within uncertainty' using an invented error estimate.",
        [],
        "Record the measurement method and its stated uncertainty for every input, then recompute.",
      ),
    );
    return {
      ...base,
      status: "complete-unknown-bounds",
      ...residuals,
      residualLiters: residual,
      boundsLiters: null,
      uncertaintyQuantified: false,
      findings,
    };
  }

  // Conservative interval: sum absolute bounds; usage bound = meter bounds sum.
  const uO = opening!.uncertaintyLiters as number;
  const uC = closing!.uncertaintyLiters as number;
  const uU = roundLiters(
    (startUsage!.uncertaintyLiters as number) + (endUsage!.uncertaintyLiters as number),
  );
  const uD = roundLiters(
    posted.reduce((acc, d) => acc + (d.uncertaintyLiters as number), 0),
  );
  const dMin = roundLiters(deliveriesTotal - uD);
  const dMax = roundLiters(deliveriesTotal + uD);
  const boundsMin = roundLiters(
    opening!.stockLiters - uO + dMin - (usage + uU) - (closing!.stockLiters + uC),
  );
  const boundsMax = roundLiters(
    opening!.stockLiters + uO + dMax - (usage - uU) - (closing!.stockLiters - uC),
  );
  const bounds = { min: boundsMin, max: boundsMax };

  const within = bounds.min <= 0 && 0 <= bounds.max;
  const status: ReconciliationResult["status"] = within ? "within-uncertainty" : "discrepancy";
  if (!within) {
    findings.push(
      balanceFindingForStatus("discrepancy", residual, bounds, scopeAssumption),
    );
  } else if (completeness.missingFields.length === 0 && invalidReasons.length === 0) {
    // Info-level within-uncertainty finding keeps the result self-explaining,
    // while duplicate/record findings above remain visible.
    findings.push(
      balanceFindingForStatus("within-uncertainty", residual, bounds, scopeAssumption),
    );
  }

  return {
    ...base,
    status,
    ...residuals,
    residualLiters: residual,
    boundsLiters: bounds,
    uncertaintyQuantified: true,
    findings,
  };
}

export type ReconciliationResultStatus = ReconciliationResult["status"];

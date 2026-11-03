/**
 * IoT smart-meter ingestion. Device readings arrive as PENDING and require
 * operator verification before they become ledger records. Sensor-quality
 * checks: physical bounds, delta plausibility, staleness, and calibration
 * offset. A verified IoT reading carries quality "measured" with the device
 * id in the source reference — it is indistinguishable from a manual entry
 * in the reconciliation engine.
 *
 * The module is pure TypeScript: no network calls, no storage, no React.
 * The transport layer (MQTT bridge, HTTP webhook, or manual paste) feeds
 * raw payloads into ingestReading(); the store persists the result.
 */

import type { Tank, TankReading, UsageReading } from "./types";
import { roundLiters, validateQuantity } from "./units";

/* ------------------------------ device model ------------------------------ */

export interface IoTDevice {
  id: string;
  siteId: string;
  /** Which tank or meter this device reports for. */
  targetKind: "tank" | "meter";
  targetId: string;
  label: string;
  /** e.g. "Ultrasonic level sensor", "Smart water meter DJ-B01" */
  model: string;
  /** Last time this device reported (ISO UTC). */
  lastSyncAt: string | null;
  /** Operator-set calibration offset in litres (positive = add). */
  calibrationOffsetLiters: number;
  /** Device is actively reporting. */
  active: boolean;
}

/* ------------------------------- ingest model ----------------------------- */

export interface IoTIngest {
  id: string;
  deviceId: string;
  siteId: string;
  targetKind: "tank" | "meter";
  targetId: string;
  /** Raw value reported by the device (before calibration). */
  rawValue: number;
  /** ISO UTC timestamp from the device. */
  reportedAt: string;
  /** When the platform received it. */
  receivedAt: string;
  status: "pending" | "verified" | "rejected";
  qualityChecks: SensorQualityCheck[];
  rejectReason?: string;
  /** The verified record id after acceptance. */
  verifiedRecordId?: string;
}

export interface SensorQualityCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export type IngestResult =
  | { accepted: true; ingest: IoTIngest; checks: SensorQualityCheck[] }
  | { accepted: false; ingest: IoTIngest; checks: SensorQualityCheck[]; errors: string[] };

/* ------------------------------ registration ------------------------------ */

export function registerDevice(
  devices: IoTDevice[],
  input: { siteId: string; targetKind: "tank" | "meter"; targetId: string; label: string; model: string; calibrationOffsetLiters?: number },
  now: string,
): { device: IoTDevice; error: string | null } {
  if (!input.siteId || !input.targetId) return { device: null!, error: "Site and target are required." };
  if (!input.label.trim()) return { device: null!, error: "Device label is required." };
  const dup = devices.find((d) => d.targetId === input.targetId && d.active);
  if (dup) return { device: null!, error: `An active device already reports for target ${input.targetId}.` };
  const device: IoTDevice = {
    id: `iot-${hash(input.siteId + input.targetId + input.label + now)}`,
    siteId: input.siteId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    label: input.label.trim(),
    model: input.model.trim() || "unknown",
    lastSyncAt: null,
    calibrationOffsetLiters: input.calibrationOffsetLiters ?? 0,
    active: true,
  };
  return { device, error: null };
}

/* --------------------------- sensor quality checks ------------------------ */

export function ingestReading(
  device: IoTDevice,
  rawValue: number,
  reportedAt: string,
  receivedAt: string,
  tank: Tank | undefined,
  lastReading: TankReading | UsageReading | undefined,
): IngestResult {
  const checks: SensorQualityCheck[] = [];
  const ingestId = `iot-ing-${hash(device.id + reportedAt + String(rawValue))}`;
  let calibrated = rawValue + device.calibrationOffsetLiters;

  // 1. Value is a valid number
  try {
    calibrated = validateQuantity(calibrated, "sensor value");
    checks.push({ check: "value-valid", passed: true, detail: `${fmt(calibrated)} L` });
  } catch (e) {
    checks.push({ check: "value-valid", passed: false, detail: (e as Error).message });
    return reject(ingestId, device, rawValue, reportedAt, receivedAt, checks);
  }

  // 2. Staleness: reportedAt should be within the last 48 hours
  const staleness = Date.parse(receivedAt) - Date.parse(reportedAt);
  const stale = staleness > 48 * 3600_000;
  checks.push({
    check: "staleness",
    passed: !stale,
    detail: stale ? `device reported ${Math.round(staleness / 3600_000)}h ago` : "fresh reading",
  });

  // 3. Tank-specific: capacity bound
  if (device.targetKind === "tank" && tank != null) {
    const within = calibrated >= 0 && calibrated <= (tank as Tank).capacityLiters;
    checks.push({
      check: "capacity-bounds",
      passed: within,
      detail: within ? `${fmt(calibrated)} L of ${fmt(tank.capacityLiters)} L capacity` : `${fmt(calibrated)} L exceeds capacity ${fmt(tank.capacityLiters)} L`,
    });
    if (!within) return reject(ingestId, device, rawValue, reportedAt, receivedAt, checks);
  }

  // 4. Delta plausibility (meter only): delta should be positive and less than some huge bound
  if (device.targetKind === "meter" && lastReading && "cumulativeLiters" in lastReading) {
    const delta = calibrated - lastReading.cumulativeLiters;
    const plausible = delta >= 0 && delta < 500_000; // half a million litres in one interval is extreme
    checks.push({
      check: "delta-plausible",
      passed: plausible,
      detail: plausible ? `+${fmt(delta)} L since last reading` : `delta ${fmt(delta)} L is implausible`,
    });
    if (!plausible) return reject(ingestId, device, rawValue, reportedAt, receivedAt, checks);
  }

  // 5. Tank-specific: delta from last stock reading (drain/refill range)
  if (device.targetKind === "tank" && tank != null && lastReading && "stockLiters" in lastReading) {
    const delta = Math.abs(calibrated - lastReading.stockLiters);
    const plausible = delta <= tank.capacityLiters;
    checks.push({
      check: "delta-plausible",
      passed: plausible,
      detail: `${fmt(delta)} L change since last reading`,
    });
  }

  const ingest: IoTIngest = {
    id: ingestId,
    deviceId: device.id,
    siteId: device.siteId,
    targetKind: device.targetKind,
    targetId: device.targetId,
    rawValue,
    reportedAt,
    receivedAt,
    status: "pending",
    qualityChecks: checks,
  };
  return { accepted: true, ingest, checks };
}

function reject(id: string, device: IoTDevice, rawValue: number, reportedAt: string, receivedAt: string, checks: SensorQualityCheck[]): IngestResult {
  return {
    accepted: false,
    ingest: { id, deviceId: device.id, siteId: device.siteId, targetKind: device.targetKind, targetId: device.targetId, rawValue, reportedAt, receivedAt, status: "rejected", qualityChecks: checks },
    checks,
    errors: checks.filter((c) => !c.passed).map((c) => `${c.check}: ${c.detail}`),
  };
}

/* --------------------------- verification → ledger ------------------------ */

/**
 * Converts a verified IoT ingest into a proper TankReading or UsageReading
 * for the ledger. The reading carries quality "measured" with the device
 * label in the source reference — the engine treats it identically to a
 * manual entry.
 */
export function toLedgerReading(
  ingest: IoTIngest,
  device: IoTDevice,
  actor: string,
  now: string,
): TankReading | UsageReading {
  const calibrated = roundLiters(ingest.rawValue + device.calibrationOffsetLiters);
  const sourceRef = `IoT device ${device.label} (${device.model})`;
  if (device.targetKind === "tank") {
    return {
      id: `tr-${ingest.id}`,
      siteId: ingest.siteId,
      tankId: device.targetId,
      observedAt: ingest.reportedAt,
      stockLiters: calibrated,
      method: `IoT: ${device.model}`,
      uncertaintyLiters: 50, // IoT sensors are typically more precise than dipsticks
      quality: "measured",
      sourceReference: sourceRef,
      createdBy: actor,
      createdAt: now,
    };
  }
  return {
    id: `ur-${ingest.id}`,
    siteId: ingest.siteId,
    meterId: device.targetId,
    observedAt: ingest.reportedAt,
    sourceValue: calibrated,
    sourceUnit: "L",
    cumulativeLiters: calibrated,
    uncertaintyLiters: 50,
    quality: "measured",
    sourceReference: sourceRef,
    createdBy: actor,
    createdAt: now,
  };
}

/* ------------------------------ stale detection ---------------------------- */

export function isStale(device: IoTDevice, now: string, maxHours = 48): boolean {
  if (!device.lastSyncAt) return true;
  return Date.parse(now) - Date.parse(device.lastSyncAt) > maxHours * 3600_000;
}

/* ------------------------------ helpers ----------------------------------- */

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

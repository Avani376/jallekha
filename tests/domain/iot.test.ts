import { describe, expect, it } from "vitest";
import {
  registerDevice, ingestReading, toLedgerReading, isStale,
} from "../../src/domain/iot";
import type { IoTDevice } from "../../src/domain/iot";
import type { Tank, TankReading, UsageReading } from "../../src/domain/types";

const TANK: Tank = { id: "tank-T01", siteId: "site-x", name: "T-01", capacityLiters: 20000 };
const NOW = "2026-10-30T10:00:00Z";
const REPORTED = "2026-10-30T09:55:00Z";

function device(kind: "tank" | "meter", overrides: Partial<IoTDevice> = {}): IoTDevice {
  return {
    id: "iot-1", siteId: "site-x",
    targetKind: kind, targetId: kind === "tank" ? "tank-T01" : "meter-M01",
    label: "Test Sensor", model: "UltraSense v2",
    lastSyncAt: NOW, calibrationOffsetLiters: 0, active: true,
    ...overrides,
  };
}

function lastTank(stock: number): TankReading {
  return { id: "tr-prev", siteId: "site-x", tankId: "tank-T01", observedAt: "2026-10-29T10:00:00Z",
    stockLiters: stock, method: "dipstick", uncertaintyLiters: 100, quality: "measured", createdBy: "t", createdAt: "t" };
}

function lastMeter(cum: number): UsageReading {
  return { id: "ur-prev", siteId: "site-x", meterId: "meter-M01", observedAt: "2026-10-29T10:00:00Z",
    sourceValue: cum, sourceUnit: "L", cumulativeLiters: cum, uncertaintyLiters: 100, quality: "measured", createdBy: "t", createdAt: "t" };
}

describe("IoT device registration", () => {
  it("registers a device with valid input", () => {
    const { device, error } = registerDevice([], { siteId: "site-x", targetKind: "tank", targetId: "tank-T01", label: "Level Sensor", model: "US-v2" }, NOW);
    expect(error).toBeNull();
    expect(device.label).toBe("Level Sensor");
  });
  it("rejects duplicate active device for same target", () => {
    const existing = [device("tank")];
    const { error } = registerDevice(existing, { siteId: "site-x", targetKind: "tank", targetId: "tank-T01", label: "Another", model: "X" }, NOW);
    expect(error).toMatch(/already reports/);
  });
  it("rejects empty label", () => {
    const { error } = registerDevice([], { siteId: "site-x", targetKind: "tank", targetId: "tank-T01", label: "  ", model: "X" }, NOW);
    expect(error).toMatch(/label is required/);
  });
});

describe("IoT reading ingestion — tank", () => {
  it("accepts a valid stock reading within capacity", () => {
    const dev = device("tank");
    const r = ingestReading(dev, 12000, REPORTED, NOW, TANK, lastTank(11000));
    expect(r.accepted).toBe(true);
    if (r.accepted) {
      expect(r.ingest.status).toBe("pending");
      expect(r.ingest.qualityChecks.every((c) => c.passed)).toBe(true);
    }
  });

  it("rejects a stock reading above capacity (no clamping)", () => {
    const dev = device("tank");
    const r = ingestReading(dev, 25000, REPORTED, NOW, TANK, undefined);
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.errors.join(" ")).toMatch(/exceeds capacity/);
  });

  it("applies calibration offset (positive = add)", () => {
    const dev = device("tank", { calibrationOffsetLiters: 250 });
    const r = ingestReading(dev, 11750, REPORTED, NOW, TANK, undefined);
    if (r.accepted) {
      const reading = toLedgerReading(r.ingest, dev, "op", NOW);
      expect((reading as TankReading).stockLiters).toBe(12000);
    }
  });

  it("flags implausible tank delta (drain more than capacity)", () => {
    const dev = device("tank");
    const prev = lastTank(19000);
    const r = ingestReading(dev, 100, REPORTED, NOW, TANK, prev);
    // 100 L from 19000 = 18900 L drop, plausible within capacity
    expect(r.accepted).toBe(true);
  });
});

describe("IoT reading ingestion — meter", () => {
  it("accepts a valid cumulative meter reading", () => {
    const dev = device("meter");
    const r = ingestReading(dev, 104000, REPORTED, NOW, undefined, lastMeter(100000));
    expect(r.accepted).toBe(true);
  });

  it("rejects a cumulative meter going backwards", () => {
    const dev = device("meter");
    const r = ingestReading(dev, 98000, REPORTED, NOW, undefined, lastMeter(100000));
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.errors.join(" ")).toMatch(/implausible/);
  });

  it("rejects a meter delta over 500,000 L in one interval", () => {
    const dev = device("meter");
    const r = ingestReading(dev, 600000, REPORTED, NOW, undefined, lastMeter(100000));
    expect(r.accepted).toBe(false);
  });
});

describe("IoT staleness", () => {
  it("detects a stale device (>48h since last sync)", () => {
    const dev = device("tank", { lastSyncAt: "2026-10-28T00:00:00Z" });
    expect(isStale(dev, NOW)).toBe(true);
  });
  it("does not flag a fresh device", () => {
    const dev = device("tank", { lastSyncAt: NOW });
    expect(isStale(dev, NOW)).toBe(false);
  });
  it("flags a device that has never reported", () => {
    const dev = device("tank", { lastSyncAt: null });
    expect(isStale(dev, NOW)).toBe(true);
  });
});

describe("IoT → ledger conversion", () => {
  it("creates a TankReading with quality 'measured' and device source ref", () => {
    const dev = device("tank");
    const r = ingestReading(dev, 12000, REPORTED, NOW, TANK, undefined);
    if (!r.accepted) throw new Error("should accept");
    const reading = toLedgerReading(r.ingest, dev, "op", NOW) as TankReading;
    expect(reading.stockLiters).toBe(12000);
    expect(reading.quality).toBe("measured");
    expect(reading.sourceReference).toMatch(/IoT device/);
    expect(reading.method).toMatch(/IoT/);
  });
  it("creates a UsageReading for meter devices", () => {
    const dev = device("meter");
    const r = ingestReading(dev, 104000, REPORTED, NOW, undefined, lastMeter(100000));
    if (!r.accepted) throw new Error("should accept");
    const reading = toLedgerReading(r.ingest, dev, "op", NOW) as UsageReading;
    expect(reading.cumulativeLiters).toBe(104000);
    expect(reading.meterId).toBe("meter-M01");
  });
});

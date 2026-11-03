"use client";

/**
 * IoT device management + pending reading queue on the Readings screen.
 * Devices are registered per site; readings arrive as PENDING and require
 * operator verification before they become ledger records.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { isStale } from "@/domain/iot";

import { istDate } from "@/lib/datetime";
import { Button, Card, Field, Input, Select, StatusPill, EmptyState } from "./ui";
import { formatLiters } from "@/domain/units";

export function IoTDevicesSection() {
  const { state, iotDevices, iotIngests, selectedSiteId, actions } = useWorkspace();
  const [showReg, setShowReg] = useState(false);
  const [regForm, setRegForm] = useState({ label: "", model: "", targetKind: "tank" as "tank" | "meter", targetId: "", calibration: "0" });
  const [regErr, setRegErr] = useState<string | null>(null);

  const siteDevices = iotDevices.filter((d) => d.siteId === selectedSiteId);
  const pendingIngests = iotIngests.filter(
    (i) => i.siteId === selectedSiteId && i.status === "pending"
  );
  const deviceName = (id: string) => iotDevices.find((d) => d.id === id)?.label ?? id;

  return (
    <Card className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-ink">IoT smart devices</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Connected sensors report readings automatically. Every reading requires operator verification before it
            enters the ledger — sensor-quality checks run on arrival.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowReg(!showReg)}>
          {showReg ? "Cancel" : "+ Register device"}
        </Button>
      </div>

      {showReg ? (
        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <Field label="Device label" htmlFor="iot-label" required>
            <Input id="iot-label" value={regForm.label} onChange={(e) => setRegForm({ ...regForm, label: e.target.value })} placeholder="Terrace level sensor" />
          </Field>
          <Field label="Model" htmlFor="iot-model">
            <Input id="iot-model" value={regForm.model} onChange={(e) => setRegForm({ ...regForm, model: e.target.value })} placeholder="UltraSense v2" />
          </Field>
          <Field label="Reports for" htmlFor="iot-kind" required>
            <Select id="iot-kind" value={regForm.targetKind} onChange={(e) => setRegForm({ ...regForm, targetKind: e.target.value as "tank" | "meter", targetId: "" })}>
              <option value="tank">Tank stock level</option>
              <option value="meter">Cumulative meter</option>
            </Select>
          </Field>
          <Field label="Target" htmlFor="iot-target" required>
            <Select id="iot-target" value={regForm.targetId} onChange={(e) => setRegForm({ ...regForm, targetId: e.target.value })}>
              <option value="">Select…</option>
              {(regForm.targetKind === "tank" ? state.tanks : state.meters)
                .filter((t) => t.siteId === selectedSiteId)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </Select>
          </Field>
          <Field label="Calibration offset (±L)" htmlFor="iot-cal" hint="Added to raw readings. Use to align with a manual reference.">
            <Input id="iot-cal" type="number" value={regForm.calibration} onChange={(e) => setRegForm({ ...regForm, calibration: e.target.value })} />
          </Field>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={() => {
                const id = actions.registerIoTDevice(
                  { siteId: selectedSiteId, targetKind: regForm.targetKind, targetId: regForm.targetId, label: regForm.label, model: regForm.model, calibrationOffsetLiters: Number(regForm.calibration) || 0 },
                  "operator@local"
                );
                if (id) { setShowReg(false); setRegErr(null); }
                else setRegErr("Registration failed — check the target and label.");
              }}
            >
              Register device
            </Button>
          </div>
          {regErr ? <p role="alert" className="sm:col-span-2 text-xs font-semibold text-danger">{regErr}</p> : null}
        </div>
      ) : null}

      {/* Device list */}
      {siteDevices.length === 0 ? (
        <EmptyState title="No IoT devices registered" body="Register a device to receive automatic readings. Sensor data always requires manual verification before entering the ledger." />
      ) : (
        <div className="space-y-2">
          {siteDevices.map((d) => {
            const stale = isStale(d, new Date().toISOString());
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5">
                <span className="text-lg" aria-hidden>{d.targetKind === "tank" ? "🛢" : "⏱"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink">{d.label}</p>
                  <p className="text-[11px] text-slate-400">
                    {d.model} · {d.targetKind === "tank" ? "stock level" : "cumulative meter"} · calibration {d.calibrationOffsetLiters >= 0 ? "+" : ""}{d.calibrationOffsetLiters} L
                  </p>
                </div>
                {stale ? <StatusPill tone="warn">stale — no sync in 48h</StatusPill> : <StatusPill tone="ok">active</StatusPill>}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending readings queue */}
      {pendingIngests.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-400">
            Pending readings — require verification ({pendingIngests.length})
          </p>
          <ul className="space-y-2">
            {pendingIngests.map((ing) => (
              <li key={ing.id} className="rounded-xl border border-amber/40 bg-amber-soft/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-ink">
                      {deviceName(ing.deviceId)} → {formatLiters(ing.rawValue + (iotDevices.find((d) => d.id === ing.deviceId)?.calibrationOffsetLiters ?? 0))} L
                    </p>
                    <p className="text-[11px] text-slate-400">reported {istDate(ing.reportedAt)} IST</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => actions.verifyIoTReading(ing.id, "operator@local")}>
                      Verify & save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => actions.rejectIoTReading(ing.id, "operator rejected sensor reading", "operator@local")}>
                      Reject
                    </Button>
                  </div>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {ing.qualityChecks.map((c, ci) => (
                    <li key={ci} className={`text-[11px] font-semibold ${c.passed ? "text-verd" : "text-danger"}`}>
                      {c.passed ? "✓" : "✗"} {c.check}: {c.detail}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}


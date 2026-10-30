"use client";

/**
 * Readings screen: clear stock-vs-meter vocabulary, unit help, exact-boundary
 * note, and add forms that never accept NaN/negative/over-capacity values.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { Card, CardHeader, Button, Field, Input, Select, Textarea, Modal, StatusPill } from "@/components/ui";
import { formatLiters } from "@/domain/units";
import { istDate, istToUtc } from "@/app/workspace/ledger/page";
import { DEMO_PERIOD } from "@/data/seed";
import type { Quality } from "@/domain/types";

export default function ReadingsPage() {
  const { state, selectedSiteId } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const meter = state.meters.find((m) => m.siteId === site.id)!;

  const [addStock, setAddStock] = useState(false);
  const [addMeter, setAddMeter] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stockRows = state.tankReadings
    .filter((r) => r.tankId === tank.id)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const meterRows = state.usageReadings
    .filter((r) => r.meterId === meter.id)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Readings</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">
          <strong>Stock readings</strong> are tank volumes at an instant (dipstick / gauge).{" "}
          <strong>Meter readings</strong> are cumulative outflow totals. A period balance needs both at the exact
          boundary instants ({istDate(DEMO_PERIOD.start)} → {istDate(DEMO_PERIOD.end)} IST); recon-v1.0 uses tolerance 0.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="print-card">
          <CardHeader
            title={`Tank stock readings — ${tank.name}`}
            sub={tank.readingMethodNote}
            right={<Button size="sm" variant="secondary" onClick={() => setAddStock(true)}>+ Record stock</Button>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-bold">Observed (IST)</th>
                  <th className="px-3 py-2.5 text-right font-bold">Stock volume</th>
                  <th className="px-3 py-2.5 font-bold">Method</th>
                  <th className="px-3 py-2.5 font-bold">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockRows.map((r) => {
                  const atBoundary =
                    r.observedAt === DEMO_PERIOD.start || r.observedAt === DEMO_PERIOD.end;
                  return (
                    <tr key={r.id} className={atBoundary ? "bg-[#e8f1ff]/40" : ""}>
                      <td className="tabular px-5 py-2.5 font-semibold text-ink">
                        {istDate(r.observedAt)}
                        {atBoundary ? <span className="ml-2 rounded bg-water/10 px-1.5 py-0.5 text-[10px] font-bold text-water-deep">period boundary</span> : null}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink">{formatLiters(r.stockLiters)} L</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.method}</td>
                      <td className="px-3 py-2.5">
                        <StatusPill tone={r.quality === "measured" ? "ok" : r.quality === "estimated" ? "review" : "neutral"}>{r.quality}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
                {stockRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">No stock readings yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="print-card">
          <CardHeader
            title={`Cumulative meter readings — ${meter.name}`}
            sub={`Boundary: ${meter.boundaryDescription}. Usage = end value − start value; a decreasing meter is never treated as usage.`}
            right={<Button size="sm" variant="secondary" onClick={() => setAddMeter(true)}>+ Record meter</Button>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-bold">Observed (IST)</th>
                  <th className="px-3 py-2.5 text-right font-bold">Cumulative value</th>
                  <th className="px-3 py-2.5 font-bold">Quality</th>
                  <th className="px-3 py-2.5 font-bold">Uncertainty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meterRows.map((r) => {
                  const atBoundary = r.observedAt === DEMO_PERIOD.start || r.observedAt === DEMO_PERIOD.end;
                  return (
                    <tr key={r.id} className={atBoundary ? "bg-[#e8f1ff]/40" : ""}>
                      <td className="tabular px-5 py-2.5 font-semibold text-ink">
                        {istDate(r.observedAt)}
                        {atBoundary ? <span className="ml-2 rounded bg-water/10 px-1.5 py-0.5 text-[10px] font-bold text-water-deep">period boundary</span> : null}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink">{formatLiters(r.cumulativeLiters)} L</td>
                      <td className="px-3 py-2.5"><StatusPill tone={r.quality === "measured" ? "ok" : "review"}>{r.quality}</StatusPill></td>
                      <td className="tabular px-3 py-2.5 text-slate-500">{r.uncertaintyLiters === null ? "not quantified" : `±${formatLiters(r.uncertaintyLiters)} L`}</td>
                    </tr>
                  );
                })}
                {meterRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">No meter readings yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <StockModal open={addStock} onClose={() => setAddStock(false)} onError={setErr} />
      <MeterModal open={addMeter} onClose={() => setAddMeter(false)} onError={setErr} />
      {err ? <p role="alert" className="text-[13px] font-semibold text-danger">{err}</p> : null}
    </div>
  );
}

function StockModal({ open, onClose, onError }: { open: boolean; onClose: () => void; onError: (s: string | null) => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const [f, setF] = useState({ date: "2026-10-29T08:00", liters: "", uncertainty: "200", method: "dipstick", quality: "measured", note: "" });

  const submit = () => {
    try {
      const v = Number(f.liters);
      if (Number.isNaN(v) || !Number.isFinite(v) || v < 0) throw new Error("Stock volume must be a non-negative number.");
      if (v > tank.capacityLiters) throw new Error(`Stock ${v} L exceeds tank capacity ${tank.capacityLiters} L. Re-measure — JalLekha never clamps this silently.`);
      actions.addTankReading({
        siteId: site.id, tankId: tank.id,
        observedAtUTC: istToUtc(f.date),
        stockLiters: v,
        uncertaintyLiters: f.uncertainty === "" ? null : Number(f.uncertainty),
        method: f.method, quality: f.quality as Quality, note: f.note, actor: "operator@demo (you)",
      });
      onError(null); onClose();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record tank stock reading">
      <div className="space-y-3">
        <Field label="Observed at (IST)" htmlFor="stk-date" required hint="For the demo balance, boundary instants are 28 Oct 08:00 and 29 Oct 08:00 IST">
          <Input id="stk-date" type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock volume (L)" htmlFor="stk-liters" required>
            <Input id="stk-liters" type="number" min="0" value={f.liters} onChange={(e) => setF({ ...f, liters: e.target.value })} placeholder="11000" />
          </Field>
          <Field label="Uncertainty (±L)" htmlFor="stk-unc" hint="Empty = not quantified">
            <Input id="stk-unc" type="number" min="0" value={f.uncertainty} onChange={(e) => setF({ ...f, uncertainty: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method" htmlFor="stk-method">
            <Select id="stk-method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              <option value="dipstick">Dipstick</option>
              <option value="level gauge">Level gauge</option>
              <option value="calibrated sensor">Calibrated sensor</option>
              <option value="supplier statement">Supplier statement</option>
            </Select>
          </Field>
          <Field label="Quality" htmlFor="stk-quality">
            <Select id="stk-quality" value={f.quality} onChange={(e) => setF({ ...f, quality: e.target.value })}>
              <option value="measured">Measured</option>
              <option value="estimated">Estimated</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
        </div>
        <Field label="Note" htmlFor="stk-note">
          <Textarea id="stk-note" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!f.liters} onClick={submit}>Save reading</Button>
        </div>
      </div>
    </Modal>
  );
}

function MeterModal({ open, onClose, onError }: { open: boolean; onClose: () => void; onError: (s: string | null) => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const meter = state.meters.find((m) => m.siteId === site.id)!;
  const [f, setF] = useState({ date: "2026-10-29T08:00", value: "", uncertainty: "100", quality: "measured", note: "" });

  const submit = () => {
    try {
      const v = Number(f.value);
      if (Number.isNaN(v) || !Number.isFinite(v) || v < 0) throw new Error("Cumulative value must be a non-negative number.");
      actions.addUsageReading({
        siteId: site.id, meterId: meter.id,
        observedAtUTC: istToUtc(f.date),
        cumulativeLiters: v, sourceValue: v, sourceUnit: "L",
        uncertaintyLiters: f.uncertainty === "" ? null : Number(f.uncertainty),
        quality: f.quality as Quality, note: f.note, actor: "operator@demo (you)",
      });
      onError(null); onClose();
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record cumulative meter reading">
      <div className="space-y-3">
        <p className="rounded-xl bg-[#e8f1ff] px-3.5 py-2.5 text-xs text-water-deep">
          Enter the meter&apos;s cumulative total (not the usage since last time). 1 kL = 1,000 L; 1 m³ = 1,000 L.
        </p>
        <Field label="Observed at (IST)" htmlFor="mtr-date" required>
          <Input id="mtr-date" type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cumulative value (L)" htmlFor="mtr-val" required>
            <Input id="mtr-val" type="number" min="0" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="104000" />
          </Field>
          <Field label="Uncertainty (±L)" htmlFor="mtr-unc" hint="Empty = not quantified">
            <Input id="mtr-unc" type="number" min="0" value={f.uncertainty} onChange={(e) => setF({ ...f, uncertainty: e.target.value })} />
          </Field>
        </div>
        <Field label="Quality" htmlFor="mtr-quality">
          <Select id="mtr-quality" value={f.quality} onChange={(e) => setF({ ...f, quality: e.target.value })}>
            <option value="measured">Measured</option>
            <option value="estimated">Estimated</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
        <Field label="Note" htmlFor="mtr-note">
          <Textarea id="mtr-note" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!f.value} onClick={submit}>Save reading</Button>
        </div>
      </div>
    </Modal>
  );
}

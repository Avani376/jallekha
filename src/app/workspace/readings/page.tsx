"use client";

/**
 * Readings screen: clear stock-vs-meter vocabulary, unit help, exact-boundary
 * note, and add forms that never accept NaN/negative/over-capacity values.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { Card, CardHeader, Button, Field, Input, Select, Textarea, Modal, StatusPill } from "@/components/ui";
import { formatLiters } from "@/domain/units";
import { istDate, istToUtc } from "@/lib/datetime";
import { IconUpload } from "@/components/icons";
import { cx } from "@/components/ui";
import {
  buildReadingImportPreview,
  confirmReadingImport,
  parseCsv,
  suggestReadingColumnMapping,
  SAMPLE_TANK_READINGS_CSV,
  SAMPLE_METER_READINGS_CSV,
  type ReadingKind,
} from "@/domain/import";
import { DEMO_PERIOD } from "@/data/seed";
import type { Quality } from "@/domain/types";

export default function ReadingsPage() {
  const { state, selectedSiteId } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const meter = state.meters.find((m) => m.siteId === site.id)!;

  const [addStock, setAddStock] = useState(false);
  const [addMeter, setAddMeter] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stockRows = state.tankReadings
    .filter((r) => r.tankId === tank.id)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const meterRows = state.usageReadings
    .filter((r) => r.meterId === meter.id)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Readings</h1>
          <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">
            <strong>Stock readings</strong> are tank volumes at an instant. <strong>Meter readings</strong> are
            cumulative outflow totals.
          </p>
        </div>
        <div className="no-print">
          <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
            <IconUpload /> Import readings CSV
          </Button>
        </div>
      </div>
      <div className="hidden">
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
      <ReadingImportModal open={importOpen} onClose={() => setImportOpen(false)} onError={setErr} />
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

/* --------------------------- readings import ------------------------------ */

function ReadingImportModal({ open, onClose, onError }: { open: boolean; onClose: () => void; onError: (s: string | null) => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tanks = state.tanks.filter((t) => t.siteId === site.id);
  const meters = state.meters.filter((m) => m.siteId === site.id);

  const [kind, setKind] = useState<ReadingKind>("tank");
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("readings.csv");
  const [dateFormat, setDateFormat] = useState<"ISO" | "DD/MM/YYYY" | "MM/DD/YYYY">("ISO");
  const [quality, setQuality] = useState<"measured" | "estimated" | "unknown">("measured");
  const [preview, setPreview] = useState<ReturnType<typeof buildReadingImportPreview> | null>(null);

  const close = () => { onClose(); setCsvText(""); setPreview(null); };

  const doPreview = () => {
    const mapping = suggestReadingColumnMapping(parseCsv(csvText).headers, kind);
    const result = buildReadingImportPreview(
      csvText, kind, mapping,
      { filename, dateFormat, quality, actor: "operator@demo (you)" },
      site.id, tanks, meters,
      state.tankReadings, state.usageReadings,
    );
    setPreview(result);
  };

  const commit = () => {
    if (!preview) return;
    const result = confirmReadingImport(
      kind, preview,
      { filename, dateFormat, quality, actor: "operator@demo (you)" },
      site.id,
    );
    actions.applyReadingImport(result.batch, result.tankReadings, result.usageReadings);
    onError(null);
    close();
  };

  const summary = preview?.summary;

  return (
    <Modal open={open} onClose={close} title="Import readings from CSV" wide>
      {!preview ? (
        <div className="space-y-3">
          <div role="tablist" aria-label="Reading type" className="inline-flex rounded-xl border border-slate-300 bg-slate-50 p-1 text-[13px] font-bold">
            {(["tank", "meter"] as ReadingKind[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cx("rounded-lg px-4 py-1.5", kind === k ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}
              >
                {k === "tank" ? "Tank stock readings" : "Cumulative meter readings"}
              </button>
            ))}
          </div>
          <Field label="Date format in this file" htmlFor="rimp-fmt" required hint="Ambiguous dates are rejected unless a format is chosen">
            <Select id="rimp-fmt" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}>
              <option value="ISO">ISO — 2026-10-28T08:00:00+05:30</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY — 28/10/2026 08:00</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY — 10/28/2026 08:00</option>
            </Select>
          </Field>
          <Field label="Default quality if the file has no quality column" htmlFor="rimp-q">
            <Select id="rimp-q" value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)}>
              <option value="measured">measured</option>
              <option value="estimated">estimated</option>
              <option value="unknown">unknown</option>
            </Select>
          </Field>
          <Field
            label="Paste CSV"
            htmlFor="rimp-csv"
            required
            hint={kind === "tank" ? "Columns: observed_at, stock_liters (or volume/level), uncertainty, method, quality" : "Columns: observed_at, reading (or cumulative), uncertainty"}
          >
            <Textarea id="rimp-csv" rows={7} className="font-mono text-xs" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          </Field>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setCsvText(kind === "tank" ? SAMPLE_TANK_READINGS_CSV : SAMPLE_METER_READINGS_CSV); setFilename(kind + "-readings.csv"); }}>
              Load sample (synthetic)
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
              <Button size="sm" disabled={!csvText.trim()} onClick={doPreview}>Validate &amp; preview</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-[13px]">
            <StatusPill tone="ok">{summary!.valid} valid</StatusPill>
            <StatusPill tone="warn">{summary!.exactDuplicate} identical replays (skipped)</StatusPill>
            <StatusPill tone="danger">{summary!.error} row errors</StatusPill>
          </div>
          <div className="max-h-[42vh] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">When (UTC)</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2">Uncertainty</th>
                  <th className="px-3 py-2">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className={cx(
                    r.status === "error" && "bg-danger-soft/50",
                    r.status === "exact-duplicate" && "bg-slate-50 text-slate-400",
                  )}>
                    <td className="px-3 py-1.5 font-bold">{r.rowNumber}</td>
                    <td className="tabular px-3 py-1.5">{r.parsed?.observedAtISO ?? r.values.observedAt}</td>
                    <td className="tabular px-3 py-1.5 text-right">{r.parsed ? r.parsed.liters.toLocaleString("en-IN") + " L" : r.values.value}</td>
                    <td className="tabular px-3 py-1.5">{r.parsed && r.parsed.uncertaintyLiters !== null ? "\u00b1" + r.parsed.uncertaintyLiters : r.values.uncertainty || "\u2014"}</td>
                    <td className="px-3 py-1.5">
                      {r.status === "valid" ? <StatusPill tone="ok">Will import</StatusPill>
                        : r.status === "exact-duplicate" ? <StatusPill tone="warn">Already recorded (identical)</StatusPill>
                        : <span className="text-danger">{r.errors.join("; ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Conflicting values at a recorded instant are errors — resolve them instead of overwriting. An empty
            uncertainty stays &ldquo;not quantified&rdquo; and every result will say so.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>Back</Button>
            <Button size="sm" disabled={summary!.valid === 0} onClick={commit}>
              Confirm import of {summary!.valid} reading{summary!.valid === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

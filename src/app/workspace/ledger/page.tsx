"use client";

/**
 * Delivery ledger: manual entry, CSV import with column mapping and a
 * validate-before-commit preview (valid / error / exact-duplicate /
 * fuzzy-duplicate), search, filters, sorting, and a record detail panel.
 * Flagged records are NEVER removed: a reviewer voids with a reason.
 */

import { useMemo, useState } from "react";
import { useWorkspace } from "@/data/store";
import { Card, Button, Field, Input, Select, Textarea, Modal, StatusPill, EmptyState, cx } from "@/components/ui";
import { buildImportPreview, confirmImport, parseCsv, SAMPLE_CSV, suggestColumnMapping, type ImportPreview } from "@/domain/import";
import { istDate, istToUtc } from "@/lib/datetime";
import { IconPlus, IconUpload } from "@/components/icons";
import { toLiters, formatLiters } from "@/domain/units";
import type { Delivery } from "@/domain/types";

type SortKey = "date-desc" | "date-asc" | "qty-desc" | "qty-asc";

export default function LedgerPage() {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "posted" | "voided">("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [detail, setDetail] = useState<Delivery | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const activeRun = state.runs.filter((r) => r.siteId === site.id && !r.supersededByRunId).at(-1);
  const dupeIds = new Set(activeRun?.findings.filter((f) => f.type === "duplicate-candidate").flatMap((f) => f.sourceIds) ?? []);

  const rows = useMemo(() => {
    let list = state.deliveries.filter((d0) => d0.siteId === site.id);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((d0) =>
        [d0.supplierLabel, d0.receiptNumber ?? "", d0.note ?? "", d0.sourceReference ?? ""]
          .join(" ").toLowerCase().includes(needle),
      );
    }
    if (statusFilter !== "all") list = list.filter((d0) => d0.status === statusFilter);
    const cmp: Record<SortKey, (a: Delivery, b: Delivery) => number> = {
      "date-desc": (a, b) => b.deliveredAt.localeCompare(a.deliveredAt),
      "date-asc": (a, b) => a.deliveredAt.localeCompare(b.deliveredAt),
      "qty-desc": (a, b) => b.quantityLiters - a.quantityLiters,
      "qty-asc": (a, b) => a.quantityLiters - b.quantityLiters,
    };
    return list.slice().sort(cmp[sort]);
  }, [state.deliveries, site.id, q, statusFilter, sort]);

  const postedTotal = state.deliveries
    .filter((d0) => d0.siteId === site.id && d0.status === "posted")
    .reduce((a, d0) => a + d0.quantityLiters, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Delivery ledger</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Tanker receipts for {tank.name}. As-recorded totals include flagged rows until a reviewer voids one with a reason.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><IconUpload /> Import CSV</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><IconPlus /> Add delivery</Button>
        </div>
      </div>

      <Card className="print-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <Input
            aria-label="Search deliveries"
            placeholder="Search supplier, receipt, note…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="max-w-[11rem]">
            <option value="all">All statuses</option>
            <option value="posted">Posted</option>
            <option value="voided">Voided (history kept)</option>
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="max-w-[13rem]">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="qty-desc">Volume high → low</option>
            <option value="qty-asc">Volume low → high</option>
          </Select>
          <span className="tabular ml-auto text-[13px] font-bold text-slate-500">
            As-recorded total: {formatLiters(postedTotal)} L
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No deliveries match" body="Adjust the search or filters, or add the first delivery record." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-bold">Delivered (IST)</th>
                  <th className="px-3 py-2.5 font-bold">Supplier</th>
                  <th className="px-3 py-2.5 font-bold">Receipt</th>
                  <th className="px-3 py-2.5 text-right font-bold">Volume</th>
                  <th className="px-3 py-2.5 font-bold">Uncertainty</th>
                  <th className="px-3 py-2.5 font-bold">Source</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="no-print px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d0) => {
                  const flagged = dupeIds.has(d0.id) && d0.status === "posted";
                  return (
                    <tr key={d0.id} className={cx("hover:bg-slate-50/70", d0.status === "voided" && "opacity-60")}>
                      <td className="tabular whitespace-nowrap px-5 py-2.5 font-semibold text-ink">
                        {istDate(d0.deliveredAt)}
                      </td>
                      <td className="px-3 py-2.5">{d0.supplierLabel}</td>
                      <td className="tabular px-3 py-2.5">{d0.receiptNumber ?? <span className="text-slate-400">— none —</span>}</td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink">
                        {formatLiters(d0.quantityLiters)} L
                        {d0.sourceUnit !== "L" ? <span className="ml-1 text-[11px] font-normal text-slate-400">({formatLiters(d0.sourceQuantity)} {d0.sourceUnit})</span> : null}
                      </td>
                      <td className="tabular px-3 py-2.5 text-slate-500">±{formatLiters(d0.uncertaintyLiters ?? 0)} L</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-slate-400">{d0.sourceReference}</td>
                      <td className="px-3 py-2.5">
                        {d0.status === "voided" ? (
                          <StatusPill tone="neutral">Voided — kept in history</StatusPill>
                        ) : flagged ? (
                          <StatusPill tone="warn">Duplicate candidate</StatusPill>
                        ) : (
                          <StatusPill tone="ok">Posted</StatusPill>
                        )}
                      </td>
                      <td className="no-print px-3 py-2.5 text-right">
                        <button onClick={() => setDetail(d0)} className="rounded-lg px-2 py-1 text-xs font-bold text-water-deep hover:bg-[#e8f1ff]">
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail panel */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Delivery record" wide>
        {detail ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <Fact label="Record ID" value={detail.id} />
              <Fact label="Status" value={detail.status} />
              <Fact label="Supplier" value={detail.supplierLabel} />
              <Fact label="Receipt number" value={detail.receiptNumber ?? "— none —"} />
              <Fact label="Delivered at (UTC)" value={detail.deliveredAt} />
              <Fact label="Delivered at (IST)" value={istDate(detail.deliveredAt)} />
              <Fact label="Recorded volume" value={`${formatLiters(detail.quantityLiters)} L`} />
              <Fact label="Original entry" value={`${formatLiters(detail.sourceQuantity)} ${detail.sourceUnit}`} />
              <Fact label="Uncertainty" value={detail.uncertaintyLiters === null ? "not quantified" : `±${formatLiters(detail.uncertaintyLiters)} L`} />
              <Fact label="Source" value={detail.sourceReference ?? "—"} />
              {detail.importBatchId ? <Fact label="Import batch" value={detail.importBatchId} /> : null}
              {detail.importIdempotencyKey ? <Fact label="Import idempotency key" value={detail.importIdempotencyKey} /> : null}
            </dl>
            {detail.note ? <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600"><strong>Note:</strong> {detail.note}</p> : null}
            {detail.status === "voided" ? (
              <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-[13px] text-danger">
                <strong>Voided by {detail.voidedBy}</strong> at {istDate(detail.voidedAt ?? "")}: {detail.voidReason}
                <br />The record is preserved; totals were recomputed without it.
              </p>
            ) : (
              <VoidForm
                onSubmit={(reason) => {
                  actions.voidDelivery(detail.id, reason, "reviewer@demo (you)");
                  setDetail(null);
                }}
              />
            )}
          </div>
        ) : null}
      </Modal>

      <AddDeliveryModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="tabular mt-0.5 break-all font-semibold text-slate-700">{value}</dd>
    </div>
  );
}

function VoidForm({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="rounded-xl border border-amber/40 bg-amber-soft p-4">
      <p className="text-[13px] font-bold text-amber-deep">Void this record (reviewer action)</p>
      <p className="mt-1 text-xs text-amber-deep/80">
        Voiding keeps the record visible in history and recomputes totals. Explain why, with evidence.
      </p>
      <Textarea
        aria-label="Void reason"
        rows={2}
        className="mt-2"
        placeholder="e.g. Duplicate of receipt R-101 confirmed against the physical receipt…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <Button variant="amber" size="sm" disabled={reason.trim().length < 8} onClick={() => onSubmit(reason.trim())}>
          Void with reason
        </Button>
      </div>
    </div>
  );
}

function AddDeliveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const [f, setF] = useState({ supplier: "", receipt: "", date: "2026-10-28T14:30", qty: "", unit: "L", uncertainty: "100", note: "" });
  const [err, setErr] = useState<string | null>(null);
  const id = "add-dlv";

  const submit = () => {
    try {
      const q = Number(f.qty);
      if (!f.supplier.trim()) throw new Error("Supplier is required.");
      if (Number.isNaN(q) || !Number.isFinite(q) || q < 0) throw new Error("Quantity must be a non-negative number.");
      const liters = toLiters(q, f.unit as "L" | "kL" | "m3");
      actions.addDelivery({
        siteId: site.id,
        tankId: tank.id,
        supplierLabel: f.supplier.trim(),
        receiptNumber: f.receipt.trim(),
        deliveredAtUTC: istToUtc(f.date),
        sourceQuantity: q,
        sourceUnit: f.unit as "L" | "kL" | "m3",
        quantityLiters: liters,
        uncertaintyLiters: Number(f.uncertainty) || 0,
        note: f.note,
        actor: "operator@demo (you)",
      });
      onClose();
      setF({ supplier: "", receipt: "", date: "2026-10-28T14:30", qty: "", unit: "L", uncertainty: "100", note: "" });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add delivery record">
      <div className="space-y-3">
        <Field label="Supplier" htmlFor={`${id}-sup`} required>
          <Input id={`${id}-sup`} value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} placeholder="BlueWave Tankers" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Receipt number" htmlFor={`${id}-rec`} hint="Leave empty only if genuinely unavailable">
            <Input id={`${id}-rec`} value={f.receipt} onChange={(e) => setF({ ...f, receipt: e.target.value })} placeholder="R-101" />
          </Field>
          <Field label="Quantity" htmlFor={`${id}-qty`} required>
            <div className="flex gap-2">
              <Input id={`${id}-qty`} type="number" min="0" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} placeholder="5000" />
              <Select aria-label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="w-24">
                <option value="L">L</option>
                <option value="kL">kL</option>
                <option value="m3">m³</option>
              </Select>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Delivered at (IST)" htmlFor={`${id}-date`} required hint="Stored as UTC; shown in Asia/Kolkata">
            <Input id={`${id}-date`} type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Field label="Measurement uncertainty (±L)" htmlFor={`${id}-unc`} hint="From the receipt/supplier; used in the uncertainty interval">
            <Input id={`${id}-unc`} type="number" min="0" value={f.uncertainty} onChange={(e) => setF({ ...f, uncertainty: e.target.value })} />
          </Field>
        </div>
        <Field label="Note" htmlFor={`${id}-note`}>
          <Textarea id={`${id}-note`} rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Optional context from the operator" />
        </Field>
        {err ? <p role="alert" className="text-[13px] font-semibold text-danger">{err}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!f.supplier || !f.qty}>Save delivery</Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const [step, setStep] = useState<"input" | "map" | "preview">("input");
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("deliveries.csv");
  const [dateFormat, setDateFormat] = useState<"ISO" | "DD/MM/YYYY" | "MM/DD/YYYY">("ISO");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const reset = () => { setStep("input"); setCsvText(""); setPreview(null); setFilename("deliveries.csv"); };
  const close = () => { onClose(); reset(); };

  const doPreview = () => {
    const { headers } = parseCsv(csvText);
    const mapping = suggestColumnMapping(headers);
    const p = buildImportPreview(
      csvText, mapping, { filename, dateFormat, defaultUnit: "L", actor: "operator@demo (you)" },
      state.deliveries, state.tanks, state.sites,
    );
    setPreview(p);
    setStep("preview");
  };

  const commit = () => {
    if (!preview) return;
    const { batch, createdDeliveries } = confirmImport(
      preview, { filename, dateFormat, defaultUnit: "L", actor: "operator@demo (you)" }, site.id,
    );
    actions.applyImport(batch, createdDeliveries);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Import deliveries from CSV" wide>
      {step === "input" ? (
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">
            CSV text is treated strictly as data — nothing is executed. Ambiguous dates are rejected unless you choose a format.
          </p>
          <Field label="Date format in this file" htmlFor="imp-fmt" required hint="Avoids silent DD/MM vs MM/DD mistakes">
            <Select id="imp-fmt" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}>
              <option value="ISO">ISO — 2026-10-28T14:30:00+05:30</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY — 28/10/2026 14:30</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY — 10/28/2026 14:30</option>
            </Select>
          </Field>
          <Field label="Paste CSV" htmlFor="imp-csv" required>
            <Textarea id="imp-csv" rows={7} className="font-mono text-xs" value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="supplier,receipt_number,delivered_at,quantity,unit,tank,note" />
          </Field>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setCsvText(SAMPLE_CSV); setFilename("sample-deliveries.csv"); }}>
              Load sample file (synthetic)
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
              <Button size="sm" disabled={!csvText.trim()} onClick={doPreview}>Validate & preview</Button>
            </div>
          </div>
        </div>
      ) : (
        preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-[13px]">
              <StatusPill tone="ok">{preview.summary.valid} valid</StatusPill>
              <StatusPill tone="warn">{preview.summary.exactDuplicate} exact duplicate (skipped)</StatusPill>
              <StatusPill tone="review">{preview.summary.fuzzyDuplicate} need receipt check (staged out)</StatusPill>
              <StatusPill tone="danger">{preview.summary.error} row errors</StatusPill>
            </div>
            <div className="max-h-[46vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">When (UTC)</th>
                    <th className="px-3 py-2 text-right">Volume</th>
                    <th className="px-3 py-2">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber} className={cx(
                      r.status === "error" && "bg-danger-soft/50",
                      r.status === "exact-duplicate" && "bg-slate-50 text-slate-400",
                      r.status === "fuzzy-duplicate" && "bg-amber-soft/60",
                    )}>
                      <td className="px-3 py-1.5 font-bold">{r.rowNumber}</td>
                      <td className="px-3 py-1.5">{r.values.supplier || "—"}</td>
                      <td className="px-3 py-1.5">{r.values.receiptNumber || <em>none</em>}</td>
                      <td className="tabular px-3 py-1.5">{r.parsed?.deliveredAtISO ?? r.values.deliveredAt}</td>
                      <td className="tabular px-3 py-1.5 text-right">{r.parsed ? `${formatLiters(r.parsed.quantityLiters)} L` : r.values.quantity}</td>
                      <td className="px-3 py-1.5">
                        {r.status === "valid" ? <StatusPill tone="ok">Will import</StatusPill>
                          : r.status === "exact-duplicate" ? <StatusPill tone="warn">Exact duplicate of {r.matchedDeliveryId}</StatusPill>
                          : r.status === "fuzzy-duplicate" ? <StatusPill tone="review">Possible dup — review first</StatusPill>
                          : <span className="text-danger">{r.errors.join("; ")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Only <strong>valid</strong> rows are posted. Exact replays of the same file never double totals (idempotency keys).
              Flagged rows stay out until a reviewer decides.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setStep("input"); setPreview(null); }}>Back</Button>
              <Button size="sm" disabled={preview.summary.valid === 0} onClick={commit}>
                Confirm import of {preview.summary.valid} row{preview.summary.valid === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}

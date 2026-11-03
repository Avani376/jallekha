"use client";

/**
 * AI receipt scanner: upload a receipt photo -> the operator's configured
 * vision model drafts the fields -> the operator reviews, corrects and
 * CONFIRMS. Nothing is saved automatically; the original extraction stays
 * in the audit note beside the confirmed values, and deterministic
 * validation (units, duplicates) still gates the record.
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { loadAiSettings } from "@/lib/ai/settings";
import { scanReceipt, validateScanFile, validateReceiptDraft, type ReceiptDraft } from "@/lib/ai/vision";
import { toLiters } from "@/domain/units";
import { istToLocalInput, istToUtc } from "@/lib/datetime";
import { mascotReact } from "./mascot";
import { Button, Input, Modal, Select, StatusPill } from "./ui";
import { IconUpload } from "./icons";

interface ScanStage {
  phase: "pick" | "extracting" | "review" | "error";
  dataUrl?: string;
  fileName?: string;
  draft?: ReceiptDraft;
  missing?: string[];
  warnings?: string[];
  duplicateOfId?: string | null;
  message?: string;
}

function FieldBox({ label, extracted, children }: { label: string; extracted: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[11px] text-slate-400">
          extracted: <em>{extracted || "not found"}</em>
        </p>
      </div>
      {children}
    </div>
  );
}

export function ReceiptScannerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, selectedSiteId, actions } = useWorkspace();
  const site = state.sites.find((s) => s.id === selectedSiteId)!;
  const tank = state.tanks.find((t) => t.siteId === site.id)!;
  const cfg = loadAiSettings();

  const [stage, setStage] = useState<ScanStage>({ phase: "pick" });
  const [corr, setCorr] = useState({ supplier: "", receipt: "", date: "", qty: "", unit: "L", vehicle: "" });
  const [fileErr, setFileErr] = useState<string | null>(null);

  const close = () => {
    onClose();
    setStage({ phase: "pick" });
    setFileErr(null);
  };

  const onFile = (file: File) => {
    const err = validateScanFile({ type: file.type, size: file.size });
    if (err) { setFileErr(err); return; }
    setFileErr(null);
    const reader = new FileReader();
    reader.onload = () => setStage({ phase: "pick", dataUrl: String(reader.result), fileName: file.name });
    reader.readAsDataURL(file);
  };

  const extract = async () => {
    if (!stage.dataUrl) return;
    setStage({ phase: "extracting", dataUrl: stage.dataUrl, fileName: stage.fileName });
    try {
      const result = await scanReceipt(cfg, stage.dataUrl);
      const v = validateReceiptDraft(result.draft, state.deliveries);
      setCorr({
        supplier: result.draft.supplier ?? "",
        receipt: result.draft.receipt_number ?? "",
        date: result.draft.observed_at ? istToLocalInput(result.draft.observed_at) : "",
        qty: result.draft.quantity_value !== null ? String(result.draft.quantity_value) : "",
        unit: result.draft.quantity_unit ?? "L",
        vehicle: result.draft.vehicle_number ?? "",
      });
      setStage({
        phase: "review",
        dataUrl: stage.dataUrl,
        fileName: stage.fileName,
        draft: result.draft,
        missing: v.missing,
        warnings: v.warnings,
        duplicateOfId: v.duplicateOfId,
      });
    } catch (e) {
      setStage({ phase: "error", message: (e as Error).message, dataUrl: stage.dataUrl, fileName: stage.fileName });
    }
  };

  const confirm = () => {
    try {
      const q = Number(corr.qty);
      if (!corr.supplier.trim()) throw new Error("Supplier is required.");
      if (Number.isNaN(q) || !Number.isFinite(q) || q <= 0) throw new Error("Quantity must be a positive number.");
      if (!corr.date) throw new Error("Delivery date/time is required.");
      const liters = toLiters(q, corr.unit as "L" | "kL" | "m3");
      actions.addDelivery({
        siteId: site.id,
        tankId: tank.id,
        supplierLabel: corr.supplier.trim(),
        receiptNumber: corr.receipt.trim(),
        deliveredAtUTC: istToUtc(corr.date),
        sourceQuantity: q,
        sourceUnit: corr.unit as "L" | "kL" | "m3",
        quantityLiters: liters,
        uncertaintyLiters: 100,
        note: "From AI receipt scan (operator confirmed): " + (stage.fileName ?? "upload"),
        actor: "operator@demo (you)",
      });
      mascotReact("happy", 2800);
      close();
    } catch (e) {
      setStage({ ...stage, phase: "review", message: (e as Error).message });
    }
  };

  const pickUI = (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-slate-600">
        Upload a photo of the tanker receipt. The AI model drafts the fields —{" "}
        <strong>you review and confirm before anything is saved</strong>. The image goes only to the provider you
        configured in Settings.
      </p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-water">
        <IconUpload />
        <span className="text-[13px] font-bold text-ink">
          {stage.dataUrl ? "Replace image" : "Choose a receipt photo"}
        </span>
        <span className="text-xs text-slate-400">
          JPG, PNG or WebP · max 5 MB{stage.fileName ? ` · ${stage.fileName}` : ""}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
      {fileErr ? <p role="alert" className="text-xs font-semibold text-danger">{fileErr}</p> : null}
      {stage.dataUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stage.dataUrl} alt="Receipt preview" className="max-h-44 rounded-xl border border-slate-200" />
          <Button onClick={extract} disabled={stage.phase === "extracting"}>
            {stage.phase === "extracting" ? "Reading the receipt…" : "Extract fields with AI"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const errorUI = (
    <div className="space-y-4">
      <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold text-danger">
        {stage.message}{" "}
        <button className="underline" onClick={() => setStage({ phase: "pick", dataUrl: stage.dataUrl, fileName: stage.fileName })}>
          Try again
        </button>
      </p>
      {stage.dataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={stage.dataUrl} alt="Receipt preview" className="max-h-44 rounded-xl border border-slate-200" />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setStage({ phase: "pick", dataUrl: stage.dataUrl, fileName: stage.fileName })}>
          Start over
        </Button>
      </div>
    </div>
  );

  const reviewUI = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="info">AI draft — review before saving</StatusPill>
        {stage.draft?.confidence ? (
          <StatusPill tone={stage.draft.confidence === "high" ? "ok" : stage.draft.confidence === "medium" ? "review" : "warn"}>
            confidence: {stage.draft.confidence}
          </StatusPill>
        ) : null}
        {stage.duplicateOfId ? <StatusPill tone="warn">possible duplicate</StatusPill> : null}
      </div>

      {stage.missing && stage.missing.length > 0 ? (
        <p role="alert" className="rounded-xl bg-amber-soft px-3.5 py-2.5 text-xs font-semibold text-amber-deep">
          Not found on the receipt: {stage.missing.join(", ")}. Fill these in manually.
        </p>
      ) : null}
      {stage.warnings && stage.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-deep">
          {stage.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3">
        <FieldBox label="Supplier" extracted={stage.draft?.supplier ?? ""}>
          <Input value={corr.supplier} onChange={(e) => setCorr({ ...corr, supplier: e.target.value })} aria-label="Supplier (corrected)" />
        </FieldBox>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldBox label="Receipt number" extracted={stage.draft?.receipt_number ?? ""}>
            <Input value={corr.receipt} onChange={(e) => setCorr({ ...corr, receipt: e.target.value })} aria-label="Receipt number (corrected)" />
          </FieldBox>
          <FieldBox label="Vehicle / tanker" extracted={stage.draft?.vehicle_number ?? ""}>
            <Input value={corr.vehicle} onChange={(e) => setCorr({ ...corr, vehicle: e.target.value })} aria-label="Vehicle number (corrected)" />
          </FieldBox>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldBox label="Delivery date/time (IST)" extracted={stage.draft?.observed_at ?? ""}>
            <Input type="datetime-local" value={corr.date} onChange={(e) => setCorr({ ...corr, date: e.target.value })} aria-label="Delivery date (corrected)" />
          </FieldBox>
          <FieldBox label="Quantity" extracted={String(stage.draft?.quantity_value ?? "")}>
            <Input type="number" min="0" value={corr.qty} onChange={(e) => setCorr({ ...corr, qty: e.target.value })} aria-label="Quantity (corrected)" />
          </FieldBox>
          <FieldBox label="Unit" extracted={stage.draft?.quantity_unit ?? ""}>
            <Select value={corr.unit} onChange={(e) => setCorr({ ...corr, unit: e.target.value })} aria-label="Unit (corrected)">
              <option value="L">L</option>
              <option value="kL">kL</option>
              <option value="m3">m³</option>
            </Select>
          </FieldBox>
        </div>
      </div>

      {stage.message ? <p role="alert" className="text-xs font-semibold text-danger">{stage.message}</p> : null}
      <p className="text-[11.5px] leading-relaxed text-slate-400">
        The original extraction stays in the audit note beside the confirmed values. Deterministic validation still
        applies: units convert exactly, duplicates are flagged, and nothing is verified without your confirmation.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
        <Button size="sm" onClick={confirm}>Confirm &amp; save delivery</Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={close} title="Scan receipt (AI)" wide>
      {stage.phase === "error"
        ? errorUI
        : stage.phase === "review"
          ? reviewUI
          : pickUI}
    </Modal>
  );
}

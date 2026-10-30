/**
 * CSV import: parse → map columns → validate rows → preview (valid / error /
 * exact-duplicate / fuzzy-duplicate) → confirm valid rows only. Replaying the
 * same file is idempotent. CSV text is data: never executed, HTML-escaped at
 * render time, and spreadsheet formula prefixes are neutralized on export.
 */

import type {
  Delivery,
  ImportBatch,
  Meter,
  Site,
  Tank,
  VolumeUnit,
} from "./types";
import { stableHash } from "./hash";
import type { TankReading as TankReadingT, UsageReading as UsageReadingT } from "./types";

import { QuantityError, roundLiters, toLiters } from "./units";

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

/** Minimal RFC4180-style parser (quotes, commas, CRLF). No eval, no exec. */
export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      cur.push(field);
      field = "";
      rows.push(cur);
      cur = [];
    } else field += ch;
  }
  cur.push(field);
  rows.push(cur);
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  const body = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows: body };
}

const FIELD_ALIASES: Record<string, string[]> = {
  supplier: ["supplier", "supplier_label", "vendor", "suppliername", "supplier name"],
  receiptNumber: ["receipt", "receipt_number", "receiptnumber", "receipt no", "bill_no", "invoice", "challan"],
  deliveredAt: ["delivered_at", "deliveredat", "date", "datetime", "date_time", "delivery_date", "timestamp"],
  quantity: ["quantity", "qty", "volume", "amount", "quantity_liters", "qty_liters"],
  unit: ["unit", "units", "uom"],
  tank: ["tank", "tank_id", "tankid", "tank name"],
  note: ["note", "notes", "remark", "remarks", "comment"],
};

export function suggestColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const found = headers.find(
      (h) => aliases.includes(h.trim().toLowerCase()),
    );
    if (found) mapping[field] = found;
  }
  return mapping;
}

/** Neutralizes spreadsheet formula prefixes for exported user cells. */
export function sanitizeCell(value: string): string {
  return /^[=+@\-]/.test(value) ? `'${value}` : value;
}

export type RowStatus = "valid" | "error" | "exact-duplicate" | "fuzzy-duplicate";

export interface PreviewRow {
  rowNumber: number; // 1-based data row (after header)
  status: RowStatus;
  errors: string[];
  values: {
    supplier: string;
    receiptNumber: string;
    deliveredAt: string;
    quantity: string;
    unit: string;
    tank: string;
    note: string;
  };
  parsed?: {
    supplierLabel: string;
    receiptNumber: string | null;
    deliveredAtISO: string;
    quantityLiters: number;
    sourceQuantity: number;
    sourceUnit: VolumeUnit;
    tankId: string;
    note: string;
  };
  matchedDeliveryId?: string;
}

export interface ImportPreview {
  fileHash: string;
  mapping: Record<string, string>;
  rows: PreviewRow[];
  summary: { valid: number; error: number; exactDuplicate: number; fuzzyDuplicate: number };
}

export interface ImportOptions {
  filename: string;
  /** Chosen explicitly by the operator when dates could be ambiguous. */
  dateFormat: "ISO" | "DD/MM/YYYY" | "MM/DD/YYYY";
  defaultUnit: VolumeUnit;
  actor: string;
  now?: string;
}

function parseDate(raw: string, format: ImportOptions["dateFormat"]): string {
  const s = raw.trim();
  if (s === "") throw new Error("Delivery date/time is required");
  if (format === "ISO") {
    // Strict ISO-8601 check: slash dates like 05/03/2026 are AMBIGUOUS
    // (DD/MM vs MM/DD) and must be rejected, not guessed.
    const isoRe = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?(Z|[+-]\d{2}:?\d{2})?)?$/;
    if (!isoRe.test(s)) {
      throw new Error(`Ambiguous or non-ISO date/time: "${s}" (choose a format or use YYYY-MM-DD)`);
    }
    const t = Date.parse(s);
    if (Number.isNaN(t)) throw new Error(`Invalid date/time: "${s}"`);
    return new Date(t).toISOString();
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) throw new Error(`Unrecognized ${format} date/time: "${s}"`);
  const a = Number(m[1]);
  const b = Number(m[2]);
  const day = format === "DD/MM/YYYY" ? a : b;
  const month = format === "DD/MM/YYYY" ? b : a;
  const hour = Number(m[4] ?? 0);
  const minute = Number(m[5] ?? 0);
  const second = Number(m[6] ?? 0);
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`Date components out of range: "${s}"`);
  }
  // Dates are interpreted in Asia/Kolkata (+05:30), the demo default site zone.
  const ms = Date.UTC(Number(m[3]), month - 1, day, hour, minute, second) - 5.5 * 3600 * 1000;
  return new Date(ms).toISOString();
}

export function buildImportPreview(
  csvText: string,
  mapping: Record<string, string>,
  options: ImportOptions,
  existing: Delivery[],
  tanks: Tank[],
  sites: Site[],
): ImportPreview {
  const { rows } = parseCsv(csvText);
  const fileHash = stableHash(csvText);
  const preview: ImportPreview = {
    fileHash,
    mapping,
    rows: [],
    summary: { valid: 0, error: 0, exactDuplicate: 0, fuzzyDuplicate: 0 },
  };

  const naturalKey = (d: {
    siteId: string; tankId: string; supplierLabel: string;
    receiptNumber: string | null; deliveredAt: string; quantityLiters: number;
  }) =>
    `${d.siteId}|${d.tankId}|${d.supplierLabel.trim().toLowerCase()}|${(d.receiptNumber ?? "").trim().toLowerCase()}|${d.deliveredAt}|${d.quantityLiters}`;

  const existingKeys = new Map<string, string>();
  for (const d of existing) {
    if (d.status !== "posted") continue;
    existingKeys.set(naturalKey(d), d.id);
  }

  const stagedThisBatch: { key: string; rowNumber: number }[] = [];

  rows.forEach((r, idx) => {
    const rowNumber = idx + 1;
    const get = (field: string) => (mapping[field] ? (r[mapping[field]] ?? "").trim() : "");
    const values = {
      supplier: get("supplier"),
      receiptNumber: get("receiptNumber"),
      deliveredAt: get("deliveredAt"),
      quantity: get("quantity"),
      unit: get("unit"),
      tank: get("tank"),
      note: get("note"),
    };
    const row: PreviewRow = { rowNumber, status: "valid", errors: [], values };
    const errors: string[] = [];

    if (!values.supplier) errors.push("Supplier is required");
    let tankId = "";
    if (!values.tank) {
      errors.push("Tank is required");
    } else {
      const wanted = values.tank.toLowerCase();
      const tk = tanks.find(
        (t) =>
          t.id === values.tank ||
          t.name.toLowerCase() === wanted ||
          t.name.toLowerCase().split(/[\s(]+/)[0] === wanted, // label "T-01" for "T-01 Overhead Tank"
      );
      if (!tk) errors.push(`Unknown tank "${values.tank}"`);
      else tankId = tk.id;
    }
    let deliveredAtISO = "";
    try {
      deliveredAtISO = parseDate(values.deliveredAt, options.dateFormat);
    } catch (e) {
      errors.push((e as Error).message);
    }
    const unitRaw = (values.unit || options.defaultUnit).toLowerCase();
    const unit: VolumeUnit | null =
      unitRaw === "l" || unitRaw === "liter" || unitRaw === "litre" || unitRaw === "liters"
        ? "L"
        : unitRaw === "kl" || unitRaw === "kiloliter" || unitRaw === "kilolitres"
          ? "kL"
          : unitRaw === "m3" || unitRaw === "m³" || unitRaw === "cubic meter" || unitRaw === "cum"
            ? "m3"
            : null;
    if (!unit) errors.push(`Unknown unit "${values.unit}"`);
    let quantityLiters = 0;
    let sourceQuantity = 0;
    if (values.quantity === "") {
      errors.push("Quantity is required");
    } else {
      const q = Number(values.quantity.replace(/,/g, ""));
      if (Number.isNaN(q) || !Number.isFinite(q)) {
        errors.push(`Quantity "${values.quantity}" is not a number`);
      } else {
        try {
          if (unit) {
            quantityLiters = toLiters(q, unit, "quantity");
            sourceQuantity = q;
          }
        } catch (e) {
          errors.push((e as QuantityError).message);
        }
      }
    }
    if (errors.length > 0) {
      row.status = "error";
      row.errors = errors;
      preview.summary.error += 1;
      preview.rows.push(row);
      return;
    }

    const parsed = {
      supplierLabel: values.supplier,
      receiptNumber: values.receiptNumber === "" ? null : values.receiptNumber,
      deliveredAtISO,
      quantityLiters,
      sourceQuantity,
      sourceUnit: unit as VolumeUnit,
      tankId,
      note: values.note,
    };
    row.parsed = parsed;

    const key = naturalKey({
      siteId: sites[0]?.id ?? "",
      tankId,
      supplierLabel: parsed.supplierLabel,
      receiptNumber: parsed.receiptNumber,
      deliveredAt: deliveredAtISO,
      quantityLiters,
    });
    const exactExisting = existingKeys.get(key);
    const exactStaged = stagedThisBatch.find((s) => s.key === key);
    if (exactExisting || exactStaged) {
      row.status = "exact-duplicate";
      row.matchedDeliveryId = exactExisting ?? `row-${exactStaged?.rowNumber}`;
      preview.summary.exactDuplicate += 1;
      preview.rows.push(row);
      return;
    }
    // Fuzzy: same supplier + volume within 24h vs existing posted rows.
    const tThis = Date.parse(deliveredAtISO);
    const fuzzy = existing.find(
      (d) =>
        d.status === "posted" &&
        d.supplierLabel.trim().toLowerCase() === parsed.supplierLabel.trim().toLowerCase() &&
        d.quantityLiters === quantityLiters &&
        Math.abs(Date.parse(d.deliveredAt) - tThis) <= 24 * 3600 * 1000,
    );
    if (fuzzy) {
      row.status = "fuzzy-duplicate";
      row.matchedDeliveryId = fuzzy.id;
      preview.summary.fuzzyDuplicate += 1;
      preview.rows.push(row);
      return;
    }

    stagedThisBatch.push({ key, rowNumber });
    preview.summary.valid += 1;
    preview.rows.push(row);
    return;
  });

  return preview;
}

export interface ConfirmImportResult {
  batch: ImportBatch;
  createdDeliveries: Delivery[];
}

/** Posts only VALID rows. Exact/fuzzy duplicates are never auto-posted. */
export function confirmImport(
  preview: ImportPreview,
  options: ImportOptions,
  siteId: string,
): ConfirmImportResult {
  const now = options.now ?? new Date().toISOString();
  const created: Delivery[] = [];
  const batchId = `import-${preview.fileHash}-${now}`;
  for (const row of preview.rows) {
    if (row.status !== "valid" || !row.parsed) continue;
    const idempotencyKey = stableHash(
      `${siteId}|${preview.fileHash}|${row.rowNumber}|${row.parsed.deliveredAtISO}|${row.parsed.quantityLiters}|${row.parsed.supplierLabel}`,
    );
    created.push({
      id: `dlv-${idempotencyKey}`,
      siteId,
      tankId: row.parsed.tankId,
      supplierLabel: row.parsed.supplierLabel,
      receiptNumber: row.parsed.receiptNumber,
      deliveredAt: row.parsed.deliveredAtISO,
      sourceQuantity: row.parsed.sourceQuantity,
      sourceUnit: row.parsed.sourceUnit,
      quantityLiters: row.parsed.quantityLiters,
      quality: "measured",
      uncertaintyLiters: 100,
      sourceReference: `CSV import ${options.filename} row ${row.rowNumber}`,
      note: row.parsed.note || undefined,
      status: "posted",
      createdBy: options.actor,
      createdAt: now,
      importBatchId: batchId,
      importIdempotencyKey: idempotencyKey,
      version: 1,
    });
  }
  const batch: ImportBatch = {
    id: batchId,
    filename: options.filename,
    fileHash: preview.fileHash,
    columnMapping: preview.mapping,
    totalRows: preview.rows.length,
    validRowIds: created.map((d) => d.id),
    errorRows: preview.rows
      .filter((r) => r.status === "error")
      .map((r) => ({ row: r.rowNumber, errors: r.errors, raw: r.values as Record<string, string> })),
    exactDuplicateRows: preview.rows
      .filter((r) => r.status === "exact-duplicate")
      .map((r) => ({ row: r.rowNumber, matchedDeliveryId: r.matchedDeliveryId ?? "" })),
    fuzzyDuplicateRows: preview.rows
      .filter((r) => r.status === "fuzzy-duplicate")
      .map((r) => ({ row: r.rowNumber, matchedDeliveryId: r.matchedDeliveryId ?? "" })),
    importedAt: now,
    actor: options.actor,
  };
  return { batch, createdDeliveries: created };
}

export const SAMPLE_CSV = `supplier,receipt_number,delivered_at,quantity,unit,tank,note
BlueWave Tankers,R-101,2026-10-28T14:30:00+05:30,5000,L,T-01,Scheduled morning load
BlueWave Tankers,R-102,2026-10-28T16:45:00+05:30,2.5,kL,T-01,Evening top-up
AquaServe Services,R-203,2026-10-29T10:15:00+05:30,3,m3,T-01,Weekend reserve
BlueWave Tankers,,2026-10-28T18:00:00+05:30,1000,L,T-01,Receipt not available
AquaServe Services,ABC-99,31/10/2026 09:00,7000,L,T-01,`;


/* --------------------------- readings import ----------------------------- */

export type ReadingKind = "tank" | "meter";

export interface ReadingPreviewRow {
  rowNumber: number;
  status: RowStatus;
  errors: string[];
  values: Record<string, string>;
  parsed?: {
    observedAtISO: string;
    liters: number;
    uncertaintyLiters: number | null;
    method: string;
    quality: ReadingQuality;
    note: string;
    targetId: string;
  };
  matchedKey?: string;
}

export type ReadingQuality = "measured" | "estimated" | "unknown";

const READING_ALIASES: Record<string, string[]> = {
  observedAt: ["observed_at", "observedat", "date", "datetime", "date_time", "reading_at", "timestamp", "reading_date"],
  value: ["stock_liters", "stock", "volume", "level", "level_liters", "reading", "reading_liters", "cumulative", "cumulative_liters", "value"],
  uncertainty: ["uncertainty", "uncertainty_liters", "plus_minus", "tolerance"],
  method: ["method", "measurement_method"],
  quality: ["quality"],
  note: ["note", "notes", "remark", "remarks", "comment"],
  target: ["tank", "tank_id", "tankid", "meter", "meter_id", "meterid"],
};

export function suggestReadingColumnMapping(headers: string[], kind: ReadingKind): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(READING_ALIASES)) {
    const found = headers.find((h) => aliases.includes(h.trim().toLowerCase()));
    if (found) mapping[field] = found;
  }
  if (kind === "tank") delete mapping.target;
  return mapping;
}

export interface ReadingImportOptions {
  filename: string;
  dateFormat: ImportOptions["dateFormat"];
  quality: ReadingQuality;
  actor: string;
  now?: string;
}

/**
 * Validates a readings CSV (tank stock or cumulative meter) against the
 * site's targets. A conflicting value at an already-recorded instant is an
 * error (the engine blocks on ambiguous boundary readings); byte-identical
 * replays are idempotently skipped.
 */
export function buildReadingImportPreview(
  csvText: string,
  kind: ReadingKind,
  mapping: Record<string, string>,
  options: ReadingImportOptions,
  siteId: string,
  tanks: Tank[],
  meters: Meter[],
  existingTank: TankReadingT[],
  existingUsage: UsageReadingT[],
): {
  fileHash: string;
  mapping: Record<string, string>;
  rows: ReadingPreviewRow[];
  summary: { valid: number; error: number; exactDuplicate: number };
} {
  const { rows: csvRows } = parseCsv(csvText);
  const fileHash = stableHash("readings:" + kind + ":" + csvText);
  const rows: ReadingPreviewRow[] = [];
  const summary = { valid: 0, error: 0, exactDuplicate: 0 };
  const staged = new Map<string, { row: number; liters: number }>();

  const existingRows =
    kind === "tank"
      ? existingTank.filter((r) => r.siteId === siteId).map((r) => ({ key: r.tankId + "|" + r.observedAt, liters: r.stockLiters }))
      : existingUsage.filter((r) => r.siteId === siteId).map((r) => ({ key: r.meterId + "|" + r.observedAt, liters: r.cumulativeLiters }));
  const existingByKey = new Map(existingRows.map((e) => [e.key, e.liters]));

  csvRows.forEach((r, idx) => {
    const rowNumber = idx + 1;
    const get = (field: string) => (mapping[field] ? (r[mapping[field]] ?? "").trim() : "");
    const values: Record<string, string> = {
      observedAt: get("observedAt"),
      value: get("value"),
      uncertainty: get("uncertainty"),
      method: get("method"),
      quality: get("quality"),
      note: get("note"),
      target: get("target"),
    };
    const row: ReadingPreviewRow = { rowNumber, status: "valid", errors: [], values };
    const errors: string[] = [];

    let targetId = "";
    if (kind === "tank") {
      const wanted = (values.target || (tanks.length === 1 ? tanks[0].name : "")).trim();
      const tk = tanks.find(
        (t) =>
          t.siteId === siteId &&
          (t.id === wanted || t.name.toLowerCase() === wanted.toLowerCase() || t.name.toLowerCase().split(/[\s(]+/)[0] === wanted.toLowerCase()),
      );
      if (!tk) errors.push(values.target ? 'Unknown tank "' + values.target + '"' : "Tank column missing and site has several tanks");
      else targetId = tk.id;
    } else {
      const wanted = (values.target || (meters.length === 1 ? meters[0].name : "")).trim();
      const m = meters.find(
        (mm) =>
          mm.siteId === siteId &&
          (mm.id === wanted || mm.name.toLowerCase() === wanted.toLowerCase()),
      );
      if (!m) errors.push(values.target ? 'Unknown meter "' + values.target + '"' : "Meter column missing and site has several meters");
      else targetId = m.id;
    }

    let observedAtISO = "";
    try {
      observedAtISO = parseDate(values.observedAt, options.dateFormat);
    } catch (e) {
      errors.push((e as Error).message);
    }

    let liters = 0;
    if (values.value === "") {
      errors.push("Reading value is required");
    } else {
      const q = Number(values.value.replace(/,/g, ""));
      if (Number.isNaN(q) || !Number.isFinite(q)) errors.push('Value "' + values.value + '" is not a number');
      else if (q < 0) errors.push("Reading value must not be negative");
      else {
        liters = roundLiters(q);
        const tank = tanks.find((t) => t.id === targetId);
        if (kind === "tank" && tank && liters > tank.capacityLiters) {
          errors.push("Stock " + liters.toLocaleString("en-IN") + " L exceeds tank capacity " + tank.capacityLiters.toLocaleString("en-IN") + " L");
        }
      }
    }

    let uncertaintyLiters: number | null = null;
    if (values.uncertainty !== "") {
      const u = Number(values.uncertainty);
      if (Number.isNaN(u) || !Number.isFinite(u) || u < 0) errors.push('Uncertainty "' + values.uncertainty + '" must be a non-negative number');
      else uncertaintyLiters = u;
    }

    const quality = (["measured", "estimated", "unknown"].includes(values.quality) ? values.quality : options.quality) as ReadingQuality;
    const method = values.method || (kind === "tank" ? "dipstick" : "meter reading");

    if (errors.length > 0) {
      row.status = "error";
      row.errors = errors;
      summary.error += 1;
      rows.push(row);
      return;
    }

    const key = targetId + "|" + observedAtISO;
    const existingLiters = existingByKey.get(key);
    if (existingLiters !== undefined) {
      if (existingLiters === liters) {
        row.status = "exact-duplicate";
        row.matchedKey = key;
        summary.exactDuplicate += 1;
        rows.push(row);
        return;
      }
      row.status = "error";
      row.errors.push(
        "A different reading already exists at this instant (" + existingLiters.toLocaleString("en-IN") +
          " L). Resolve the conflict instead of overwriting it.",
      );
      summary.error += 1;
      rows.push(row);
      return;
    }
    const stagedRow = staged.get(key);
    if (stagedRow) {
      if (stagedRow.liters === liters) {
        row.status = "exact-duplicate";
        row.matchedKey = key;
        summary.exactDuplicate += 1;
        rows.push(row);
        return;
      }
      row.status = "error";
      row.errors.push("Row " + stagedRow.row + " already reads this instant with a different value.");
      summary.error += 1;
      rows.push(row);
      return;
    }

    staged.set(key, { row: rowNumber, liters });
    row.parsed = { observedAtISO, liters, uncertaintyLiters, method, quality, note: values.note, targetId };
    summary.valid += 1;
    rows.push(row);
  });

  return { fileHash, mapping, rows, summary };
}

export interface ReadingImportResult {
  batch: ImportBatch;
  tankReadings: TankReadingT[];
  usageReadings: UsageReadingT[];
}

/** Posts only VALID reading rows; row IDs are content-derived for idempotency. */
export function confirmReadingImport(
  kind: ReadingKind,
  preview: {
    fileHash: string;
    mapping: Record<string, string>;
    rows: ReadingPreviewRow[];
    summary: { valid: number; error: number; exactDuplicate: number };
  },
  options: ReadingImportOptions,
  siteId: string,
): ReadingImportResult {
  const now = options.now ?? new Date().toISOString();
  const batchId = "import-" + preview.fileHash + "-" + now;
  const batch: ImportBatch = {
    id: batchId,
    filename: options.filename,
    fileHash: preview.fileHash,
    columnMapping: { ...preview.mapping, __kind: kind === "tank" ? "Tank stock readings" : "Cumulative meter readings" },
    totalRows: preview.rows.length,
    validRowIds: [],
    errorRows: preview.rows.filter((r) => r.status === "error").map((r) => ({ row: r.rowNumber, errors: r.errors, raw: r.values })),
    exactDuplicateRows: preview.rows
      .filter((r) => r.status === "exact-duplicate")
      .map((r) => ({ row: r.rowNumber, matchedDeliveryId: r.matchedKey ?? "" })),
    fuzzyDuplicateRows: [],
    importedAt: now,
    actor: options.actor,
  };
  const tankReadings: TankReadingT[] = [];
  const usageReadings: UsageReadingT[] = [];
  for (const row of preview.rows) {
    if (row.status !== "valid" || !row.parsed) continue;
    const p = row.parsed;
    const contentId = stableHash(siteId + "|" + p.targetId + "|" + p.observedAtISO + "|" + p.liters);
    batch.validRowIds.push(kind + "-" + contentId);
    if (kind === "tank") {
      tankReadings.push({
        id: "tr-" + contentId,
        siteId,
        tankId: p.targetId,
        observedAt: p.observedAtISO,
        stockLiters: p.liters,
        method: p.method,
        uncertaintyLiters: p.uncertaintyLiters,
        quality: p.quality,
        note: p.note || undefined,
        sourceReference: "CSV import " + options.filename + " row " + row.rowNumber,
        createdBy: options.actor,
        createdAt: now,
      });
    } else {
      usageReadings.push({
        id: "ur-" + contentId,
        siteId,
        meterId: p.targetId,
        observedAt: p.observedAtISO,
        sourceValue: p.liters,
        sourceUnit: "L",
        cumulativeLiters: p.liters,
        uncertaintyLiters: p.uncertaintyLiters,
        quality: p.quality,
        note: p.note || undefined,
        sourceReference: "CSV import " + options.filename + " row " + row.rowNumber,
        createdBy: options.actor,
        createdAt: now,
      });
    }
  }
  return { batch, tankReadings, usageReadings };
}

export const SAMPLE_TANK_READINGS_CSV = [
  "observed_at,stock_liters,uncertainty,method,quality",
  "2026-10-28T08:00:00+05:30,10000,100,dipstick,measured",
  "2026-10-29T08:00:00+05:30,11000,200,dipstick,measured",
  "2026-10-30T08:00:00+05:30,12300,,dipstick,",
].join("\n") + "\n";

export const SAMPLE_METER_READINGS_CSV = [
  "observed_at,reading,uncertainty",
  "2026-10-28T08:00:00+05:30,100000,100",
  "2026-10-29T08:00:00+05:30,104000,100",
  "2026-10-30T08:00:00+05:30,107500,100",
].join("\n") + "\n";

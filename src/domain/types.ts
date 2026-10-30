/**
 * Domain entities. Timestamps are ISO 8601 UTC; stored volumes are liters
 * (1 kL = 1,000 L; 1 m³ = 1,000 L). Uncertainty is an absolute +/- liters
 * span; null means "not quantified" and never produces an interval.
 */

export type Liters = number;

export type VolumeUnit = "L" | "kL" | "m3";

export type Quality = "measured" | "estimated" | "unknown";

/** Absolute +/- uncertainty in liters; null means "not quantified". */
export type UncertaintyLiters = number | null;

export interface Site {
  id: string;
  name: string;
  timezone: string; // e.g. "Asia/Kolkata"
  description?: string;
  isDemo: boolean;
}

export interface Tank {
  id: string;
  siteId: string;
  name: string;
  capacityLiters: Liters;
  readingMethodNote?: string;
}

export interface Meter {
  id: string;
  siteId: string;
  name: string;
  /** Which outflow boundary this meter covers, shown on every result. */
  boundaryDescription: string;
  unit: VolumeUnit;
  type: "cumulative";
}

export type DeliveryStatus = "posted" | "voided";

export interface Delivery {
  id: string;
  siteId: string;
  tankId: string;
  supplierLabel: string;
  receiptNumber: string | null;
  deliveredAt: string; // ISO UTC
  sourceQuantity: number;
  sourceUnit: VolumeUnit;
  quantityLiters: Liters; // normalized
  quality: Quality;
  uncertaintyLiters: UncertaintyLiters;
  sourceReference?: string;
  note?: string;
  status: DeliveryStatus;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  createdBy: string;
  createdAt: string;
  importBatchId?: string;
  importIdempotencyKey?: string;
  version: number;
}

export interface TankReading {
  id: string;
  siteId: string;
  tankId: string;
  observedAt: string; // ISO UTC; must equal a period boundary to count
  stockLiters: Liters;
  method: string; // dipstick / level gauge / calibrated sensor
  uncertaintyLiters: UncertaintyLiters;
  quality: Quality;
  sourceReference?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface UsageReading {
  id: string;
  siteId: string;
  meterId: string;
  observedAt: string; // ISO UTC
  sourceValue: number; // raw cumulative value in sourceUnit
  sourceUnit: VolumeUnit;
  cumulativeLiters: Liters; // normalized cumulative
  uncertaintyLiters: UncertaintyLiters;
  quality: Quality;
  sourceReference?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type FindingType =
  | "duplicate-candidate"
  | "missing-reading"
  | "invalid-reading"
  | "incomplete-coverage"
  | "balance-outside-uncertainty"
  | "balance-within-uncertainty";

export type FindingSeverity = "info" | "warning" | "high";

export interface Finding {
  id: string;
  runId?: string;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  detail: string;
  /** IDs of the source records this finding refers to. */
  sourceIds: string[];
  /** For duplicate candidates: which fields matched. */
  matchFields?: string[];
  /** "exact" or "fuzzy" for duplicate candidates. */
  matchKind?: "exact" | "fuzzy";
  suggestedAction: string;
}

export type ReconciliationStatus =
  | "invalid"
  | "incomplete"
  | "complete-unknown-bounds"
  | "within-uncertainty"
  | "discrepancy";

export interface InputProvenance {
  id: string;
  kind: "opening-reading" | "closing-reading" | "delivery" | "meter-start" | "meter-end";
  label: string;
  liters: Liters | null;
  uncertaintyLiters: UncertaintyLiters;
  quality: Quality;
  sourceReference?: string;
  status?: "posted" | "voided";
}

export interface CompletenessState {
  openingReading: boolean;
  closingReading: boolean;
  meterStart: boolean;
  meterEnd: boolean;
  missingFields: string[];
}

export interface ReconciliationResult {
  id: string;
  siteId: string;
  tankId: string;
  meterId: string;
  periodStart: string;
  periodEnd: string;
  /** [start, end) for flows; stock readings represent the boundary instants. */
  boundaryConvention: "start-inclusive-end-exclusive" | string;
  status: ReconciliationStatus;
  openingLiters: Liters | null;
  closingLiters: Liters | null;
  deliveriesTotalLiters: Liters; // posted deliveries only; 0 when unavailable
  deliveriesIncludedCount: number;
  usageLiters: Liters | null;
  residualLiters: Liters | null;
  boundsLiters: { min: number; max: number } | null;
  uncertaintyQuantified: boolean;
  completeness: CompletenessState;
  invalidReasons: string[];
  /** Human-visible scope assumption of this calculation. */
  scopeAssumption: string;
  inputs: InputProvenance[];
  findings: Finding[];
  ruleVersion: string;
  generatedAt: string;
  supersededByRunId?: string;
}

export type InvestigationStatus =
  | "open"
  | "in-review"
  | "action-required"
  | "resolved"
  | "reopened";

export type ResolutionOutcome =
  | "duplicate-voided"
  | "missing-reading-supplied"
  | "input-corrected"
  | "legitimate-separate-delivery"
  | "measurement-coverage-incomplete"
  | "unresolved-after-review";

export interface Investigation {
  id: string;
  siteId: string;
  findingType: FindingType;
  title: string;
  detail: string;
  sourceIds: string[];
  suggestedAction: string;
  assignee: string | null;
  status: InvestigationStatus;
  evidenceNotes: EvidenceNote[];
  resolution: {
    outcome: ResolutionOutcome;
    explanation: string;
    reviewer: string;
    resolvedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceNote {
  id: string;
  author: string;
  text: string;
  addedAt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string; // e.g. "delivery.voided"
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  at: string;
}

export interface ImportBatch {
  id: string;
  filename: string;
  fileHash: string;
  columnMapping: Record<string, string>; // canonical field -> CSV column
  totalRows: number;
  validRowIds: string[];
  errorRows: { row: number; errors: string[]; raw: Record<string, string> }[];
  exactDuplicateRows: { row: number; matchedDeliveryId: string }[];
  fuzzyDuplicateRows: { row: number; matchedDeliveryId: string }[];
  importedAt: string;
  actor: string;
}

/** The editable workspace state the demo adapter persists. */
export interface WorkspaceState {
  schemaVersion: 1;
  sites: Site[];
  tanks: Tank[];
  meters: Meter[];
  deliveries: Delivery[];
  tankReadings: TankReading[];
  usageReadings: UsageReading[];
  runs: ReconciliationResult[];
  investigations: Investigation[];
  auditEvents: AuditEvent[];
  importBatches: ImportBatch[];
}

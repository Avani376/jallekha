/**
 * Investigation state machine, audit helpers and ID generation.
 * Finding TYPE is separate from investigation STATUS. A demo role selector is
 * explicitly a demonstration, not authentication.
 */

import type { AuditEvent, Investigation, InvestigationStatus } from "./types";

let seq = 0;
export function makeId(prefix: string): string {
  seq += 1;
  const rand =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}${rand}`;
}

/** Deterministic IDs for tests and fixtures. */
export function makeStableId(prefix: string, key: string): string {
  return `${prefix}-${key}`;
}

export function resetIdCounters(): void {
  seq = 0;
}

/** Allowed investigation status transitions. */
const TRANSITIONS: Record<InvestigationStatus, InvestigationStatus[]> = {
  open: ["in-review", "resolved"], // direct open -> in-review -> resolved allowed
  "in-review": ["action-required", "resolved", "reopened", "open"],
  "action-required": ["in-review", "resolved", "reopened"],
  resolved: ["reopened"],
  reopened: ["in-review", "resolved", "action-required"],
};

export class TransitionError extends Error {
  constructor(from: InvestigationStatus, to: InvestigationStatus) {
    super(`Invalid investigation transition: ${from} -> ${to}`);
    this.name = "TransitionError";
  }
}

export function assertTransition(
  from: InvestigationStatus,
  to: InvestigationStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new TransitionError(from, to);
  }
}

export function makeAuditEvent(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  payload: { before?: unknown; after?: unknown; reason?: string; at?: string } = {},
): AuditEvent {
  return {
    id: makeId("audit"),
    actor,
    action,
    entityType,
    entityId,
    before: payload.before,
    after: payload.after,
    reason: payload.reason,
    at: payload.at ?? new Date().toISOString(),
  };
}

/** Resolution requires an explanation, evidence, actor and timestamp. */
export function requireResolutionInputs(
  explanation: string,
  evidenceNote: string,
  reviewer: string,
): void {
  if (!explanation.trim()) throw new Error("A resolution explanation is required.");
  if (!evidenceNote.trim()) throw new Error("A resolution evidence note is required.");
  if (!reviewer.trim()) throw new Error("A reviewer identity is required.");
}

export function investigationIsOpen(i: Investigation): boolean {
  return i.status !== "resolved";
}

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  open: "Open",
  "in-review": "In review",
  "action-required": "Action required",
  resolved: "Resolved",
  reopened: "Reopened",
};

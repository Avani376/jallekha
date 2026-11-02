/**
 * In-app notification derivation. Notifications are derived from real
 * workspace state (findings, cases, anomalies, completeness) plus a small
 * persisted per-notification state (read / snoozed / dismissed). A dedupe
 * key prevents the same underlying issue from generating duplicate alerts.
 */

import type { WorkspaceState } from "@/domain/types";
import { activeRunFor, periodFor } from "@/data/store";
import { detectAnomalies, configFor, isDismissed, type Anomaly } from "@/domain/anomalies";
import { istDate } from "./datetime";


export type NotificationSeverity = "info" | "warning" | "high";

export interface NotificationItem {
  /** Dedupe key: stable per underlying issue (not per derivation run). */
  id: string;
  siteId: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link: string;
  linkLabel: string;
  createdAt: string;
  source: "reconciliation" | "cases" | "anomalies" | "completeness";
}

export interface ResolvedNotification extends NotificationItem {
  read: boolean;
  snoozed: boolean;
  dismissed: boolean;
  snoozedUntil: string | null;
  dismissReason: string | null;
}

function sevForFinding(type: string): NotificationSeverity {
  if (type === "invalid-reading" || type === "incomplete-coverage") return "high";
  if (type === "duplicate-candidate" || type === "balance-outside-uncertainty") return "warning";
  return "info";
}

/** Derives the full notification list for one site, newest first. */
export function deriveNotifications(state: WorkspaceState, siteId: string): ResolvedNotification[] {
  const out: NotificationItem[] = [];
  const now = new Date().toISOString();

  // 1. Findings from the active run (deduped by finding content hash id).
  const run = activeRunFor(state, siteId);
  if (run) {
    for (const f of run.findings) {
      if (f.type === "balance-within-uncertainty") continue; // informational, not actionable
      out.push({
        id: `ntf-find-${f.id}`,
        siteId,
        severity: sevForFinding(f.type),
        title: f.title,
        body: "From the active reconciliation run — open the finding for the suggested next action.",
        link: "/workspace/reconciliation",
        linkLabel: "Open reconciliation",
        createdAt: run.generatedAt,
        source: "reconciliation",
      });
    }
    // 2. Completeness: missing required readings.
    for (const field of run.completeness.missingFields) {
      out.push({
        id: `ntf-missing-${run.id}-${field}`,
        siteId,
        severity: "warning",
        title: `Missing ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        body: "The balance cannot be calculated until this reading is recorded. No residual is asserted.",
        link: "/workspace/readings",
        linkLabel: "Record the reading",
        createdAt: run.generatedAt,
        source: "completeness",
      });
    }
  }

  // 3. Open investigations (assigned or not), including stale ones.
  for (const inv of state.investigations) {
    if (inv.siteId !== siteId || inv.status === "resolved") continue;
    const daysOpen = Math.floor((Date.now() - Date.parse(inv.createdAt)) / 86_400_000);
    const severity: NotificationSeverity = daysOpen >= 7 ? "high" : daysOpen >= 3 ? "warning" : "info";
    out.push({
      id: `ntf-case-${inv.id}-${inv.status}-${daysOpen >= 7 ? "stale" : daysOpen >= 3 ? "aging" : "new"}`,
      siteId,
      severity,
      title: `${inv.title}${inv.assignee ? ` — ${inv.assignee}` : " — unassigned"}`,
      body:
        daysOpen >= 7
          ? `Open for ${daysOpen} days. Overdue for review — assign someone or resolve it.`
          : daysOpen >= 3
            ? `Open for ${daysOpen} days. Evidence or a resolution is still pending.`
            : "New case opened from a finding.",
      link: `/workspace/investigations?id=${inv.id}`,
      linkLabel: "Open case",
      createdAt: inv.createdAt,
      source: "cases",
    });
  }

  // 4. Anomalies not dismissed.
  const cfg = configFor(state, siteId);
  for (const a of detectAnomalies(state, siteId, cfg) as Anomaly[]) {
    if (isDismissed(state, a)) continue;
    out.push({
      id: `ntf-anom-${a.id}`,
      siteId,
      severity: a.severity === "high" ? "high" : a.severity === "warning" ? "warning" : "info",
      title: `Potential anomaly: ${a.title}`,
      body: "Potential anomaly — requires verification. Open the dashboard for details.",
      link: "/workspace/dashboard",
      linkLabel: "Open dashboard",
      createdAt: now,
      source: "anomalies",
    });
  }

  // Apply persisted per-notification state.
  return out
    .map((n) => {
      const st = state.notificationStates?.[n.id];
      return {
        ...n,
        read: Boolean(st?.readAt),
        snoozed: Boolean(st?.snoozedUntil && st.snoozedUntil > now),
        dismissed: Boolean(st?.dismissedAt),
        snoozedUntil: st?.snoozedUntil ?? null,
        dismissReason: st?.dismissReason ?? null,
      };
    })
    .filter((n) => !n.dismissed)
    .sort((a, b) => {
      const rank = { high: 0, warning: 1, info: 2 } as const;
      return rank[a.severity] - rank[b.severity] || b.createdAt.localeCompare(a.createdAt);
    })
    .map((n) => ({ ...n }));
}

/** Unread, non-snoozed count for the header bell. */
export function unreadCount(state: WorkspaceState, siteId: string): number {
  return deriveNotifications(state, siteId).filter((n) => !n.read && !n.snoozed).length;
}

export function notificationPeriodLabel(state: WorkspaceState, siteId: string): string {
  const p = periodFor(state, siteId);
  return istDate(p.start) + " → " + istDate(p.end) + " IST";
}

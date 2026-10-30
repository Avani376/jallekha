"use client";

/**
 * Client workspace store. The adapter is the external store; React
 * subscribes via useSyncExternalStore (no setState-in-effect, no hydration
 * mismatch). Two workspace modes share the same domain code:
 *  - demo: seeded synthetic sites (resettable)
 *  - real: the operator's own records (starts empty; onboard first)
 * Mutations write audit events; corrections preserve history; a new run
 * supersedes the previous one.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { reconcile } from "@/domain/balance";
import type {
  Delivery,
  InvestigationStatus,
  Meter,
  Quality,
  ReconciliationResult,
  ResolutionOutcome,
  Site,
  Tank,
  TankReading,
  UsageReading,
  VolumeUnit,
  WorkspaceState,
} from "@/domain/types";
import { assertTransition, makeAuditEvent, makeId } from "@/domain/state";
import { getAdapter } from "./adapter";
import { DEMO_PERIOD, buildSeedWorkspace, buildEmptyWorkspace, investigationsForRuns } from "./seed";

/** Tiny external store for the persistent workspace mode selection. */
const dataModeStore = (() => {
  let value: "demo" | "real" = "demo";
  let initialized = false;
  const listeners = new Set<() => void>();
  const init = () => {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    try {
      const saved = window.localStorage.getItem("jallekha.data-mode");
      if (saved === "real" || saved === "demo") value = saved;
    } catch {
      // Storage unavailable: keep the demo default.
    }
  };
  return {
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get(): "demo" | "real" {
      init();
      return value;
    },
    getServer(): "demo" | "real" {
      return "demo";
    },
    set(v: "demo" | "real"): void {
      value = v;
      initialized = true;
      try {
        window.localStorage.setItem("jallekha.data-mode", v);
      } catch {
        // Storage unavailable: mode stays for this session only.
      }
      for (const l of listeners) l();
    },
  };
})();

/** Tiny external store for the persistent reduce-motion preference. */
const motionStore = (() => {
  let value = false;
  let initialized = false;
  const listeners = new Set<() => void>();
  const init = () => {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    try {
      const saved = window.localStorage.getItem("jallekha.reduce-motion");
      if (saved === "1") value = true;
      else if (saved !== "0" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) value = true;
    } catch {
      // Storage unavailable: keep the default.
    }
  };
  return {
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get(): boolean {
      init();
      return value;
    },
    getServer(): boolean {
      return false;
    },
    set(v: boolean): void {
      value = v;
      initialized = true;
      try {
        window.localStorage.setItem("jallekha.reduce-motion", v ? "1" : "0");
      } catch {
        // Storage unavailable: preference stays for this session only.
      }
      for (const l of listeners) l();
    },
  };
})();

/** The reconciliation period in effect for a site. */
export function periodFor(state: WorkspaceState, siteId: string): { start: string; end: string } {
  return state.periods?.[siteId] ?? DEMO_PERIOD;
}

export interface WorkspaceStore {
  state: WorkspaceState;
  ready: boolean;
  mode: "demo" | "real";
  setDataMode(mode: "demo" | "real"): void;
  reduceMotion: boolean;
  setReduceMotion(v: boolean): void;
  selectedSiteId: string;
  setSelectedSiteId(id: string): void;
  period: { start: string; end: string };
  actions: {
    runReconciliation(siteId: string): ReconciliationResult | null;
    runAll(): void;
    setPeriod(siteId: string, startUTC: string, endUTC: string, actor: string): void;
    addSite(input: { name: string; timezone: string; description: string; actor: string }): string;
    addTank(input: { siteId: string; name: string; capacityLiters: number; note: string; actor: string }): string;
    addMeter(input: { siteId: string; name: string; boundary: string; actor: string }): string;
    addDelivery(input: {
      siteId: string; tankId: string; supplierLabel: string;
      receiptNumber: string; deliveredAtUTC: string;
      sourceQuantity: number; sourceUnit: VolumeUnit; quantityLiters: number;
      uncertaintyLiters: number; note: string; actor: string;
    }): void;
    voidDelivery(id: string, reason: string, actor: string): void;
    addTankReading(input: {
      siteId: string; tankId: string; observedAtUTC: string;
      stockLiters: number; uncertaintyLiters: number | null;
      method: string; quality: Quality; note: string; actor: string;
    }): void;
    addUsageReading(input: {
      siteId: string; meterId: string; observedAtUTC: string;
      cumulativeLiters: number; sourceValue: number; sourceUnit: VolumeUnit;
      uncertaintyLiters: number | null; quality: Quality; note: string; actor: string;
    }): void;
    assignInvestigation(id: string, assignee: string, actor: string): void;
    setInvestigationStatus(id: string, status: InvestigationStatus, actor: string): void;
    addEvidence(id: string, text: string, author: string): void;
    resolveInvestigation(
      id: string, outcome: ResolutionOutcome, explanation: string, reviewer: string,
    ): void;
    applyImport(batch: WorkspaceState["importBatches"][number], created: Delivery[]): void;
    applyReadingImport(
      batch: WorkspaceState["importBatches"][number],
      tankReadings: TankReading[],
      usageReadings: UsageReading[],
    ): void;
    importWorkspace(json: string, actor: string): void;
    resetWorkspace(): void;
  };
}

const Ctx = createContext<WorkspaceStore | null>(null);

export function useWorkspace(): WorkspaceStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return v;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [dataMode, setDataModeState] = useState<"demo" | "real">(() => dataModeStore.get());
  const setDataMode = useCallback((m: "demo" | "real") => {
    dataModeStore.set(m);
    setDataModeState(m);
  }, []);
  const adapter = useMemo(() => getAdapter(dataMode), [dataMode]);

  const [selectedSiteIdRaw, setSelectedSiteId] = useState<string | null>(null);

  // The adapter is the external store: server snapshot = fresh workspace for
  // the mode, client snapshot = persisted state. No hydration mismatch.
  const state = useSyncExternalStore(
    (cb) => adapter.subscribe(cb),
    () => adapter.load(),
    () => (dataMode === "real" ? buildEmptyWorkspace() : buildSeedWorkspace()),
  );
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const reduceMotion = useSyncExternalStore(
    motionStore.subscribe,
    () => motionStore.get(),
    () => motionStore.getServer(),
  );

  // Keep the selection valid across mode switches and workspace changes.
  const selectedSiteId =
    selectedSiteIdRaw && state.sites.some((s) => s.id === selectedSiteIdRaw)
      ? selectedSiteIdRaw
      : state.sites[0]?.id ?? "";
  const period = periodFor(state, selectedSiteId);

  const setReduceMotion = useCallback((v: boolean) => motionStore.set(v), []);

  /** Compute + persist a run for a site, supersede the previous, open cases. */
  const runReconciliation = useCallback(
    (siteId: string): ReconciliationResult | null => {
      let created: ReconciliationResult | null = null;
      adapter.update((s) => {
        const tank = s.tanks.find((t) => t.siteId === siteId);
        const meter = s.meters.find((m) => m.siteId === siteId);
        if (!tank || !meter) return s;
        const { start, end } = periodFor(s, siteId);
        const run = reconcile({
          siteId,
          tankId: tank.id,
          meterId: meter.id,
          periodStart: start,
          periodEnd: end,
          deliveries: s.deliveries.filter((d) => d.siteId === siteId),
          tankReadings: s.tankReadings.filter((t) => t.siteId === siteId),
          usageReadings: s.usageReadings.filter((u) => u.siteId === siteId),
          tanks: s.tanks,
          meters: s.meters,
          runId: makeId("run"),
        });
        created = run;
        const prevSameScope = s.runs.filter(
          (r) =>
            r.siteId === siteId && r.tankId === tank.id && r.meterId === meter.id &&
            r.periodStart === start && r.periodEnd === end &&
            !r.supersededByRunId,
        );
        const superseded = new Map(prevSameScope.map((r) => [r.id, run.id] as const));
        const runs = [
          ...s.runs.map((r) => (superseded.has(r.id) ? { ...r, supersededByRunId: superseded.get(r.id) } : r)),
          run,
        ];
        // Idempotently open investigations for actionable findings.
        const investigations = investigationsForRuns([run], s.investigations);
        const auditEvents = [
          ...s.auditEvents,
          makeAuditEvent("system (deterministic)", "reconciliation.run_saved", "ReconciliationResult", run.id, {
            after: { status: run.status, residual: run.residualLiters, ruleVersion: run.ruleVersion },
            at: run.generatedAt,
          }),
        ];
        return { ...s, runs, investigations, auditEvents };
      });
      return created;
    },
    [adapter],
  );

  const actions = useMemo<WorkspaceStore["actions"]>(() => {
    const recomputeSite = (siteId: string) => {
      runReconciliation(siteId);
    };
    return {
      runReconciliation,

      runAll: () => {
        for (const s of adapter.load().sites) runReconciliation(s.id);
      },

      setPeriod: (siteId, startUTC, endUTC, actor) => {
        adapter.update((s) => ({
          ...s,
          periods: { ...(s.periods ?? {}), [siteId]: { start: startUTC, end: endUTC } },
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(actor, "period.changed", "Site", siteId, {
              after: { start: startUTC, end: endUTC },
            }),
          ],
        }));
        recomputeSite(siteId);
      },

      addSite: (input) => {
        const id = makeId("site");
        adapter.update((s) => {
          const site: Site = {
            id,
            name: input.name,
            timezone: input.timezone,
            description: input.description || undefined,
            isDemo: false,
          };
          return {
            ...s,
            sites: [...s.sites, site],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "site.created", "Site", id, { after: { name: site.name } }),
            ],
          };
        });
        return id;
      },

      addTank: (input) => {
        const id = makeId("tank");
        adapter.update((s) => {
          const tank: Tank = {
            id,
            siteId: input.siteId,
            name: input.name,
            capacityLiters: input.capacityLiters,
            readingMethodNote: input.note || undefined,
          };
          return {
            ...s,
            tanks: [...s.tanks, tank],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "tank.created", "Tank", id, { after: { name: tank.name } }),
            ],
          };
        });
        return id;
      },

      addMeter: (input) => {
        const id = makeId("meter");
        adapter.update((s) => {
          const meter: Meter = {
            id,
            siteId: input.siteId,
            name: input.name,
            boundaryDescription: input.boundary,
            unit: "L",
            type: "cumulative",
          };
          return {
            ...s,
            meters: [...s.meters, meter],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "meter.created", "Meter", id, { after: { name: meter.name } }),
            ],
          };
        });
        return id;
      },

      addDelivery: (input) => {
        adapter.update((s) => {
          const now = new Date().toISOString();
          const delivery: Delivery = {
            id: makeId("dlv"),
            siteId: input.siteId,
            tankId: input.tankId,
            supplierLabel: input.supplierLabel,
            receiptNumber: input.receiptNumber || null,
            deliveredAt: input.deliveredAtUTC,
            sourceQuantity: input.sourceQuantity,
            sourceUnit: input.sourceUnit,
            quantityLiters: input.quantityLiters,
            quality: "measured",
            uncertaintyLiters: input.uncertaintyLiters,
            sourceReference: "Manual entry",
            note: input.note || undefined,
            status: "posted",
            createdBy: input.actor,
            createdAt: now,
            version: 1,
          };
          return {
            ...s,
            deliveries: [...s.deliveries, delivery],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "delivery.created", "Delivery", delivery.id, {
                after: { receipt: delivery.receiptNumber, liters: delivery.quantityLiters, at: delivery.deliveredAt },
              }),
            ],
          };
        });
        recomputeSite(input.siteId);
      },

      voidDelivery: (id, reason, actor) => {
        const target = adapter.load().deliveries.find((d0) => d0.id === id);
        adapter.update((s) => {
          const now = new Date().toISOString();
          const deliveries = s.deliveries.map((d0) => {
            if (d0.id !== id) return d0;
            return {
              ...d0,
              status: "voided" as const,
              voidReason: reason,
              voidedBy: actor,
              voidedAt: now,
              version: d0.version + 1,
            };
          });
          const auditEvents = [
            ...s.auditEvents,
            makeAuditEvent(actor, "delivery.voided", "Delivery", id, {
              before: { status: "posted" },
              after: { status: "voided" },
              reason,
            }),
          ];
          // Auto-resolve open duplicate investigations involving this record.
          const investigations = s.investigations.map((i) => {
            if (
              i.findingType === "duplicate-candidate" &&
              i.status !== "resolved" &&
              i.sourceIds.includes(id)
            ) {
              return {
                ...i,
                status: "resolved" as const,
                resolution: {
                  outcome: "duplicate-voided" as ResolutionOutcome,
                  explanation: `Record ${id} voided: ${reason}`,
                  reviewer: actor,
                  resolvedAt: now,
                },
                updatedAt: now,
              };
            }
            return i;
          });
          return { ...s, deliveries, investigations, auditEvents };
        });
        if (target) recomputeSite(target.siteId);
      },

      addTankReading: (input) => {
        adapter.update((s) => {
          const now = new Date().toISOString();
          const reading: TankReading = {
            id: makeId("tr"),
            siteId: input.siteId,
            tankId: input.tankId,
            observedAt: input.observedAtUTC,
            stockLiters: input.stockLiters,
            method: input.method,
            uncertaintyLiters: input.uncertaintyLiters,
            quality: input.quality,
            note: input.note || undefined,
            sourceReference: "Manual entry",
            createdBy: input.actor,
            createdAt: now,
          };
          return {
            ...s,
            tankReadings: [...s.tankReadings, reading],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "tankReading.created", "TankReading", reading.id, {
                after: { liters: reading.stockLiters, at: reading.observedAt, method: reading.method },
              }),
            ],
          };
        });
        recomputeSite(input.siteId);
      },

      addUsageReading: (input) => {
        adapter.update((s) => {
          const now = new Date().toISOString();
          const reading: UsageReading = {
            id: makeId("ur"),
            siteId: input.siteId,
            meterId: input.meterId,
            observedAt: input.observedAtUTC,
            sourceValue: input.sourceValue,
            sourceUnit: input.sourceUnit,
            cumulativeLiters: input.cumulativeLiters,
            uncertaintyLiters: input.uncertaintyLiters,
            quality: input.quality,
            note: input.note || undefined,
            sourceReference: "Manual entry",
            createdBy: input.actor,
            createdAt: now,
          };
          return {
            ...s,
            usageReadings: [...s.usageReadings, reading],
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(input.actor, "usageReading.created", "UsageReading", reading.id, {
                after: { cumulative: reading.cumulativeLiters, at: reading.observedAt },
              }),
            ],
          };
        });
        recomputeSite(input.siteId);
      },

      assignInvestigation: (id, assignee, actor) => {
        adapter.update((s) => ({
          ...s,
          investigations: s.investigations.map((i) =>
            i.id === id ? { ...i, assignee, updatedAt: new Date().toISOString() } : i,
          ),
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(actor, "investigation.assigned", "Investigation", id, { after: { assignee } }),
          ],
        }));
      },

      setInvestigationStatus: (id, status, actor) => {
        adapter.update((s) => {
          const inv = s.investigations.find((i) => i.id === id);
          if (inv) assertTransition(inv.status, status);
          return {
            ...s,
            investigations: s.investigations.map((i) =>
              i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i,
            ),
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(actor, "investigation.status_changed", "Investigation", id, {
                before: { status: inv?.status },
                after: { status },
              }),
            ],
          };
        });
      },

      addEvidence: (id, text, author) => {
        adapter.update((s) => ({
          ...s,
          investigations: s.investigations.map((i) =>
            i.id === id
              ? {
                  ...i,
                  evidenceNotes: [
                    ...i.evidenceNotes,
                    { id: makeId("ev"), author, text, addedAt: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : i,
          ),
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(author, "investigation.evidence_added", "Investigation", id, {}),
          ],
        }));
      },

      resolveInvestigation: (id, outcome, explanation, reviewer) => {
        adapter.update((s) => {
          const now = new Date().toISOString();
          return {
            ...s,
            investigations: s.investigations.map((i) => {
              if (i.id !== id) return i;
              assertTransition(i.status, "resolved");
              return {
                ...i,
                status: "resolved" as const,
                resolution: { outcome, explanation, reviewer, resolvedAt: now },
                updatedAt: now,
              };
            }),
            auditEvents: [
              ...s.auditEvents,
              makeAuditEvent(reviewer, "investigation.resolved", "Investigation", id, {
                after: { outcome },
                reason: explanation,
              }),
            ],
          };
        });
      },

      applyImport: (batch, created) => {
        const siteId = created[0]?.siteId;
        adapter.update((s) => ({
          ...s,
          deliveries: [...s.deliveries, ...created],
          importBatches: [...s.importBatches, batch],
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(batch.actor, "import.confirmed", "ImportBatch", batch.id, {
              after: { rows: batch.totalRows, imported: batch.validRowIds.length },
            }),
          ],
        }));
        if (siteId) recomputeSite(siteId);
      },

      applyReadingImport: (batch, tankReadings, usageReadings) => {
        const siteId = tankReadings[0]?.siteId ?? usageReadings[0]?.siteId;
        adapter.update((s) => ({
          ...s,
          tankReadings: [...s.tankReadings, ...tankReadings],
          usageReadings: [...s.usageReadings, ...usageReadings],
          importBatches: [...s.importBatches, batch],
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(batch.actor, "import.confirmed", "ImportBatch", batch.id, {
              after: { rows: batch.totalRows, imported: batch.validRowIds.length, kind: "readings" },
            }),
          ],
        }));
        if (siteId) recomputeSite(siteId);
      },

      importWorkspace: (json, actor) => {
        const parsed = JSON.parse(json) as WorkspaceState;
        if (
          typeof parsed !== "object" || parsed === null ||
          (parsed as WorkspaceState).schemaVersion !== 1 ||
          !Array.isArray((parsed as WorkspaceState).sites)
        ) {
          throw new Error("Not a JalLekha workspace export (schemaVersion 1 expected).");
        }
        adapter.update((s) => ({
          ...parsed,
          auditEvents: [
            ...s.auditEvents,
            makeAuditEvent(actor, "workspace.imported", "Workspace", parsed.sites[0]?.id ?? "workspace", {
              after: { sites: parsed.sites.length },
            }),
          ],
        }));
      },

      resetWorkspace: () => {
        adapter.reset();
      },
    };
  }, [adapter, runReconciliation]);

  const value = useMemo<WorkspaceStore>(
    () => ({
      state,
      ready: mounted,
      mode: dataMode,
      setDataMode,
      reduceMotion,
      setReduceMotion,
      selectedSiteId,
      setSelectedSiteId,
      period,
      actions,
    }),
    [state, mounted, dataMode, setDataMode, reduceMotion, setReduceMotion, selectedSiteId, period, actions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const emptySubscribe = () => () => {};

/** Latest non-superseded run for a site. */
export function activeRunFor(state: WorkspaceState, siteId: string): ReconciliationResult | null {
  return (
    state.runs
      .filter((r) => r.siteId === siteId && !r.supersededByRunId)
      .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
      .at(-1) ?? null
  );
}

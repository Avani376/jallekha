/**
 * Data access. Both modes run the same domain code:
 *  - "demo": seeded synthetic sites, resettable, labeled demo data.
 *  - "real": the operator's own records (starts empty; onboarding creates
 *    the site/tank/meter). Stored per-browser under its own key — this is a
 *    single-device workspace, not a shared server; use the JSON export to
 *    move data between devices.
 * A shared backend implements the same interface; the UI never special-cases
 * storage beyond the visible mode disclosure.
 */

import type { WorkspaceState } from "@/domain/types";
import { buildSeedWorkspace, buildEmptyWorkspace } from "./seed";

export const STORAGE_KEYS = {
  demo: "jallekha.workspace.v1",
  real: "jallekha.real.v1",
} as const;

export type DataMode = keyof typeof STORAGE_KEYS;

export type Unsubscribe = () => void;

export interface DataAdapter {
  readonly mode: DataMode;
  load(): WorkspaceState;
  save(state: WorkspaceState): void;
  /** Applies a mutation and notifies subscribers. Returns the next state. */
  update(fn: (s: WorkspaceState) => WorkspaceState): WorkspaceState;
  reset(): WorkspaceState;
  clear(): void;
  subscribe(listener: () => void): Unsubscribe;
}

function isValidState(s: unknown): s is WorkspaceState {
  return (
    typeof s === "object" &&
    s !== null &&
    (s as WorkspaceState).schemaVersion === 1 &&
    Array.isArray((s as WorkspaceState).sites)
  );
}

/**
 * Browser-local adapter. `mode` selects the storage key and the seed policy:
 * demo reseeds the synthetic sites; real resets to an empty workspace.
 */
export class LocalStorageAdapter implements DataAdapter {
  readonly mode: DataMode;
  private readonly storageKey: string;
  private memory: WorkspaceState | null = null;
  private listeners = new Set<() => void>();

  constructor(mode: DataMode) {
    this.mode = mode;
    this.storageKey = STORAGE_KEYS[mode];
  }

  private fresh(): WorkspaceState {
    return this.mode === "real" ? buildEmptyWorkspace() : buildSeedWorkspace();
  }

  private ensureLoaded(): WorkspaceState {
    if (this.memory) return this.memory;
    if (typeof window === "undefined") {
      // Server render: seed without touching storage; the client snapshot
      // takes over after hydration.
      return this.fresh();
    }
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidState(parsed)) {
          this.memory = parsed;
          return parsed;
        }
      }
    } catch {
      // Corrupt or unavailable storage: fall through to a fresh workspace.
    }
    const seeded = this.fresh();
    this.persist(seeded);
    this.memory = seeded;
    return seeded;
  }

  load(): WorkspaceState {
    return this.ensureLoaded();
  }

  save(state: WorkspaceState): void {
    this.memory = state;
    if (typeof window !== "undefined") this.persist(state);
    this.notify();
  }

  update(fn: (s: WorkspaceState) => WorkspaceState): WorkspaceState {
    const next = fn(this.ensureLoaded());
    this.save(next);
    return next;
  }

  reset(): WorkspaceState {
    const fresh = this.fresh();
    this.save(fresh);
    return fresh;
  }

  clear(): void {
    this.memory = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(this.storageKey);
      } catch {
        // Storage unavailable: nothing persisted to remove.
      }
    }
  }

  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private persist(state: WorkspaceState): void {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Storage full/unavailable: keep state in memory for this session.
    }
  }
}

/** Backwards-compatible alias for existing imports. */
export const LocalDemoAdapter = LocalStorageAdapter;

/** Returns the adapter for a workspace mode. */
export function getAdapter(mode: DataMode): DataAdapter {
  return new LocalStorageAdapter(mode);
}

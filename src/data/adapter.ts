/**
 * Dual-mode data access. The SAME domain code runs in both modes:
 *  - LocalDemoAdapter: per-visitor browser localStorage, explicitly labeled
 *    synthetic demo data. NOT shared cloud storage. Used when no backend
 *    credentials are configured (the current shipped mode).
 *  - InMemoryAdapter: tests and server rendering fallback.
 * A configured shared backend (e.g. Supabase with RLS) would implement the
 * same interface; nothing in the UI may special-case storage except for the
 * visible "demo data lives in this browser only" disclosure.
 */

import type { WorkspaceState } from "@/domain/types";
import { buildSeedWorkspace } from "./seed";

export const WORKSPACE_STORAGE_KEY = "jallekha.workspace.v1";

export type Unsubscribe = () => void;

export interface DataAdapter {
  readonly mode: "local-demo" | "in-memory";
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

export class InMemoryAdapter implements DataAdapter {
  readonly mode = "in-memory" as const;
  private state: WorkspaceState;
  private listeners = new Set<() => void>();
  constructor(seed?: WorkspaceState) {
    this.state = seed ?? buildSeedWorkspace();
  }
  load(): WorkspaceState {
    return this.state;
  }
  save(state: WorkspaceState): void {
    this.state = state;
    this.notify();
  }
  update(fn: (s: WorkspaceState) => WorkspaceState): WorkspaceState {
    this.state = fn(this.state);
    this.notify();
    return this.state;
  }
  reset(): WorkspaceState {
    this.state = buildSeedWorkspace();
    this.notify();
    return this.state;
  }
  clear(): void {
    this.state = buildSeedWorkspace();
    this.notify();
  }
  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export class LocalDemoAdapter implements DataAdapter {
  readonly mode = "local-demo" as const;
  private memory: WorkspaceState | null = null;
  private listeners = new Set<() => void>();
  private initialized = false;

  private ensureLoaded(): WorkspaceState {
    if (this.memory) return this.memory;
    if (typeof window === "undefined") {
      // Server render: seed without touching storage; the client snapshot
      // takes over after hydration.
      return buildSeedWorkspace();
    }
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidState(parsed)) {
          this.memory = parsed;
          this.initialized = true;
          return parsed;
        }
      }
    } catch {
      // Corrupt storage: fall through to a fresh seed (data is demo-only).
    }
    const seeded = buildSeedWorkspace();
    this.persist(seeded);
    this.memory = seeded;
    this.initialized = true;
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
    const seeded = buildSeedWorkspace();
    this.save(seeded);
    return seeded;
  }

  clear(): void {
    this.memory = null;
    this.initialized = false;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      } catch {
        // ignore
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
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full/unavailable: keep in-memory state for this session.
    }
  }
}

let singleton: DataAdapter | null = null;

/** Returns the process-wide adapter (local demo mode; backend mode later). */
export function getAdapter(): DataAdapter {
  if (!singleton) singleton = new LocalDemoAdapter();
  return singleton;
}

/** Test seam: inject an adapter (e.g. InMemoryAdapter). */
export function setAdapter(a: DataAdapter): void {
  singleton = a;
}

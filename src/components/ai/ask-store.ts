"use client";

/** Shared open/close store for the Ask Bundu drawer (no component cycles). */

type Listener = () => void;
let open = false;
const listeners = new Set<Listener>();

export const askStore = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  get(): boolean {
    return open;
  },
  set(v: boolean): void {
    open = v;
    for (const l of listeners) l();
  },
};

export function openAskPanel(): void {
  askStore.set(true);
}

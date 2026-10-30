"use client";

/**
 * Persistent "Reduce motion" control (master prompt Section 09): honors
 * prefers-reduced-motion, user choice sticks across pages, and decorative
 * animation is disabled for the whole app when active.
 */

import { useWorkspace } from "@/data/store";

export function MotionPreference() {
  const { reduceMotion, setReduceMotion } = useWorkspace();
  return (
    <button
      type="button"
      aria-pressed={reduceMotion}
      onClick={() => setReduceMotion(!reduceMotion)}
      className={`no-print fixed bottom-4 right-4 z-40 rounded-full border px-3.5 py-2 text-xs font-bold shadow-lg transition-colors ${
        reduceMotion
          ? "border-water-deep bg-water-deep text-white"
          : "border-slate-300 bg-white/90 text-slate-600 hover:text-ink"
      }`}
    >
      {reduceMotion ? "Motion reduced" : "Reduce motion"}
    </button>
  );
}

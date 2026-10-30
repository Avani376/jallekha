"use client";

/**
 * Reduce-motion toggle, placed in the app chrome (not a floating widget).
 * Honors prefers-reduced-motion, persists the user's choice, and disables
 * decorative animation app-wide when active.
 */

import { useWorkspace } from "@/data/store";
import { IconMotion } from "./icons";
import { cx } from "./ui";

export function MotionToggle({ onDark = false }: { onDark?: boolean }) {
  const { reduceMotion, setReduceMotion } = useWorkspace();
  return (
    <button
      type="button"
      aria-pressed={reduceMotion}
      title={reduceMotion ? "Animation is reduced" : "Reduce decorative animation"}
      onClick={() => setReduceMotion(!reduceMotion)}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
        reduceMotion
          ? "border-water-deep bg-water-deep text-white"
          : onDark
            ? "border-white/20 text-white/70 hover:border-aqua hover:text-aqua"
            : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-ink",
      )}
    >
      <IconMotion />
      <span className="hidden sm:inline">{reduceMotion ? "Motion off" : "Motion"}</span>
    </button>
  );
}

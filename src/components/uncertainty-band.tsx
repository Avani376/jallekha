"use client";

/**
 * Uncertainty band visual: conservative interval [min, max] with the zero
 * marker visible. Unknown uncertainty gets a labeled empty state, never a
 * fabricated bar.
 */

export function UncertaintyBand({
  min, max, residual,
}: { min: number | null; max: number | null; residual: number | null }) {
  if (min === null || max === null || residual === null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
        <p className="text-sm font-bold text-slate-600">Uncertainty not quantified</p>
        <p className="mt-1 text-xs text-slate-500">
          No interval is shown because at least one input lacks a declared measurement
          uncertainty. Residual is provisional.
        </p>
      </div>
    );
  }

  // Scale so both zero and the interval are always visible.
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0);
  const pad = (hi - lo) * 0.18 || 1;
  const x0 = lo - pad;
  const x1 = hi + pad;
  const px = (v: number) => ((v - x0) / (x1 - x0)) * 100;
  const containsZero = min <= 0 && 0 <= max;

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-4">
      <figcaption className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Conservative residual interval
      </figcaption>
      <div className="relative h-20">
        {/* axis */}
        <div className="absolute inset-x-0 top-9 h-px bg-slate-200" />
        {/* zero marker */}
        <div
          className="absolute top-2 bottom-2 w-[2px] rounded bg-ink"
          style={{ left: `${px(0)}%` }}
          aria-hidden
        />
        <span
          className="absolute -translate-x-1/2 text-[10px] font-bold text-ink"
          style={{ left: `${px(0)}%`, top: 0 }}
        >
          0
        </span>
        {/* band */}
        <div
          className={`absolute top-7 h-3 -translate-y-0 rounded-full ${
            containsZero ? "bg-verd/60" : "bg-amber"
          }`}
          style={{ left: `${px(min)}%`, width: `${px(max) - px(min)}%` }}
          aria-hidden
        />
        {/* residual marker */}
        <div
          className="absolute top-4 flex flex-col items-center -translate-x-1/2"
          style={{ left: `${px(residual)}%` }}
          aria-hidden
        >
          <div className={`h-10 w-[3px] rounded ${containsZero ? "bg-verd" : "bg-amber-deep"}`} />
        </div>
        <span
          className="tabular absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-extrabold text-slate-600"
          style={{ left: `${Math.min(88, Math.max(12, px(residual)))}%`, bottom: -2 }}
        >
          R = {residual.toLocaleString("en-IN")} L
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-slate-400">
        <span className="tabular">min {min.toLocaleString("en-IN")} L</span>
        <span className="tabular">max {max.toLocaleString("en-IN")} L</span>
      </div>
      <figcaption className="sr-only">
        Residual {residual} liters with conservative bounds from {min} to {max} liters.
        {containsZero ? " The interval contains zero." : " The interval does not contain zero."}
      </figcaption>
    </figure>
  );
}

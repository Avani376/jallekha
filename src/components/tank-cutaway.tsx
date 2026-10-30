"use client";

/**
 * Animated cutaway tank (original SVG/CSS). Liquid level reflects a real
 * computed value; decorative waves pause under reduced motion. Purely
 * presentational: the numeric value is always rendered as text nearby.
 */

export function TankCutaway({
  fillFraction,
  capacityLabel,
  valueLabel,
  height = 190,
  tone = "aqua",
  label,
}: {
  fillFraction: number; // 0..1
  capacityLabel: string;
  valueLabel: string;
  height?: number;
  tone?: "aqua" | "water" | "amber";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, fillFraction || 0));
  const gradId = `tank-grad-${tone}`;
  const colors =
    tone === "amber"
      ? { top: "#F2C36B", mid: "#E9AE45" }
      : tone === "water"
        ? { top: "#5FA3FF", mid: "#3188FF" }
        : { top: "#5FE3DD", mid: "#25D8D1" };

  return (
    <figure className="flex flex-col items-center">
      <svg
        role="img"
        aria-label={`Tank cutaway: ${valueLabel} of ${capacityLabel} (${Math.round(clamped * 100)}% full)`}
        viewBox="0 0 120 150"
        width={height * 0.86}
        height={height}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.top} />
            <stop offset="100%" stopColor={colors.mid} />
          </linearGradient>
          <clipPath id="tank-clip">
            <rect x="22" y="18" width="76" height="112" rx="12" />
          </clipPath>
        </defs>

        {/* Tank body */}
        <rect x="22" y="18" width="76" height="112" rx="12" fill="#0D2835" stroke="#25D8D1" strokeOpacity="0.55" strokeWidth="2" />
        <rect x="22" y="18" width="76" height="112" rx="12" fill="#061A24" fillOpacity="0.35" />

        {/* Liquid + waves, clipped to tank */}
        <g clipPath="url(#tank-clip)">
          <g transform={`translate(0, ${130 - clamped * 112})`}>
            <g className="animate-wave-drift" style={{ transformOrigin: "center" }}>
              <path
                d="M-30 6 Q -20 0 -10 6 T 10 6 T 30 6 T 50 6 T 70 6 T 90 6 T 110 6 T 130 6 T 150 6 V 40 H -30 Z"
                fill={`url(#${gradId})`}
                opacity="0.95"
              />
            </g>
            <g className="animate-wave-drift-slow" style={{ transformOrigin: "center" }}>
              <path
                d="M-30 9 Q -20 4 -10 9 T 10 9 T 30 9 T 50 9 T 70 9 T 90 9 T 110 9 T 130 9 T 150 9 V 40 H -30 Z"
                fill={colors.mid}
                opacity="0.5"
              />
            </g>
            <rect x="-30" y="10" width="180" height="120" fill={`url(#${gradId})`} opacity="0.85" />
          </g>
        </g>

        {/* Capacity ticks */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="98"
            x2="106"
            y1={130 - f * 112}
            y2={130 - f * 112}
            stroke="#25D8D1"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
        ))}
        {/* Inlet / outlet arrows */}
        <path d="M14 34 h8 m-3 -3 3 3 -3 3" stroke="#25D8D1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 118 h8 m-3 -3 3 3 -3 3" stroke="#3188FF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-2 text-center">
        {label ? <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div> : null}
        <div className="tabular text-lg font-extrabold text-ink">{valueLabel}</div>
        <div className="text-[11px] text-slate-400">of {capacityLabel} capacity</div>
      </figcaption>
    </figure>
  );
}

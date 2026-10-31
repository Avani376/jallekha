/**
 * Lightweight SVG chart kit for the dashboard. Fixed viewBox + responsive
 * width; palette constants match the design system; every mark carries a
 * native <title> and the numbers come straight from the analytics layer.
 */

import type { ReactNode } from "react";
import type { Slice } from "@/lib/analytics";
import { formatLiters, formatSignedLiters } from "@/domain/units";

const AQUA = "#25D8D1";
const AQUA_DEEP = "#0E9488";
const WATER = "#3188FF";
const AMBER = "#E9AE45";
const INK = "#061A24";
const SLATE = "#94A3B8";
const VERD = "#0E8A5F";

export function ChartCard({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-ink">{title}</h3>
          {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------- Flow waterfall ------------------------------ */

export function FlowWaterfall({
  opening, deliveries, usage, closing, residual,
}: {
  opening: number | null;
  deliveries: number;
  usage: number | null;
  closing: number | null;
  residual: number | null;
}) {
  const parts: { label: string; value: number; color: string; sign: 1 | -1 }[] = [];
  if (opening !== null) parts.push({ label: "O", value: opening, color: WATER, sign: 1 });
  if (deliveries > 0 || opening !== null) parts.push({ label: "D", value: deliveries, color: AQUA, sign: 1 });
  if (usage !== null) parts.push({ label: "U", value: usage, color: AMBER, sign: -1 });
  if (closing !== null) parts.push({ label: "C", value: closing, color: SLATE, sign: -1 });

  const W = 560;
  const H = 240;
  const pad = { l: 12, r: 12, t: 26, b: 34 };
  // Running waterfall levels — the y-scale is the PEAK stacked level, not
  // the signed sum (a balanced run sums to zero but still stacks to O + D).
  let run = 0;
  const bars = parts.map((p, i) => {
    const from = run;
    run += p.value * p.sign;
    return { ...p, i, from, to: run };
  });
  const peak = Math.max(
    run,
    ...bars.map((b) => Math.max(b.from, b.to)),
    residual !== null ? Math.max(0, residual) : 0,
    1,
  );
  const yMax = peak * 1.08;
  const plotH = H - pad.t - pad.b;
  const colW = (W - pad.l - pad.r) / (parts.length + (residual !== null ? 1 : 0));
  const barW = colW - 14;

  const geo = bars.map((b) => {
    const x = pad.l + b.i * colW + 7;
    const y = pad.t + (1 - Math.max(b.from, b.to) / yMax) * plotH;
    const hPx = Math.max((Math.abs(b.to - b.from) / yMax) * plotH, 2);
    return { ...b, x, y, hPx };
  });
  const level = run;

  const residualBar = (() => {
    if (residual === null) return null;
    const x = pad.l + parts.length * colW + 7;
    const hPx = Math.max((Math.abs(residual - level) / yMax) * plotH, 3);
    const color = Math.abs(residual) < 0.001 ? VERD : AMBER;
    return {
      label: "R", x, color,
      y: pad.t + (1 - Math.max(level, residual) / yMax) * plotH,
      hPx,
      value: residual,
    };
  })();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Water balance waterfall">
      {geo.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={barW} height={b.hPx} rx="4" fill={b.color} opacity={0.9} className="anim-grow" style={{ animationDelay: (b.i * 90) + "ms" }}>
            <title>{`${b.label}: ${formatLiters(b.value)} L`}</title>
          </rect>
          <text x={b.x + barW / 2} y={b.y - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
            {formatLiters(b.value)}
          </text>
          <text x={b.x + barW / 2} y={H - 12} textAnchor="middle" fontSize="12" fontWeight="800" fill="#475569">
            {b.label}
          </text>
        </g>
      ))}
      {residualBar ? (
        <g>
          <rect x={residualBar.x} y={residualBar.y} width={barW} height={residualBar.hPx} rx="4" fill={residualBar.color}>
            <title>{`R = ${formatSignedLiters(residualBar.value)} L`}</title>
          </rect>
          <text x={residualBar.x + barW / 2} y={residualBar.y - 7} textAnchor="middle" fontSize="11" fontWeight="800" fill={INK}>
            {formatSignedLiters(residualBar.value)}
          </text>
          <text x={residualBar.x + barW / 2} y={H - 12} textAnchor="middle" fontSize="12" fontWeight="800" fill={residualBar.color}>
            R
          </text>
        </g>
      ) : (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fontWeight="700" fill={AMBER}>
          residual unavailable — a required reading is missing
        </text>
      )}
    </svg>
  );
}

/* ------------------------------ Day bars ---------------------------------- */

export function DayBars({ data, unitLabel }: { data: { label: string; liters: number }[]; unitLabel: string }) {
  const W = 560;
  const H = 220;
  const pad = { l: 14, r: 14, t: 24, b: 30 };
  const max = Math.max(...data.map((d) => d.liters), 1);
  const bw = (W - pad.l - pad.r) / Math.max(data.length, 1) - 6;
  const labelEvery = Math.ceil(data.length / 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={unitLabel}>
      {data.map((d, i) => {
        const h = (d.liters / max) * (H - pad.t - pad.b);
        const x = pad.l + i * ((W - pad.l - pad.r) / Math.max(data.length, 1)) + 3;
        return (
          <g key={d.label + i}>
            <rect x={x} y={H - pad.b - h} width={Math.max(bw, 3)} height={Math.max(h, 1)} rx="3" fill={AQUA} opacity={0.9} className="anim-grow" style={{ animationDelay: (i * 45) + "ms" }}>
              <title>{`${d.label}: ${formatLiters(d.liters)} L`}</title>
            </rect>
            {i % labelEvery === 0 ? (
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748B">{d.label}</text>
            ) : null}
          </g>
        );
      })}
      {data.length === 0 ? (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="#94A3B8">no records yet</text>
      ) : null}
    </svg>
  );
}

/* --------------------------- Cumulative line ------------------------------- */

export function CumulativeLine({
  points, deliveryDays,
}: {
  points: { label: string; liters: number }[];
  deliveryDays: Map<string, number>;
}) {
  const W = 560;
  const H = 220;
  const pad = { l: 52, r: 14, t: 18, b: 30 };
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="#94A3B8">
          need at least two meter readings for a trend
        </text>
      </svg>
    );
  }
  const vals = points.map((p) => p.liters);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 1);
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.liters).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const labelEvery = Math.ceil(points.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Cumulative meter trend">
      <path d={area} fill={WATER} opacity={0.08} />
      <path d={path} fill="none" stroke={WATER} strokeWidth="2.5" strokeLinejoin="round" className="anim-draw" style={{ "--draw-len": "1600" } as React.CSSProperties} />
      {points.map((p, i) => (
        <g key={p.label + i}>
          <circle
            cx={x(i)} cy={y(p.liters)} r={deliveryDays.has(p.label) ? 5 : 2.6}
            fill={deliveryDays.has(p.label) ? AQUA_DEEP : WATER}
            stroke={deliveryDays.has(p.label) ? "#ffffff" : "none"}
            strokeWidth={deliveryDays.has(p.label) ? 1.5 : 0}
          >
            <title>{`${p.label}: ${formatLiters(p.liters)} L${deliveryDays.has(p.label) ? ` · delivery ${formatLiters(deliveryDays.get(p.label)!)} L` : ""}`}</title>
          </circle>
          {i % labelEvery === 0 ? (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748B">{p.label}</text>
          ) : null}
        </g>
      ))}
      <text x={pad.l - 6} y={y(max) + 4} textAnchor="end" fontSize="10" fill="#64748B">{formatLiters(max)}</text>
      <text x={pad.l - 6} y={y(min) + 4} textAnchor="end" fontSize="10" fill="#64748B">{formatLiters(min)}</text>
    </svg>
  );
}

/* --------------------------------- Donut ----------------------------------- */

const TONE_HEX: Record<Slice["tone"], string> = {
  ok: VERD, review: AMBER, warn: AMBER, info: WATER, neutral: SLATE, danger: "#C2410C",
};

export function Donut({ slices, centerLabel, centerValue }: { slices: Slice[]; centerLabel: string; centerValue: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const W = 220;
  const R = 78;
  const r = 50;
  const cx = W / 2;
  const cy = 110;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s) => {
    const sweep = total === 0 ? 0 : (s.value / total) * Math.PI * 2;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(angle + sweep);
    const y2 = cy + R * Math.sin(angle + sweep);
    const xi2 = cx + r * Math.cos(angle + sweep);
    const yi2 = cy + r * Math.sin(angle + sweep);
    const xi1 = cx + r * Math.cos(angle);
    const yi1 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large} 0 ${xi1},${yi1} Z`;
    angle += sweep;
    return { ...s, d };
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox={`0 0 ${W} 220`} className="h-[190px] w-[190px]" role="img" aria-label={centerLabel}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="#E2E8F0" strokeWidth={R - r} />
        ) : (
          arcs.map((a) => (
            <path key={a.label} d={a.d} fill={TONE_HEX[a.tone]} opacity={0.92} className="anim-sweep" style={{ animationDelay: (slices.indexOf(a) * 120) + "ms" }}>
              <title>{`${a.label}: ${a.value}`}</title>
            </path>
          ))
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight="800" fill={INK}>{centerValue}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="11" fill="#64748B">{centerLabel}</text>
      </svg>
      <ul className="min-w-[180px] space-y-2 text-[13px]">
        {slices.length === 0 ? <li className="text-slate-400">Nothing flagged in this run.</li> : null}
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 font-semibold text-slate-600">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TONE_HEX[s.tone] }} />
            {s.label}
            <span className="tabular ml-auto font-extrabold text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ Quality mix -------------------------------- */

export function QualityMixBar({ measured, estimated, unknown }: { measured: number; estimated: number; unknown: number }) {
  const total = Math.max(measured + estimated + unknown, 1);
  const seg = (v: number) => (v / total) * 100;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Measurement quality mix">
        <div style={{ width: `${seg(measured)}%` }} className="bg-verd" title={`Measured: ${measured}`} />
        <div style={{ width: `${seg(estimated)}%` }} className="bg-amber" title={`Estimated: ${estimated}`} />
        <div style={{ width: `${seg(unknown)}%` }} className="bg-slate-300" title={`Unknown: ${unknown}`} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
        <div><dt className="font-bold text-verd">{measured}</dt><dd className="text-slate-500">measured</dd></div>
        <div><dt className="font-bold text-amber-deep">{estimated}</dt><dd className="text-slate-500">estimated</dd></div>
        <div><dt className="font-bold text-slate-500">{unknown}</dt><dd className="text-slate-500">unknown</dd></div>
      </dl>
    </div>
  );
}

/* ------------------------------ Runs trend --------------------------------- */

export function RunsTrend({ points }: { points: { label: string; residual: number | null; min: number | null; max: number | null; active: boolean }[] }) {
  const W = 560;
  const H = 200;
  const pad = { l: 56, r: 14, t: 16, b: 28 };
  if (points.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="#94A3B8">no saved runs yet</text>
      </svg>
    );
  }
  const finite = points.filter((p) => p.residual !== null) as { label: string; residual: number; min: number | null; max: number | null; active: boolean }[];
  const lo = Math.min(0, ...finite.map((p) => Math.min(p.residual, p.min ?? p.residual)));
  const hi = Math.max(0, ...finite.map((p) => Math.max(p.residual, p.max ?? p.residual)));
  const span = Math.max(hi - lo, 1) * 1.15;
  const x = (i: number) => pad.l + (finite.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (finite.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Residual across saved runs">
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke={INK} strokeWidth="1.5" />
      <text x={pad.l - 6} y={y(0) + 4} textAnchor="end" fontSize="10" fontWeight="700" fill={INK}>0</text>
      {finite.map((p, i) => {
        const hasBand = p.min !== null && p.max !== null;
        const bandTop = hasBand ? y(p.max as number) : y(p.residual) - 6;
        const bandH = hasBand ? Math.max((p.max as number) - (p.min as number), 0) / span * (H - pad.t - pad.b) : 12;
        const containsZero = hasBand && (p.min as number) <= 0 && 0 <= (p.max as number);
        return (
          <g key={p.label + i}>
            <rect
              className="anim-fade" style={{ animationDelay: (i * 70) + "ms" }}
              x={x(i) - 9} y={bandTop} width={18} height={Math.max(bandH, 4)} rx="5"
              fill={containsZero ? VERD : AMBER} opacity={p.active ? 0.85 : 0.3}
            >
              <title>{`${p.label}: R ${formatSignedLiters(p.residual)} L${hasBand ? `, bounds [${formatLiters(p.min as number)}, ${formatLiters(p.max as number)}]` : ", bounds not quantified"}${p.active ? " (active)" : " (superseded)"}`}</title>
            </rect>
            <circle cx={x(i)} cy={y(p.residual)} r="4" fill={containsZero ? VERD : AMBER} stroke="#fff" strokeWidth="1.4" />
            {finite.length <= 12 || i % 2 === 0 ? (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#64748B">{p.label.split(" ")[0]}</text>
            ) : null}
          </g>
        );
      })}
      {points.length !== finite.length ? (
        <text x={W - pad.r} y={pad.t + 10} textAnchor="end" fontSize="10.5" fill={AMBER}>
          incomplete runs (no residual) are excluded from the scale
        </text>
      ) : null}
    </svg>
  );
}

/* -------------------------------- Gauge ------------------------------------ */

export function LevelGauge({ fraction, liters, capacity }: { fraction: number; liters: number | null; capacity: number }) {
  const W = 220;
  const H = 130;
  const cx = W / 2;
  const cy = 108;
  const R = 84;
  const clamped = Math.max(0, Math.min(1, fraction));
  const angle = Math.PI * (1 - clamped);
  const nx = cx + (R - 12) * Math.cos(angle);
  const ny = cy - (R - 12) * Math.sin(angle);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Tank level ${Math.round(clamped * 100)}%`}>
      <path d={`M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`} fill="none" stroke="#E2E8F0" strokeWidth="16" strokeLinecap="round" />
      <path
        className="anim-sweep"
        d={`M${cx - R},${cy} A${R},${R} 0 0 1 ${nx},${ny}`}
        fill="none"
        stroke={clamped > 0.5 ? AQUA : clamped > 0.2 ? AMBER : "#C2410C"}
        strokeWidth="16"
        strokeLinecap="round"
      >
        <title>{`${liters === null ? "—" : formatLiters(liters)} L of ${formatLiters(capacity)} L`}</title>
      </path>
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill={INK}>{Math.round(clamped * 100)}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#64748B">
        {liters === null ? "no reading" : `${formatLiters(liters)} / ${formatLiters(capacity)} L`}
      </text>
    </svg>
  );
}

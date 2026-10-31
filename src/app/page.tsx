"use client";

/**
 * JalLekha landing: cinematic deep-ink hero with an animated cutaway tank,
 * receipt-to-ledger choreography, the interactive duplicate vs
 * missing-reading comparison, workflow, honest status, and the SevaForge
 * team stage. The water experience is CSS-only ambient motion — layered
 * swell, rising bubbles, drifting droplets, ripple rings and a flow ribbon —
 * every loop designed to settle in a clean static state under reduced
 * motion. Text and CTAs render immediately (no splash wait); scroll reveals
 * are small staggers; prefers-reduced-motion is honored via the global
 * control.
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TankCutaway } from "@/components/tank-cutaway";
import { StatusPill } from "@/components/ui";
import { MotionToggle } from "@/components/motion-preference";
import { MascotAssistant } from "@/components/mascot";
import { useWorkspace } from "@/data/store";

export default function LandingPage() {
  const { reduceMotion } = useWorkspace();
  return (
    <div className={reduceMotion ? "reduce-motion bg-ink text-white" : "bg-ink text-white"}>
      <Hero />
      <CaseComparison />
      <Workflow />
      <StatusSection />
      <WaveSeam />
      <TeamSection />
      <MascotAssistant onDark />
    </div>
  );
}

/* --------------------------------- Hero --------------------------------- */

/** Static, SSR-stable ambient particles (never randomize during render). */
const BUBBLES = [
  { l: "6%", s: 10, d: 11.5, w: -2, x: 18, o: 0.5, h: -380 },
  { l: "14%", s: 6, d: 9.5, w: -5, x: -12, o: 0.35, h: -320 },
  { l: "23%", s: 14, d: 13, w: -8, x: 22, o: 0.55, h: -420 },
  { l: "38%", s: 7, d: 10.5, w: -1.5, x: -16, o: 0.3, h: -340 },
  { l: "55%", s: 11, d: 12, w: -4, x: 14, o: 0.45, h: -400 },
  { l: "67%", s: 8, d: 9, w: -6.5, x: -20, o: 0.4, h: -330 },
  { l: "79%", s: 13, d: 12.5, w: -3, x: 24, o: 0.5, h: -410 },
  { l: "90%", s: 6, d: 10, w: -7, x: -14, o: 0.35, h: -310 },
] as const;

const RAINDROPS = [
  { l: "9%", d: 7.5, w: -1, o: 0.3 },
  { l: "18%", d: 6.2, w: -4, o: 0.2 },
  { l: "31%", d: 8.4, w: -2.5, o: 0.28 },
  { l: "44%", d: 6.8, w: -6, o: 0.18 },
  { l: "58%", d: 7.9, w: -3, o: 0.32 },
  { l: "70%", d: 6.5, w: -5, o: 0.22 },
  { l: "83%", d: 8.8, w: -1.8, o: 0.28 },
  { l: "95%", d: 7.2, w: -4.4, o: 0.24 },
] as const;

function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* ambient deep-water atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-water/20 blur-[100px]" />
        <div className="absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-aqua/15 blur-[100px]" />

        {/* a slow rain of droplets */}
        <div className="absolute inset-0">
          {RAINDROPS.map((r, i) => (
            <span
              key={i}
              className="water-drop"
              style={
                {
                  left: r.l,
                  top: "-30px",
                  "--rain-d": `${r.d}s`,
                  "--rain-o": r.o,
                  animationDelay: `${r.w}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* bubbles rising through the water column */}
        <div className="absolute inset-0">
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="water-bubble"
              style={
                {
                  left: b.l,
                  width: b.s,
                  height: b.s,
                  "--rise-d": `${b.d}s`,
                  "--rise-x": `${b.x}px`,
                  "--rise-h": `${b.h}px`,
                  "--rise-o": b.o,
                  animationDelay: `${b.w}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* layered swell surface + caustic shimmer */}
        <div className="absolute inset-x-0 bottom-0">
          <svg className="block h-[150px] w-full sm:h-[180px]" viewBox="0 0 1440 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-water-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#25D8D1" />
                <stop offset="100%" stopColor="#3188FF" />
              </linearGradient>
            </defs>
            <path
              d="M0 70 Q 120 46 240 66 T 480 64 T 720 68 T 960 60 T 1200 68 T 1440 62 V 180 H 0 Z"
              fill="#3188FF"
              opacity="0.16"
              className="animate-swell-slow"
            />
            <path
              d="M0 92 Q 120 70 240 88 T 480 86 T 720 92 T 960 82 T 1200 90 T 1440 84 V 180 H 0 Z"
              fill="#25D8D1"
              opacity="0.2"
              className="animate-swell"
            />
            <path
              d="M0 116 Q 120 96 240 112 T 480 110 T 720 116 T 960 106 T 1200 114 T 1440 108 V 180 H 0 Z"
              fill="url(#hero-water-grad)"
              opacity="0.5"
              className="animate-wave-drift"
            />
          </svg>
          <div className="caustic-sheen absolute inset-x-0 bottom-0 h-[120px] opacity-50" />
        </div>
      </div>

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <TankMark />
          <span className="font-display text-xl font-extrabold tracking-tight">JalLekha</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/demo" className="rounded-xl px-3.5 py-2 text-white/80 transition hover:bg-white/10 hover:text-white">
            Guided demo
          </Link>
          <Link href="/workspace" className="rounded-xl border border-white/20 px-3.5 py-2 transition hover:border-aqua hover:text-aqua">
            Open workspace
          </Link>
          <MotionToggle onDark />
        </div>
      </nav>

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-24 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
        <div className="animate-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-aqua/40 bg-aqua/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-aqua">
            Prototype using synthetic demonstration data
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Every delivery. Every reading.
            <span className="text-water-gradient block">
              A clearer water balance.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            JalLekha reconciles tanker receipts, tank stock readings and metered consumption for campuses and housing
            societies — showing what came in, what was measured, and what needs checking, with uncertainty you can see
            and a documented audit trail.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="rounded-2xl bg-aqua px-6 py-3.5 font-display text-[15px] font-extrabold text-ink shadow-[0_8px_30px_rgba(37,216,209,0.35)] transition-transform duration-150 hover:scale-[1.03] active:scale-100"
            >
              Try the live demo
            </Link>
            <a
              href="https://github.com/Avani376/jallekha"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-white/25 px-6 py-3.5 font-display text-[15px] font-bold text-white/90 transition hover:border-aqua hover:text-aqua"
            >
              Explore the repository
            </a>
          </div>
          <p className="mt-6 max-w-lg text-[13px] leading-relaxed text-white/45">
            A discrepancy is not proof of theft. JalLekha separates duplicate records from missing measurements and
            unexplained residuals — each gets a different verification task, and every correction keeps its history.
          </p>
        </div>

        <HeroScene />
      </div>
    </header>
  );
}

function TankMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#25D8D1" />
          <stop offset="100%" stopColor="#3188FF" />
        </linearGradient>
      </defs>
      <path d="M12 2.4C12 2.4 5.4 10 5.4 14.6a6.6 6.6 0 0 0 13.2 0C18.6 10 12 2.4 12 2.4Z" fill="url(#mark-g)" />
      <path d="M8.5 14.8a3.5 3.5 0 0 0 7 0" stroke="#061A24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Receipt-to-ledger choreography: receipt cards settle while a connecting
 * path draws, and the equation resolves into an evidence panel. Ripple
 * rings pulse behind the panel like sonar through water. Pure SVG/CSS
 * ambient loop; disabled under reduced motion via .reduce-motion.
 */
function HeroScene() {
  return (
    <div className="animate-fade-in relative mx-auto w-full max-w-md">
      {/* sonar ripple rings, painted behind the panel */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="ripple-ring left-1/2 top-1/2" style={{ "--ring-w": "540px", "--ring-d": "4.6s" } as React.CSSProperties} />
        <span className="ripple-ring left-1/2 top-1/2" style={{ "--ring-w": "540px", "--ring-d": "4.6s", animationDelay: "1.5s" } as React.CSSProperties} />
        <span className="ripple-ring left-1/2 top-1/2" style={{ "--ring-w": "540px", "--ring-d": "4.6s", animationDelay: "3s" } as React.CSSProperties} />
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-ink-soft/80 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          {/* receipts */}
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="hero-receipt w-36 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2"
                style={{ animationDelay: `${i * 0.9}s` }}
              >
                <p className="text-[10px] font-bold text-white/50">DELIVERY RECEIPT</p>
                <p className="tabular text-[12px] font-extrabold text-aqua">#{["R-101", "R-102", "R-101"][i]}</p>
                <p className="tabular text-[11px] text-white/60">{[5000, 2500, 5000][i].toLocaleString("en-IN")} L</p>
              </div>
            ))}
          </div>

          {/* tank */}
          <div className="rounded-2xl bg-ink/60 px-2 pb-1 pt-2">
            <TankCutaway fillFraction={0.62} capacityLabel="20,000 L" valueLabel="11,000 L" height={168} onDark />
          </div>
        </div>

        {/* connecting path */}
        <svg viewBox="0 0 360 60" className="mt-2 w-full">
          <path d="M30 2 C 30 34, 120 26, 180 30 S 330 34, 330 56" fill="none" stroke="#25D8D1" strokeWidth="1.6" strokeDasharray="5 7" className="animate-flow" opacity="0.7" />
          <circle cx="30" cy="2" r="3" fill="#25D8D1" />
          <circle cx="330" cy="56" r="3" fill="#3188FF" />
        </svg>

        {/* ledger + equation */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Water ledger — 28→29 Oct</p>
          <p className="tabular mt-1.5 font-display text-[15px] font-extrabold text-white">
            10,000 + 5,000 − 4,000 − 11,000 = <span className="text-aqua">0 L</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-verd to-aqua" />
            </span>
            <span className="text-[11px] font-semibold text-white/55">within ±600 L stated uncertainty</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .hero-receipt { animation: receipt-settle 8s ease-in-out infinite; }
        @keyframes receipt-settle {
          0% { transform: translateY(0); }
          12% { transform: translateY(-6px); }
          24% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* --------------------------- Case comparison ---------------------------- */

const CASES = {
  duplicate: {
    label: "Duplicate receipt",
    residual: "R = +5,000 L (raw ledger)",
    bounds: "[4,300, 5,700] L — excludes zero",
    finding: "Duplicate candidate — exact match on supplier + receipt number + site",
    why: "Two posted records share receipt R-101 and 5,000 L. The flagged row stays in the as-recorded total until a reviewer voids it with a reason.",
    action: "Record-review action: compare with the physical receipt, void the repeated entry, keep history, recompute.",
    result: "After the reviewed void: R = 0 L, interval [−600, +600] L. Original records retained.",
  },
  missing: {
    label: "Missing reading",
    residual: "Residual unavailable — not calculated",
    bounds: "No interval asserted",
    finding: "Missing reading — closing stock absent at the period boundary",
    why: "Without the closing stock reading the equation cannot be evaluated. JalLekha never substitutes zero or a nearby reading, and never treats a gap as a discrepancy.",
    action: "Measurement action: take and record the closing reading, then recompute.",
    result: "After the reading is recorded: R = 0 L, interval [−600, +600] L.",
  },
} as const;

function CaseComparison() {
  const [k, setK] = useState<keyof typeof CASES>("duplicate");
  const c = CASES[k];
  return (
    <section className="reveal-section relative border-t border-white/10 bg-ink-soft/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-widest text-aqua">The two cases every reviewer meets</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            A duplicate receipt and a missing reading are not the same problem.
          </h2>
          <WaveUnderline />
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">
            Both can look like “water doesn’t add up”. They need different next actions — and neither is proof of theft
            or leakage. Toggle to compare what JalLekha shows.
          </p>
        </Reveal>

        <Reveal className="mt-8">
          <div role="tablist" aria-label="Compare findings" className="inline-flex rounded-2xl border border-white/15 bg-white/5 p-1">
            {(Object.keys(CASES) as (keyof typeof CASES)[]).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={k === key}
                onClick={() => setK(key)}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                  k === key ? "bg-aqua text-ink shadow-lg" : "text-white/60 hover:text-white"
                }`}
              >
                {CASES[key].label}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={k} className="animate-rise mt-6 grid gap-4 lg:grid-cols-4">
          <CompareCard title="What the ledger shows" body={c.residual} sub={c.bounds} accent="text-aqua" />
          <CompareCard title="Finding raised" body={c.finding} sub={c.why} accent="text-amber" />
          <CompareCard title="Next action" body={c.action} accent="text-water" />
          <CompareCard title="After the task is done" body={c.result} accent="text-verd" />
        </div>
      </div>
    </section>
  );
}

function CompareCard({ title, body, sub, accent }: { title: string; body: string; sub?: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-colors hover:border-aqua/40">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{title}</p>
      <p className={`tabular mt-2 font-display text-[15px] font-extrabold leading-snug ${accent}`}>{body}</p>
      {sub ? <p className="mt-2 text-[13px] leading-relaxed text-white/55">{sub}</p> : null}
    </div>
  );
}

/* ------------------------------- Workflow -------------------------------- */

const STEPS = [
  { n: "01", t: "Record", d: "Delivery receipts, tank stock readings and cumulative meter values — manual entry or CSV import with a validate-before-commit preview." },
  { n: "02", t: "Reconcile", d: "R = O + D − U − C computed deterministically, with conservative uncertainty bounds and explicit status precedence." },
  { n: "03", t: "Investigate", d: "Findings become owned cases: duplicate candidates, missing readings, invalid inputs, residuals outside uncertainty." },
  { n: "04", t: "Resolve & export", d: "Evidence, reviewed corrections that preserve history, recomputed balances, and a printable documented review." },
];

/**
 * Flow ribbon: droplets travel the pipeline the workflow cards below
 * describe. Decorative only — no numbers, so the claims policy is untouched.
 */
function FlowRibbon() {
  return (
    <Reveal className="mt-10">
      <div aria-hidden className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-6 pb-4 pt-5">
        <div className="relative mx-auto h-8 max-w-3xl">
          <svg viewBox="0 0 600 32" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <line x1="10" y1="16" x2="590" y2="16" stroke="#25D8D1" strokeOpacity="0.4" strokeWidth="1.6" strokeDasharray="5 8" className="animate-flow" />
            <circle cx="10" cy="16" r="3.5" fill="#25D8D1" />
            <circle cx="590" cy="16" r="3.5" fill="#3188FF" />
          </svg>
          <span className="flow-ribbon-track" style={{ "--travel-d": "6.4s", animationDelay: "-1s" } as React.CSSProperties} />
          <span className="flow-ribbon-track" style={{ "--travel-d": "7.8s", animationDelay: "-4.6s" } as React.CSSProperties} />
          <span className="flow-ribbon-track" style={{ "--travel-d": "5.6s", animationDelay: "-3.1s" } as React.CSSProperties} />
        </div>
        <div className="mx-auto flex max-w-3xl justify-between pt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <span>Record</span>
          <span>Reconcile</span>
          <span>Investigate</span>
          <span>Resolve</span>
        </div>
      </div>
    </Reveal>
  );
}

function Workflow() {
  return (
    <section className="reveal-section relative border-t border-white/10 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-widest text-aqua">From records to documented resolution</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">One workflow, visible end to end.</h2>
          <WaveUnderline />
        </Reveal>

        <FlowRibbon />

        <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <li className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-aqua/50">
                <span className="tabular font-display text-2xl font-extrabold text-aqua/80">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-extrabold">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------ Status/honest ---------------------------- */

function StatusSection() {
  return (
    <section className="reveal-section relative border-t border-white/10 bg-ink-soft/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-widest text-aqua">Actual status</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">What works today — stated plainly.</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <div className="h-full rounded-2xl border border-verd/30 bg-verd/[0.07] p-5">
              <StatusPill tone="ok">Working</StatusPill>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-white/65 marker:text-aqua/70">
                <li>Deterministic reconciliation engine with conservative uncertainty intervals</li>
                <li>41 automated domain tests covering the four signature scenarios and edge cases</li>
                <li>Duplicate vs missing-reading journeys with reviewable resolutions and audit trail</li>
                <li>CSV import with idempotent replay and validate-before-commit preview</li>
                <li>Printable documented review + safe CSV/JSON export</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="h-full rounded-2xl border border-amber/30 bg-amber/[0.07] p-5">
              <StatusPill tone="review">Prototype boundary</StatusPill>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-white/65 marker:text-aqua/70">
                <li>Synthetic demonstration data only — no field pilot has been conducted</li>
                <li>Demo data is stored per-visitor in the browser, not on a shared server</li>
                <li>Core accounting runs with AI fully off; no live AI calls in this build</li>
                <li>Boundary readings are matched exactly (tolerance 0) in rule version recon-v1.0</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <StatusPill tone="info">Next</StatusPill>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-white/65 marker:text-aqua/70">
                <li>A permissioned pilot at one campus or society, with documented measurement quality</li>
                <li>Operator review of labels and usefulness</li>
                <li>Optional bounded AI assistance for note structuring — calculations stay deterministic</li>
                <li>Shared authenticated workspaces when a backend is configured</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Team / SevaForge --------------------------- */

type Member = {
  name: string;
  role: string;
  focus: string;
  glyph: "compass" | "code" | "shield" | "search";
};

const MEMBERS: Member[] = [
  {
    name: "Arya Jannawar",
    role: "Team Lead",
    focus: "Product & the reconciliation domain — the problem, the math, the story.",
    glyph: "compass",
  },
  {
    name: "Avani Jannawar",
    role: "Engineering & Data Integrity",
    focus: "Repository owner — engine, CSV pipeline and the data adapter layer.",
    glyph: "code",
  },
  {
    name: "Siddhant Santosh Pardeshi",
    role: "Quality & User Workflow",
    focus: "Test gates, e2e journeys and every operator-facing screen.",
    glyph: "shield",
  },
  {
    name: "Vijay Sahu",
    role: "Research & Validation",
    focus: "Field methods, measurement uncertainty and the evidence trail.",
    glyph: "search",
  },
];

/** Transition seam: water rising from the ink page into the team stage. */
function WaveSeam() {
  return (
    <div aria-hidden className="relative -mb-px h-[56px] w-full">
      <svg viewBox="0 0 1440 56" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path
          d="M0 34 Q 180 10 360 32 T 720 30 T 1080 34 T 1440 24 V 56 H 0 Z"
          fill="#25D8D1"
          opacity="0.2"
          className="animate-wave-drift-slow"
        />
        <path
          d="M0 40 Q 240 22 480 40 T 960 38 T 1440 32 V 56 H 0 Z"
          fill="#0d2835"
          className="animate-wave-drift"
        />
      </svg>
    </div>
  );
}

function WaveUnderline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 140 12"
      width="140"
      height="12"
      className="wave-underline mt-3 block"
      style={{ "--draw-len": "180" } as React.CSSProperties}
    >
      <path
        d="M2 8 Q 20 2 38 7 T 74 7 T 110 6 T 138 7"
        fill="none"
        stroke="#25D8D1"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A small upright droplet used on the orbit ring around the team mark. */
function OrbitDroplet() {
  return (
    <svg width="14" height="17" viewBox="0 0 14 17" aria-hidden>
      <path
        d="M7 1C7 1 1.6 7.6 1.6 11a5.4 5.4 0 0 0 10.8 0C12.4 7.6 7 1 7 1Z"
        fill="#25D8D1"
        stroke="#061A24"
        strokeWidth="1"
      />
      <circle cx="4.9" cy="10.6" r="1.6" fill="#ffffff" opacity="0.75" />
    </svg>
  );
}

function MemberGlyph({ kind }: { kind: Member["glyph"] }) {
  const common = {
    fill: "none",
    stroke: "#eaf9f8",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <g transform="translate(20 20)" {...common}>
      {kind === "compass" ? (
        <>
          <circle cx="12" cy="12" r="8.4" />
          <path d="M15.4 8.6 13.2 13.2 8.6 15.4 10.8 10.8Z" fill="#eaf9f8" strokeWidth="1.2" />
        </>
      ) : null}
      {kind === "code" ? <path d="M8.6 7.4 4 12l4.6 4.6M15.4 7.4 20 12l-4.6 4.6M13 5.6 11 18.4" /> : null}
      {kind === "shield" ? (
        <>
          <path d="M12 3.6 19 6.4v5.2c0 4.3-3 7.4-7 8.8-4-1.4-7-4.5-7-8.8V6.4Z" />
          <path d="M9 11.8 11.2 14 15.2 9.8" />
        </>
      ) : null}
      {kind === "search" ? (
        <>
          <circle cx="10.6" cy="10.6" r="5.6" />
          <path d="m15 15 4.6 4.6" />
        </>
      ) : null}
    </g>
  );
}

function MemberCard({ m, i }: { m: Member; i: number }) {
  return (
    <Reveal delay={i * 90}>
      <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-aqua/50">
        <div className="member-avatar relative h-16 w-16">
          <svg viewBox="0 0 64 64" className="h-16 w-16" role="img" aria-label={`${m.name} — ${m.role}`}>
            <defs>
              <clipPath id={`member-clip-${i}`}>
                <circle cx="32" cy="32" r="30" />
              </clipPath>
            </defs>
            <circle cx="32" cy="32" r="30" fill="#0d2835" stroke="#25D8D1" strokeOpacity="0.55" strokeWidth="2" />
            <g clipPath={`url(#member-clip-${i})`}>
              <g className="avatar-wave">
                <path d="M-4 42 Q 4 36 12 42 T 28 42 T 44 42 T 60 42 T 76 42 V 76 H -4 Z" fill="#25D8D1" opacity="0.85" />
                <rect x="-4" y="42" width="72" height="34" fill="#25D8D1" opacity="0.5" />
              </g>
            </g>
            <MemberGlyph kind={m.glyph} />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-[17px] font-extrabold leading-snug">{m.name}</h3>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-aqua">{m.role}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">{m.focus}</p>
      </div>
    </Reveal>
  );
}

/**
 * Team stage: the SevaForge mark on deep water — rotating halo, orbiting
 * droplets, sonar ripples and a shine sweep masked to the artwork — above
 * the four-member roster. The mark is the real team logo; motion is ambient
 * CSS and settles statically under reduced motion.
 */
function TeamSection() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#0d2835_0%,#061a24_46%,#0a212e_100%)]">
      {/* bubbles rising through the stage */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[{ l: "8%", s: 9, d: 12, w: -3, x: 16, o: 0.4, h: -420 }, { l: "22%", s: 6, d: 10, w: -7, x: -12, o: 0.3, h: -360 }, { l: "48%", s: 12, d: 13.5, w: -5, x: 20, o: 0.45, h: -440 }, { l: "72%", s: 7, d: 10.5, w: -2, x: -18, o: 0.32, h: -350 }, { l: "88%", s: 11, d: 12.5, w: -6, x: 22, o: 0.42, h: -430 }].map(
          (b, i) => (
            <span
              key={i}
              className="water-bubble"
              style={
                {
                  left: b.l,
                  width: b.s,
                  height: b.s,
                  "--rise-d": `${b.d}s`,
                  "--rise-x": `${b.x}px`,
                  "--rise-h": `${b.h}px`,
                  "--rise-o": b.o,
                  animationDelay: `${b.w}s`,
                } as React.CSSProperties
              }
            />
          ),
        )}
        <div className="absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-aqua/10 blur-[110px]" />
        <div className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-water/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-12">
        <Reveal className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-aqua">The team behind the ledger</p>
        </Reveal>

        {/* --- logo stage --- */}
        <Reveal className="mt-6">
          <div className="relative mx-auto h-[330px] w-[330px] sm:h-[360px] sm:w-[360px]">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="brand-glow absolute inset-0 m-auto h-[280px] w-[280px] rounded-full" />
              <span className="ripple-ring left-1/2 top-1/2 opacity-60" style={{ "--ring-w": "284px", "--ring-d": "4.8s" } as React.CSSProperties} />
              <span className="ripple-ring left-1/2 top-1/2 opacity-60" style={{ "--ring-w": "284px", "--ring-d": "4.8s", animationDelay: "1.6s" } as React.CSSProperties} />
              <span className="ripple-ring left-1/2 top-1/2 opacity-60" style={{ "--ring-w": "284px", "--ring-d": "4.8s", animationDelay: "3.2s" } as React.CSSProperties} />
              <div className="brand-halo absolute inset-0 m-auto h-[238px] w-[238px] rounded-full" />
              <div className="brand-orbit absolute inset-0 m-auto h-[290px] w-[290px]">
                {[-30, 90, 210].map((a) => (
                  <span
                    key={a}
                    className="absolute left-1/2 top-1/2 -ml-[7px] -mt-[8px]"
                    style={{ transform: `rotate(${a}deg) translateX(145px) rotate(${-a}deg)` }}
                  >
                    <span className="block brand-orbit-rev">
                      <OrbitDroplet />
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div className="brand-float absolute inset-0 m-auto flex h-[188px] w-[188px] items-center justify-center sm:h-[204px] sm:w-[204px]">
              <Image
                src="/brand/sevaforge-mark.png"
                alt="SevaForge team logo"
                width={654}
                height={768}
                unoptimized
                className="h-full w-full object-contain drop-shadow-[0_12px_44px_rgba(37,216,209,0.4)]"
              />
              <div aria-hidden className="brand-shine pointer-events-none absolute inset-0" />
            </div>
          </div>
        </Reveal>

        <Reveal className="text-center">
          <h2 className="text-water-gradient font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
            SevaForge
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60">
            Four builders, one promise: <span className="font-bold text-white/85">know what came in, what was measured,
            and what needs checking.</span> Forged for the Seva First Innovation Challenge — Maharashtra Zone, sector
            Sustainability — Energy, Climate and Others.
          </p>
        </Reveal>

        {/* --- roster --- */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBERS.map((m, i) => (
            <MemberCard key={m.name} m={m} i={i} />
          ))}
        </div>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="rounded-2xl bg-aqua px-6 py-3.5 font-display text-[15px] font-extrabold text-ink shadow-[0_8px_30px_rgba(37,216,209,0.35)] transition-transform duration-150 hover:scale-[1.03]"
          >
            Try the live demo
          </Link>
          <a
            href="https://github.com/Avani376/jallekha"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/25 px-6 py-3.5 font-display text-[15px] font-bold text-white/90 transition hover:border-aqua hover:text-aqua"
          >
            Explore the repository
          </a>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[13px] text-white/40">
          <p>JalLekha — water delivery & consumption reconciliation. Prototype; synthetic data; no water savings claimed.</p>
          <p>Seva First Innovation Challenge 2026 · Maharashtra Zone</p>
        </div>
      </div>

      {/* closing water surface */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg className="block h-[70px] w-full opacity-40" viewBox="0 0 1440 70" preserveAspectRatio="none">
          <path d="M0 34 Q 180 14 360 32 T 720 30 T 1080 34 T 1440 24 V 70 H 0 Z" fill="#25D8D1" opacity="0.3" className="animate-swell" />
          <path d="M0 46 Q 240 30 480 46 T 960 44 T 1440 40 V 70 H 0 Z" fill="#3188FF" opacity="0.4" className="animate-swell-slow" />
        </svg>
      </div>
    </section>
  );
}

/* ----------------------------- Scroll reveal ----------------------------- */

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("revealed");
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className ?? ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

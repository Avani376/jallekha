"use client";

/**
 * JalLekha landing: cinematic deep-ink hero with an animated cutaway tank,
 * receipt-to-ledger choreography, the interactive duplicate vs
 * missing-reading comparison, workflow, honest status, team and CTAs.
 * Text and CTAs render immediately (no splash wait); scroll reveals are
 * small staggers; prefers-reduced-motion is honored via the global control.
 */

import Link from "next/link";
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
      <TeamFooter />
      <MascotAssistant onDark />
    </div>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* ambient background washes */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-water/20 blur-[100px]" />
        <div className="absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-aqua/15 blur-[100px]" />
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.16]" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0 60 Q 180 20 360 60 T 720 60 T 1080 60 T 1440 60 V 120 H 0 Z" fill="#25D8D1" className="animate-wave-drift" />
          <path d="M0 80 Q 240 40 480 80 T 960 80 T 1440 80 V 120 H 0 Z" fill="#3188FF" className="animate-wave-drift-slow" />
        </svg>
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

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
        <div className="animate-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-aqua/40 bg-aqua/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-aqua">
            Prototype using synthetic demonstration data
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Every delivery. Every reading.
            <span className="block text-aqua">
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
 * path draws, and the equation resolves into an evidence panel. Pure
 * SVG/CSS ambient loop; disabled under reduced motion via .reduce-motion.
 */
function HeroScene() {
  return (
    <div className="animate-fade-in relative mx-auto w-full max-w-md" aria-hidden>
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
            <TankCutaway fillFraction={0.62} capacityLabel="20,000 L" valueLabel="11,000 L" height={168} />
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

function Workflow() {
  return (
    <section className="reveal-section relative border-t border-white/10 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[11px] font-bold uppercase tracking-widest text-aqua">From records to documented resolution</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">One workflow, visible end to end.</h2>
        </Reveal>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <li>38 automated domain tests covering the four signature scenarios and edge cases</li>
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

/* ------------------------------ Team/footer ------------------------------ */

function TeamFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-aqua">Team SevaForge</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                Know what came in, what was measured, and what needs checking.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] text-white/60">
                Built by Arya Jannawar (team lead), Siddhant Santosh Pardeshi and Avni for the Seva First Innovation
                Challenge — Maharashtra Zone. Sector: Sustainability — Energy, Climate and Others.
              </p>
            </div>
            <Link
              href="/demo"
              className="rounded-2xl bg-aqua px-6 py-3.5 font-display text-[15px] font-extrabold text-ink shadow-[0_8px_30px_rgba(37,216,209,0.35)] transition-transform duration-150 hover:scale-[1.03]"
            >
              Try the live demo
            </Link>
          </div>
        </Reveal>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[13px] text-white/40">
          <p>JalLekha — water delivery & consumption reconciliation. Prototype; synthetic data; no water savings claimed.</p>
          <p>Seva First Innovation Challenge 2026 · Maharashtra Zone</p>
        </div>
      </div>
    </footer>
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

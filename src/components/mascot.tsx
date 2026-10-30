"use client";

/**
 * Bundu — the JalLekha droplet mascot (boond = drop).
 * A small SVG character with moods (idle / happy / think / alert / wave /
 * sad) that reacts to user interactions and offers the next best action.
 * All motion is CSS; the global reduce-motion control stills everything.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace, activeRunFor, periodFor } from "@/data/store";
import { IconArrowRight } from "./icons";
import { openAskPanel } from "./ai/ask-store";
import { cx } from "./ui";

/* ---------------------------- reaction bus ------------------------------- */

export type MascotMood = "idle" | "happy" | "think" | "alert" | "wave" | "sad";

type Listener = (mood: MascotMood, ms: number) => void;
const listeners = new Set<Listener>();

/** Ask Bundu to react app-wide (e.g. after a successful action). */
export function mascotReact(mood: MascotMood, ms = 2600): void {
  for (const l of listeners) l(mood, ms);
}

export function useMascotReaction(): MascotMood {
  const [mood, setMood] = useState<MascotMood>("idle");
  useEffect(() => {
    const l: Listener = (m, ms) => {
      setMood(m);
      const t = setTimeout(() => setMood("idle"), ms);
      return () => clearTimeout(t);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return mood;
}

/* ------------------------------- artwork --------------------------------- */

export function BunduFace({ mood, size = 120 }: { mood: MascotMood; size?: number }) {
  return (
    <svg viewBox="0 0 120 132" width={size} height={(size * 132) / 120} aria-hidden className="bundu-svg">
      <defs>
        <linearGradient id="bundu-body" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#5FE3DD" />
          <stop offset="0.55" stopColor="#25D8D1" />
          <stop offset="1" stopColor="#3188FF" />
        </linearGradient>
        <linearGradient id="bundu-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* shadow puddle */}
      <ellipse className="bundu-shadow" cx="60" cy="124" rx="30" ry="6" fill="#061A24" opacity="0.14" />

      {/* body */}
      <path
        className="bundu-body"
        d="M60 6C60 6 18 52 18 82a42 42 0 0 0 84 0C102 52 60 6 60 6Z"
        fill="url(#bundu-body)"
      />
      {/* belly highlight */}
      <ellipse cx="47" cy="38" rx="14" ry="20" fill="url(#bundu-shine)" transform="rotate(-18 47 38)" />

      {/* arms — wave when greeting */}
      <path className="bundu-arm arm-l" d="M22 78c-8 2-13 8-14 15" stroke="#25D8D1" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path className="bundu-arm arm-r" d="M98 78c8 2 13 8 14 15" stroke="#25D8D1" strokeWidth="7" strokeLinecap="round" fill="none" />

      {/* eyes */}
      <g className={cx("bundu-eyes", mood === "think" && "eyes-up")}>
        <g className="bundu-eye">
          <circle cx="45" cy="72" r="9.5" fill="#fff" />
          <circle className="bundu-pupil" cx="46.5" cy="73" r="4.6" fill="#061A24" />
          <circle cx="44.6" cy="70.6" r="1.5" fill="#fff" />
        </g>
        <g className="bundu-eye">
          <circle cx="75" cy="72" r="9.5" fill="#fff" />
          <circle className="bundu-pupil" cx="76.5" cy="73" r="4.6" fill="#061A24" />
          <circle cx="74.6" cy="70.6" r="1.5" fill="#fff" />
        </g>
      </g>

      {/* brows for alert/sad */}
      {mood === "alert" ? (
        <g stroke="#061A24" strokeWidth="3" strokeLinecap="round">
          <path d="M38 58l12 4" />
          <path d="M82 58l-12 4" />
        </g>
      ) : null}
      {mood === "sad" ? (
        <g stroke="#061A24" strokeWidth="3" strokeLinecap="round">
          <path d="M38 62l12 -3" />
          <path d="M82 62l-12 -3" />
        </g>
      ) : null}

      {/* blush */}
      <ellipse cx="34" cy="86" rx="6" ry="3.6" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="86" cy="86" rx="6" ry="3.6" fill="#FF8FA3" opacity="0.55" />

      {/* mouth by mood */}
      {mood === "happy" ? (
        <path d="M50 88q10 12 20 0q-10 6 -20 0Z" fill="#061A24" />
      ) : mood === "think" ? (
        <circle cx="60" cy="92" r="4" fill="#061A24" />
      ) : mood === "sad" ? (
        <path d="M52 96q8 -7 16 0" stroke="#061A24" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      ) : mood === "alert" ? (
        <ellipse cx="60" cy="92" rx="5.5" ry="6.5" fill="#061A24" />
      ) : (
        <path d="M51 89q9 8 18 0" stroke="#061A24" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      )}

      {/* sparkles when happy */}
      {mood === "happy" ? (
        <g className="bundu-sparkles" fill="#FFD166">
          <path d="M14 30l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z" />
          <path d="M104 24l2.4 4.8 4.8 2.4-4.8 2.4-2.4 4.8-2.4-4.8-4.8-2.4 4.8-2.4Z" />
          <path d="M108 62l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" opacity="0.8" />
        </g>
      ) : null}
      {/* thinking bubbles */}
      {mood === "think" ? (
        <g className="bundu-think" fill="#fff" stroke="#25D8D1" strokeWidth="1.6">
          <circle cx="103" cy="34" r="4" />
          <circle cx="111" cy="24" r="6" />
          <circle cx="102" cy="14" r="3" />
        </g>
      ) : null}
      {/* droplet sweat when alert */}
      {mood === "alert" ? (
        <path className="bundu-sweat" d="M104 44c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10Z" fill="#3188FF" opacity="0.85" />
      ) : null}
    </svg>
  );
}

/* ------------------------------ tip engine -------------------------------- */

interface Tip {
  id: string;
  mood: MascotMood;
  text: string;
  href?: string;
  cta?: string;
}

function useCurrentTip(): Tip | null {
  const { state, mode, selectedSiteId } = useWorkspace();
  const pathname = usePathname();

  return useMemo(() => {
    if (pathname === "/workspace/dashboard") {
      return { id: "dash", mood: "idle", text: "This is your whole engine at a glance — every chart below is drawn from real saved records.", href: "/workspace/reconciliation", cta: "See the exact math" };
    }
    if (mode === "real") {
      if (state.sites.length === 0) {
        return { id: "onboard", mood: "wave", text: "Welcome! I'm Bundu. Create your site, tank and meter below — then I'll help you import your real records.", cta: undefined };
      }
      const site = state.sites.find((s) => s.id === selectedSiteId) ?? state.sites[0];
      if (site) {
        const count = state.deliveries.filter((d) => d.siteId === site.id).length +
          state.tankReadings.filter((r) => r.siteId === site.id).length;
        if (count === 0) {
          return { id: "import", mood: "think", text: "Empty and ready. Import your deliveries CSV from the Deliveries screen — ambiguous dates and duplicates get caught before anything is saved.", href: "/workspace/ledger", cta: "Go to Deliveries" };
        }
        const p = periodFor(state, site.id);
        return { id: "period", mood: "idle", text: `Tracking ${site.name}. Your balance runs ${p.start.slice(0, 10)} → ${p.end.slice(0, 10)} — change the period anytime from the strip above.`, href: "/workspace/dashboard", cta: "Open dashboard" };
      }
    }
    if (mode === "demo" && !pathname.startsWith("/workspace")) {
      return { id: "welcome", mood: "wave", text: "Hi, I'm Bundu! Take the three-minute guided tour — I'll show you why a duplicate receipt and a missing reading need different actions.", href: "/demo", cta: "Start the tour" };
    }
    const site = state.sites.find((s) => s.id === selectedSiteId);
    if (site) {
      const run = activeRunFor(state, site.id);
      const open = state.investigations.filter((i) => i.siteId === site.id && i.status !== "resolved");
      if (run?.status === "discrepancy") {
        return { id: "disc", mood: "alert", text: "Heads up — the residual is outside the stated uncertainty. That's not proof of anything; open the case and verify step by step with me.", href: "/workspace/investigations", cta: "Open the case" };
      }
      if (open.length > 0) {
        return { id: "case", mood: "think", text: `${open.length} verification case${open.length > 1 ? "s" : ""} waiting — each one needs evidence and a reviewer before it closes.`, href: "/workspace/investigations", cta: "Review cases" };
      }
      if (run?.status === "within-uncertainty") {
        return { id: "ok", mood: "happy", text: "Everything balances inside the stated uncertainty here. Want to see the provenance of every litre? The reconciliation screen has it.", href: "/workspace/reconciliation", cta: "Show me" };
      }
      if (run?.status === "incomplete") {
        return { id: "missing", mood: "alert", text: "A reading is missing, so no balance is asserted — that's deliberate. The case tells you exactly what to measure next.", href: "/workspace/investigations", cta: "Take me there" };
      }
    }
    return { id: "default", mood: "idle", text: "Ask me anything about this workspace — or tap a suggestion and I'll take you there.", href: "/workspace/dashboard", cta: "Open dashboard" };
  }, [state, mode, selectedSiteId, pathname]);
}

/* --------------------------- assistant widget ----------------------------- */

export function MascotAssistant({ onDark = false }: { onDark?: boolean }) {
  const mood = useMascotReaction();
  const tip = useCurrentTip();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [seenTips, setSeenTips] = useState<string[]>([]);
  const lastClick = useRef(0);
  const pathname = usePathname();

  // react to every click, throttled
  useEffect(() => {
    const onClick = () => {
      const now = Date.now();
      if (now - lastClick.current < 1200) return;
      lastClick.current = now;
      setPulse(true);
      setTimeout(() => setPulse(false), 620);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const fresh = tip ? !seenTips.includes(tip.id) : false;
  const showBubble = open || (fresh && tip !== null);

  const dismiss = useCallback(() => {
    if (tip) setSeenTips((s) => [...s, tip.id]);
    setOpen(false);
  }, [tip]);

  const moodNow: MascotMood = open ? "happy" : pulse ? "happy" : tip?.mood ?? mood;

  return (
    <div className="no-print pointer-events-none fixed bottom-4 left-4 z-40 flex items-end gap-2">
      {/* speech bubble */}
      {showBubble && tip ? (
        <div
          className={cx(
            "pointer-events-auto max-w-[300px] origin-bottom-left animate-bubble rounded-2xl border p-3.5 shadow-pop",
            onDark ? "border-white/15 bg-ink-soft/95 text-white" : "border-slate-200 bg-white text-ink",
          )}
        >
          <div className="flex items-start gap-2.5">
            <div className={cx("shrink-0", moodNow === "wave" && "animate-wave-arm")}>
              <BunduFace mood={moodNow} size={44} />
            </div>
            <div className="min-w-0">
              <p className={cx("text-[12.5px] font-bold", onDark ? "text-aqua" : "text-aqua-deep")}>Bundu</p>
              <p className={cx("mt-0.5 text-[12.5px] leading-snug", onDark ? "text-white/80" : "text-slate-600")}>{tip.text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { dismiss(); openAskPanel(); }}
                  className={cx(
                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-bold",
                    onDark ? "border border-aqua/60 text-aqua" : "border border-water/50 text-water-deep hover:bg-[#e8f1ff]",
                  )}
                >
                  Ask AI
                </button>
                {tip.href && tip.cta ? (
                  <Link
                    href={tip.href}
                    onClick={dismiss}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] font-bold",
                      onDark ? "bg-aqua text-ink" : "bg-water text-white hover:bg-water-deep",
                    )}
                  >
                    {tip.cta} <IconArrowRight />
                  </Link>
                ) : null}
                <button
                  onClick={dismiss}
                  className={cx("text-[11px] font-bold", onDark ? "text-white/50 hover:text-white" : "text-slate-400 hover:text-slate-600")}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* the mascot button */}
      <button
        type="button"
        aria-label={open ? "Hide Bundu the assistant" : "Show Bundu the assistant"}
        onClick={() => { setOpen(!open); setPulse(true); setTimeout(() => setPulse(false), 620); }}
        className="pointer-events-auto relative rounded-full"
        title="Bundu — your workspace guide"
      >
        <span className={cx("block", pulse ? "animate-bundu-pop" : "animate-bundu-bob")}>
          <span
            className={cx(
              "block overflow-hidden rounded-full border-2 shadow-pop transition-transform duration-150",
              onDark ? "border-white/25 bg-ink-soft" : "border-white bg-white",
              open ? "" : "hover:scale-110",
            )}
          >
            <BunduFace mood={open ? "happy" : moodNow} size={open ? 66 : 58} />
          </span>
        </span>
        {fresh && !open ? (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[9px] font-extrabold text-[#3d2a00]">!</span>
          </span>
        ) : null}
      </button>
      {void pathname}
    </div>
  );
}

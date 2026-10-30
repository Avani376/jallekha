"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useWorkspace } from "@/data/store";
import { IconDroplet } from "@/components/icons";
import { MotionToggle } from "@/components/motion-preference";
import { cx } from "@/components/ui";
import { formatLiters } from "@/domain/units";
import { istDate } from "@/lib/datetime";
import { DEMO_PERIOD } from "@/data/seed";

const NAV_GROUPS: { label: string | null; items: { href: string; label: string }[] }[] = [
  { label: null, items: [{ href: "/workspace", label: "Overview" }] },
  {
    label: "Records",
    items: [
      { href: "/workspace/ledger", label: "Deliveries" },
      { href: "/workspace/readings", label: "Readings" },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/workspace/reconciliation", label: "Reconciliation" },
      { href: "/workspace/investigations", label: "Cases" },
    ],
  },
  { label: null, items: [{ href: "/workspace/reports", label: "Reports" }] },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-screen bg-offwhite" aria-busy="true">
      <div className="h-[104px] border-b border-slate-200 bg-white" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-64 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]" />
      </main>
    </div>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { state, selectedSiteId, setSelectedSiteId, actions } = useWorkspace();
  const pathname = usePathname();
  const site = state.sites.find((s) => s.id === selectedSiteId);
  const tank = state.tanks.find((t) => t.siteId === selectedSiteId);
  const openCases = state.investigations.filter((i) => i.siteId === selectedSiteId && i.status !== "resolved").length;

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
            <IconDroplet />
            JalLekha
          </Link>
          <select
            aria-label="Select demo site"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="max-w-[17rem] truncate rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink"
          >
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden rounded-full bg-verd-soft px-2.5 py-1 text-[11px] font-bold text-verd md:inline-block"
              title="Synthetic demonstration data stored per-visitor in this browser (localStorage). Not a shared server or a pilot system."
            >
              Demo data · this browser only
            </span>
            <MotionToggle />
            <button
              onClick={actions.resetDemo}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-ink"
            >
              Reset demo
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl overflow-x-auto px-4">
          <nav aria-label="Workspace sections" className="flex items-center gap-1 pb-1.5 text-sm">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center gap-1">
                {gi > 0 ? <div aria-hidden className="mx-2 h-4 w-px bg-slate-200" /> : null}
                {group.label ? (
                  <span className="mr-1 hidden select-none text-[10px] font-extrabold uppercase tracking-widest text-slate-300 lg:inline">
                    {group.label}
                  </span>
                ) : null}
                {group.items.map((n) => {
                  const active = n.href === "/workspace" ? pathname === n.href : pathname.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "inline-block whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-colors",
                        active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                      )}
                    >
                      {n.label}
                      {n.label === "Cases" && openCases > 0 ? (
                        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-extrabold text-[#3d2a00]">
                          {openCases}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Context strip: the scope every number on the page refers to */}
        {site && tank ? (
          <div className="border-t border-slate-100 bg-offwhite/80">
            <div className="tabular mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 text-[11.5px] font-semibold text-slate-500">
              <span className="text-ink">{site.name}</span>
              <span>Tank {tank.name} · {formatLiters(tank.capacityLiters)} L</span>
              <span>Period {istDate(DEMO_PERIOD.start)} → {istDate(DEMO_PERIOD.end)} IST</span>
              <span className="hidden md:inline">recon-v1.0 · boundary tolerance 0</span>
            </div>
          </div>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-14 pt-2 text-[11.5px] leading-relaxed text-slate-400">
        JalLekha prototype · Team SevaForge · Seva First Innovation Challenge (Maharashtra Zone). All data is
        synthetic; a discrepancy is not proof of theft or leakage.
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useWorkspace } from "@/data/store";
import { cx } from "@/components/ui";
import { formatLiters } from "@/domain/units";

const NAV = [
  { href: "/workspace", label: "Overview" },
  { href: "/workspace/ledger", label: "Delivery ledger" },
  { href: "/workspace/readings", label: "Readings" },
  { href: "/workspace/reconciliation", label: "Reconciliation" },
  { href: "/workspace/investigations", label: "Cases" },
  { href: "/workspace/reports", label: "Reports" },
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
      <div className="h-[92px] border-b border-slate-200 bg-white" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-64 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]" />
      </main>
    </div>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { state, ready, selectedSiteId, setSelectedSiteId, actions, mode } = useWorkspace();
  const pathname = usePathname();
  const site = state.sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
            <TankDrop />
            JalLekha
          </Link>
          <span className="hidden text-xs font-semibold text-slate-400 sm:inline">|</span>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="hidden md:inline">Site</span>
            <select
              aria-label="Select demo site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="max-w-[16rem] truncate rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink"
            >
              {state.sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-water/30 bg-[#e8f1ff] px-2.5 py-1 text-[11px] font-bold text-water-deep md:inline">
              SYNTHETIC DEMO · stored in this browser only ({mode === "local-demo" ? "not a shared server" : "in-memory"})
            </span>
            <button
              onClick={actions.resetDemo}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-ink"
            >
              Reset demo
            </button>
          </div>
        </div>
        <nav aria-label="Workspace sections" className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-1.5 text-sm">
            {NAV.map((n) => {
              const active = n.href === "/workspace" ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "inline-block whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-colors",
                      active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                    )}
                  >
                    {n.label}
                    {n.label === "Cases" && ready ? (
                      <CaseCountBadge siteId={selectedSiteId} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        {ready ? (
          children
        ) : (
          <div className="space-y-4" aria-busy="true" aria-label="Loading workspace">
            <div className="h-24 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]" />
            <div className="h-64 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]" />
          </div>
        )}
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-16 pt-2 text-xs text-slate-400">
        {site ? (
          <p>
            {site.name} · {site.description} · Period 28 Oct 08:00 → 29 Oct 08:00 IST (demo period) · Tank{" "}
            {state.tanks.find((t) => t.siteId === site.id)?.name} capacity{" "}
            {formatLiters(state.tanks.find((t) => t.siteId === site.id)?.capacityLiters ?? 0)} L
          </p>
        ) : null}
        <p className="mt-1">
          JalLekha prototype by Team SevaForge for the Seva First Innovation Challenge (Maharashtra Zone). All data on
          this page is synthetic. A discrepancy is not proof of theft or leakage.
        </p>
      </footer>
    </div>
  );
}

function CaseCountBadge({ siteId }: { siteId: string }) {
  const { state } = useWorkspace();
  const open = state.investigations.filter((i) => i.siteId === siteId && i.status !== "resolved").length;
  if (open === 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-extrabold text-[#3d2a00]">
      {open}
    </span>
  );
}

function TankDrop() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-aqua">
      <path
        d="M12 2.4C12 2.4 5.4 10 5.4 14.6a6.6 6.6 0 0 0 13.2 0C18.6 10 12 2.4 12 2.4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M8.5 14.8a3.5 3.5 0 0 0 7 0" stroke="#061A24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

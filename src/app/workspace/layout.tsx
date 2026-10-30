"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useWorkspace } from "@/data/store";
import { IconDroplet, IconInfo } from "@/components/icons";
import { MotionToggle } from "@/components/motion-preference";
import { SettingsModal } from "@/components/settings-modal";
import { RealOnboarding } from "@/components/real-onboarding";
import { Button, Modal, cx } from "@/components/ui";
import { formatLiters } from "@/domain/units";
import { istDate } from "@/lib/datetime";

const NAV_GROUPS: { label: string | null; items: { href: string; label: string }[] }[] = [
  { label: null, items: [
    { href: "/workspace/dashboard", label: "Dashboard" },
    { href: "/workspace", label: "Overview" },
  ] },
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
      <div className="h-[126px] border-b border-slate-200 bg-white" />
      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-64 animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]" />
      </main>
    </div>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { state, mode, setDataMode, selectedSiteId, setSelectedSiteId } = useWorkspace();
  const pathname = usePathname();
  const site = state.sites.find((s) => s.id === selectedSiteId);
  const tank = state.tanks.find((t) => t.siteId === selectedSiteId);
  const openCases = state.investigations.filter((i) => i.siteId === selectedSiteId && i.status !== "resolved").length;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeDialog, setModeDialog] = useState<null | "demo" | "real">(null);
  const needsOnboarding = mode === "real" && state.sites.length === 0;

  const requestMode = (m: "demo" | "real") => {
    if (m === mode) return;
    setModeDialog(m);
  };

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
            <IconDroplet />
            JalLekha
          </Link>

          {site ? (
            <select
              aria-label="Select site"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="max-w-[15rem] truncate rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink"
            >
              {state.sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <div role="radiogroup" aria-label="Workspace data mode" className="flex overflow-hidden rounded-lg border border-slate-300 text-[11.5px] font-bold">
              <button
                role="radio"
                aria-checked={mode === "demo"}
                onClick={() => requestMode("demo")}
                className={cx("px-2.5 py-1.5 transition-colors", mode === "demo" ? "bg-ink text-white" : "bg-white text-slate-500 hover:text-ink")}
              >
                Demo data
              </button>
              <button
                role="radio"
                aria-checked={mode === "real"}
                onClick={() => requestMode("real")}
                className={cx("px-2.5 py-1.5 transition-colors", mode === "real" ? "bg-ink text-white" : "bg-white text-slate-500 hover:text-ink")}
              >
                My data
              </button>
            </div>
            {mode === "demo" ? (
              <span
                className="hidden rounded-full bg-verd-soft px-2.5 py-1 text-[11px] font-bold text-verd xl:inline-block"
                title="Synthetic demonstration data stored per-visitor in this browser (localStorage). Not a shared server or a pilot system."
              >
                Demo data · this browser only
              </span>
            ) : (
              <span
                className="hidden rounded-full bg-amber-soft px-2.5 py-1 text-[11px] font-bold text-amber-deep xl:inline-block"
                title="Your real records, stored per-browser (localStorage). Use Reports to export or import a workspace JSON backup."
              >
                My records · this browser
              </span>
            )}
            <MotionToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-ink"
            >
              Settings
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
                  const active = n.href === "/workspace" ? pathname === "/workspace" : pathname.startsWith(n.href);
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

        {site && tank ? (
          <div className="border-t border-slate-100 bg-offwhite/80">
            <div className="tabular mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 text-[11.5px] font-semibold text-slate-500">
              <span className="text-ink">{site.name}</span>
              <span>Tank {tank.name} · {formatLiters(tank.capacityLiters)} L</span>
              <PeriodEditor siteId={site.id} />
            </div>
          </div>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-6">
        {needsOnboarding ? <RealOnboarding /> : children}
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-14 pt-2 text-[11.5px] leading-relaxed text-slate-400">
        {mode === "demo"
          ? "JalLekha prototype · synthetic demo data · Team SevaForge · Seva First Innovation Challenge (Maharashtra Zone). A discrepancy is not proof of theft or leakage."
          : "JalLekha · your records, stored in this browser · Team SevaForge. A discrepancy is not proof of theft or leakage."}
      </footer>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ModeDialog
        target={modeDialog}
        onClose={() => setModeDialog(null)}
        onConfirm={(m) => {
          setDataMode(m);
          setModeDialog(null);
        }}
      />
    </div>
  );
}

/** Confirms a mode switch (each mode keeps its own isolated workspace). */
function ModeDialog({ target, onClose, onConfirm }: { target: null | "demo" | "real"; onClose: () => void; onConfirm: (m: "demo" | "real") => void }) {
  return (
    <Modal open={target !== null} onClose={onClose} title={target === "real" ? "Switch to your data" : "Switch to demo data"}>
      {target === "real" ? (
        <div className="space-y-3 text-[13.5px] leading-relaxed text-slate-600">
          <p>
            <strong className="text-ink">My data</strong> is a separate workspace for your real records: your site,
            tank, meter, deliveries and readings. It starts empty and stays in this browser until you export it.
          </p>
          <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3.5 py-3 text-[13px] text-amber-deep">
            <IconInfo className="mt-0.5 shrink-0" />
            Demo and real workspaces are fully isolated — switching never mixes or deletes data.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onConfirm("real")}>Open my data workspace</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-[13.5px] leading-relaxed text-slate-600">
          <p>
            <strong className="text-ink">Demo data</strong> restores the seeded synthetic sites used by the guided
            demo. Your real records (if any) are untouched and switch back with one click.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => onConfirm("demo")}>Open demo workspace</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Inline period editor (real mode sets its own; demo shows the fixed window). */
function PeriodEditor({ siteId }: { siteId: string }) {
  const { period, actions, mode } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const toLocalInput = (iso: string) => {
    const t = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
    return t.toISOString().slice(0, 16);
  };

  if (!editing || mode !== "real") {
    return (
      <span className="inline-flex items-center gap-2">
        <span>
          Period {istDate(period.start)} → {istDate(period.end)} IST
        </span>
        {mode === "real" ? (
          <button
            onClick={() => { setStart(toLocalInput(period.start)); setEnd(toLocalInput(period.end)); setEditing(true); }}
            className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:text-ink"
          >
            change
          </button>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">demo period</span>
        )}
      </span>
    );
  }

  const apply = () => {
    try {
      if (!start || !end) throw new Error("Both instants are required.");
      const s = new Date(`${start}:00+05:30`);
      const e = new Date(`${end}:00+05:30`);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) throw new Error("Invalid date/time.");
      if (e <= s) throw new Error("Period end must be after the start.");
      actions.setPeriod(siteId, s.toISOString(), e.toISOString(), "operator@local");
      setEditing(false);
      setErr(null);
    } catch (er) {
      setErr((er as Error).message);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1">
        Start <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]" />
      </label>
      <label className="flex items-center gap-1">
        End <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]" />
      </label>
      <button onClick={apply} className="rounded bg-ink px-2 py-0.5 text-[10px] font-bold text-white hover:bg-ink-soft">Apply &amp; recompute</button>
      <button onClick={() => { setEditing(false); setErr(null); }} className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-500">Cancel</button>
      {err ? <span className="font-bold text-danger">{err}</span> : null}
    </span>
  );
}

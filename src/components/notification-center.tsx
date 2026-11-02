"use client";

/**
 * Notification centre: bell with unread count + a drawer listing derived
 * notifications. Read / snooze / dismiss-with-reason state is persisted per
 * browser in the workspace (jallekha notificationStates).
 */

import { useState } from "react";
import { useWorkspace } from "@/data/store";
import { deriveNotifications, unreadCount } from "@/lib/notifications";
import { Button, Input, cx } from "./ui";
import { IconClose } from "./icons";

const SEV_STYLE: Record<string, string> = {
  high: "border-danger/40 bg-danger-soft text-danger",
  warning: "border-amber/40 bg-amber-soft text-amber-deep",
  info: "border-water/30 bg-[#e8f1ff] text-water-deep",
};

const SEV_LABEL: Record<string, string> = {
  high: "Overdue / blocking",
  warning: "Needs attention",
  info: "For awareness",
};

export function NotificationCenter() {
  const { state, selectedSiteId, actions } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [dismissFor, setDismissFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const list = deriveNotifications(state, selectedSiteId);
  const unread = unreadCount(state, selectedSiteId);

  const markRead = (id: string) => {
    actions.setNotificationState(id, { readAt: new Date().toISOString() });
  };
  const snooze = (id: string) => {
    actions.setNotificationState(id, { snoozedUntil: new Date(Date.now() + 86_400_000).toISOString() });
  };
  const dismiss = (id: string) => {
    actions.setNotificationState(id, { dismissedAt: new Date().toISOString(), dismissReason: reason.trim() || "no reason given" });
    setDismissFor(null);
    setReason("");
  };

  const visible = list.filter((n) => !n.snoozed);
  const snoozedCount = list.length - visible.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications (${unread} unread)`}
        aria-expanded={open}
        className="relative rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-ink"
      >
        Alerts
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-pop">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <div>
                <p className="text-[13.5px] font-extrabold text-ink">Notifications</p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {unread} unread · {list.length} total{snoozedCount > 0 ? ` · ${snoozedCount} snoozed` : ""}
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink">
                <IconClose />
              </button>
            </div>

            {visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-slate-400">
                Nothing needs attention for this site.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visible.map((n) => (
                  <li key={n.id} className={cx("px-4 py-3", !n.read ? "bg-slate-50/60" : "")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-extrabold", SEV_STYLE[n.severity])}>
                        {SEV_LABEL[n.severity]}
                      </span>
                      {!n.read ? <span className="h-1.5 w-1.5 rounded-full bg-water" aria-label="unread" /> : null}
                      <span className="ml-auto text-[10.5px] font-semibold text-slate-400">{n.linkLabel}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-bold text-ink">{n.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <a href={n.link} onClick={() => markRead(n.id)} className="rounded-lg bg-water px-2.5 py-1 text-[11px] font-bold text-white hover:bg-water-deep">
                        {n.linkLabel}
                      </a>
                      {!n.read ? (
                        <button onClick={() => markRead(n.id)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-ink">
                          Mark read
                        </button>
                      ) : null}
                      <button onClick={() => snooze(n.id)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-ink">
                        Snooze 24h
                      </button>
                      {dismissFor === n.id ? (
                        <span className="flex items-center gap-1.5">
                          <Input
                            aria-label="Dismissal reason"
                            placeholder="Reason"
                            className="w-36 !py-1 text-[11px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <Button size="sm" variant="secondary" disabled={reason.trim().length < 4} onClick={() => dismiss(n.id)}>
                            Confirm
                          </Button>
                        </span>
                      ) : (
                        <button onClick={() => { setDismissFor(n.id); setReason(""); }} className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600">
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

/**
 * Small accessible UI kit (shadcn-style, no external UI dependency):
 * labels on every control, dialog with ESC + focus return, statuses that
 * never rely on color alone (icon + label), tabular numerals for amounts.
 */

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { IconAlert, IconBan, IconCheck, IconClock, IconClose, IconDot, IconInfo } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children, className, as: As = "section", tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  /**
   * "paper" (default) supplies the light-surface border/background.
   * "custom" omits them so a caller-provided background cannot lose a
   * Tailwind CSS-order fight with the base classes (the bug behind the
   * unreadable highlighted demo card — bg-white silently beat bg-aqua/[0.06]).
   */
  tone?: "paper" | "custom";
}) {
  return (
    <As className={cx(
      "rounded-2xl border shadow-card",
      tone === "paper" ? "border-slate-200 bg-white" : "",
      className,
    )}
    >
      {children}
    </As>
  );
}

export function CardHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        {sub ? <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{sub}</p> : null}
      </div>
      {right ? <div className="no-print flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "amber" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }
>(function Button({ variant = "primary", size = "md", className, ...rest }, ref) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-sm" };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-water text-white hover:bg-water-deep shadow-sm",
    secondary: "border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-ink",
    amber: "bg-amber text-[#3d2a00] hover:brightness-95 shadow-sm",
    danger: "bg-danger text-white hover:brightness-110",
  };
  return <button ref={ref} className={cx(base, sizes[size], variants[variant], className)} {...rest} />;
});

export function Field({
  label, htmlFor, hint, error, children, required,
}: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
        {label} {required ? <span className="text-danger" aria-hidden>*</span> : null}
      </label>
      {hint ? <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">{hint}</p> : null}
      {children}
      {error ? (
        <p className="text-xs font-semibold text-danger" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-water",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cx(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-water",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-water",
          className,
        )}
        {...rest}
      />
    );
  },
);

/* ---------- Status pills: icon + label, never color-only ---------- */

export type Tone = "ok" | "review" | "warn" | "info" | "neutral" | "danger";

const TONES: Record<Tone, { cls: string; icon: (p: { className?: string }) => ReactNode }> = {
  ok: { cls: "bg-verd-soft text-verd border-verd/30", icon: IconCheck },
  review: { cls: "bg-amber-soft text-amber-deep border-amber/40", icon: IconClock },
  warn: { cls: "bg-amber-soft text-amber-deep border-amber/40", icon: IconAlert },
  info: { cls: "bg-[#e8f1ff] text-water-deep border-water/30", icon: IconInfo },
  neutral: { cls: "bg-slate-100 text-slate-600 border-slate-300", icon: IconDot },
  danger: { cls: "bg-danger-soft text-danger border-danger/30", icon: IconBan },
};

export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const { cls, icon: Icon } = TONES[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold", cls, className)}>
      <Icon />
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="font-bold text-ink">{title}</p>
      <p className="max-w-md text-[13px] text-slate-500">{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("animate-shimmer rounded-xl bg-[linear-gradient(90deg,#eef2f1_0px,#f7faf9_120px,#eef2f1_240px)] bg-[length:400px_100%]", className)}
    />
  );
}

/* ------------------------------- Modal ---------------------------------- */

export function Modal({
  open, onClose, title, children, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3.5">
          <h2 id={titleId} className="font-bold tracking-tight text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink">
            <IconClose />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

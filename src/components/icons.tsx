/**
 * Minimal inline icon set (16px grid, stroke-based) so status and actions
 * never depend on platform glyph fonts. Icons are decorative; accessible
 * names come from adjacent text.
 */

export function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden className={className}>
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlert({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden className={className}>
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 6.6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.8V8l2.4 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInfo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7.4v3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="5.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className={className}>
      <circle cx="8" cy="8" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function IconBan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 12.2 12.2 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconRefresh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden className={className}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.7 1.8v2.8H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden className={className}>
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden className={className}>
      <path d="M2.5 8h11m0 0L9.5 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden className={className}>
      <path d="M13.5 8h-11m0 0L6.5 4m-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden className={className}>
      <path d="M8 10.5v-8m0 0L4.8 5.7M8 2.5l3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden className={className}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function IconMotion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5c2.5 1.6 8.5 1.6 11-1M3.2 6.4c2.3 1.4 7.3 1.4 9.6-.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconDroplet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden className={className}>
      <defs>
        <linearGradient id="icon-drop-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#25D8D1" />
          <stop offset="1" stopColor="#3188FF" />
        </linearGradient>
      </defs>
      <path d="M12 2.4C12 2.4 5.4 10 5.4 14.6a6.6 6.6 0 0 0 13.2 0C18.6 10 12 2.4 12 2.4Z" fill="url(#icon-drop-g)" />
      <path d="M8.5 14.8a3.5 3.5 0 0 0 7 0" stroke="#061A24" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

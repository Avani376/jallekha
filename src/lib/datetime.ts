/**
 * Site-timezone display helpers. The demo renders Asia/Kolkata (IST);
 * storage stays UTC.
 */

export function istDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Converts a datetime-local input (IST) to a UTC ISO string. */
export function istToUtc(local: string): string {
  if (!local) return new Date(NaN).toISOString();
  const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(local);
  const s = hasZone ? local : `${local}:00+05:30`;
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) throw new Error(`Invalid date/time: ${local}`);
  return t.toISOString();
}

/** ISO instant to a datetime-local input value in IST. */
export function istToLocalInput(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  if (Number.isNaN(t.getTime())) return "";
  return t.toISOString().slice(0, 16);
}

// All week math runs in the browser's local timezone — the client-side
// weekEnding is authoritative (same decision as the v1 review form, which
// exists because the Railway server runs in UTC).

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// The current week ends on the upcoming Sunday (today, if it's Sunday) —
// matches the backend's getNextSunday() row semantics.
export function getWeekEnding(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const d = new Date(today);
  d.setDate(today.getDate() + (day === 0 ? 0 : 7 - day));
  return toLocalDateString(d);
}

// Whole days from today until weekEnding (0 = it's Sunday)
export function daysLeft(weekEnding: string): number {
  const end = new Date(weekEnding + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
}

export function formatWeekEnding(weekEnding: string): string {
  const d = new Date(weekEnding + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function relativeAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

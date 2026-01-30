/**
 * Date utilities – avoid timezone shifts (e.g. "one day less" when parsing YYYY-MM-DD as UTC).
 * Parse and display dates in local time.
 */

/** Parse YYYY-MM-DD as local date and format for display */
export function formatDateLocal(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const part = dateStr.split('T')[0].split('-');
  if (part.length < 3) return dateStr;
  const [y, m, d] = part.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Get today as YYYY-MM-DD in local time (for saving without timezone shift) */
export function todayLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD or ISO string as local Date (no UTC shift) */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const part = dateStr.split('T')[0].split('-');
  if (part.length < 3) return null;
  const [y, m, d] = part.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

/** Normalize stored date (ISO or YYYY-MM-DD) to YYYY-MM-DD in local time for storage/inputs */
export function toLocalYYYYMMDD(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

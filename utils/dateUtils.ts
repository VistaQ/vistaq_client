/**
 * Shared date utilities — single source of truth for timestamp normalisation.
 * Import from here; do not re-implement toISO in individual files.
 */

/**
 * Converts any timestamp value (Firestore _seconds object, ISO string, number, Date)
 * to an ISO 8601 string. Returns undefined if the value is falsy or unparseable.
 */
export const toISO = (ts: unknown): string | undefined => {
  if (!ts) return undefined;

  // Firestore Timestamp object: { _seconds: number, _nanoseconds: number }
  if (typeof ts === 'object' && ts !== null && '_seconds' in ts) {
    const secs = (ts as { _seconds: number })._seconds;
    return new Date(secs * 1000).toISOString();
  }

  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  if (ts instanceof Date) {
    return isNaN(ts.getTime()) ? undefined : ts.toISOString();
  }

  return undefined;
};

/**
 * Formats an ISO string or timestamp for display (e.g. "12 Jan 2025").
 * Returns an empty string if the value is falsy or unparseable.
 */
export const formatDate = (ts: unknown): string => {
  if (!ts) return '';
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

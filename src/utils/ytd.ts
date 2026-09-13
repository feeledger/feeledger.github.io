/**
 * Year-to-date helpers.
 *
 * The YTD start is stored as a recurring 'MM-DD' anchor (not an absolute date)
 * so it rolls forward every year automatically — e.g. '04-01' always means
 * "start of the current financial year" whether it's currently Feb 2027 or
 * Nov 2026 (both resolve to the most recent April 1st that has already passed).
 */

export const DEFAULT_YTD_ANCHOR = '01-01';

/** Validate an 'MM-DD' string. Returns the default if invalid. */
export function normalizeYtdAnchor(anchor: string | undefined): string {
  if (!anchor) return DEFAULT_YTD_ANCHOR;
  const match = /^(\d{2})-(\d{2})$/.exec(anchor);
  if (!match) return DEFAULT_YTD_ANCHOR;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return DEFAULT_YTD_ANCHOR;
  return anchor;
}

/**
 * Resolve the actual YTD start date (YYYY-MM-DD) given a recurring MM-DD anchor.
 * If the anchor for the current year hasn't happened yet, uses last year's occurrence.
 */
export function resolveYtdStartDate(anchor: string | undefined, referenceDate = new Date()): string {
  const normalized = normalizeYtdAnchor(anchor);
  const [month, day] = normalized.split('-').map(Number);

  const year = referenceDate.getFullYear();
  let start = new Date(year, month - 1, day);

  // If this year's anchor is still in the future, roll back to last year's
  if (start.getTime() > referenceDate.getTime()) {
    start = new Date(year - 1, month - 1, day);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

/** Human-readable label for the YTD period, e.g. "Since 1 Apr 2026". */
export function formatYtdLabel(startDateISO: string): string {
  const d = new Date(startDateISO + 'T00:00:00');
  return `Since ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

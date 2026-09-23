import type { Student, Payment } from '../types';

// ── Fee due calculation ──────────────────────────────────────────────────────
//
// Three student fields work together to define what a member owes:
//
//   fee_amount     (currency) — the number the user typed in.
//   fee_type       (boolean)  — off/false (default) = fee_amount is the
//                                TOTAL amount due for the whole
//                                course/engagement.
//                                on/true             = fee_amount is charged
//                                repeatedly, at the cadence set in
//                                fee_frequency.
//   fee_frequency  (select)   — the billing cadence. Only changes the
//                                calculation when fee_type is on.
//
// "Total Due" is what's still outstanding: the amount that should have
// been collected by today, minus everything actually paid so far.

/** Recurring cadences we can turn into a real elapsed-time accrual, in months per cycle. */
const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  halfYearly: 6,
  yearly: 12,
};

export const FEE_FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  halfYearly: 'half-yearly',
  yearly: 'annually',
  oneTime: 'one-time',
  instalment2: 'in 2 instalments',
  instalment3: 'in 3 instalments',
  custom: 'as per agreed schedule',
};

export function getFrequencyLabel(freq: string): string {
  if (!freq) return '';
  return FEE_FREQUENCY_LABELS[freq] ?? freq;
}

export interface FeeDueSummary {
  /** Sum of all recorded payments for this member. */
  totalPaid: number;
  /** Amount currently outstanding. Never negative. */
  totalDue: number;
  /** Whether fee_amount is a recurring per-cycle amount (fee_type = true). */
  isRecurring: boolean;
  /** The raw fee_amount value as entered. */
  feeAmount: number;
  /** Number of billing cycles considered accrued so far (always 1 for a flat/total fee). */
  cyclesAccrued: number;
  /** fee_frequency value, verbatim. */
  frequency: string;
}

/** admission_date if set and valid, otherwise the record's creation date. */
function resolveAnchorDate(student: Student): Date | null {
  const admission = student.values['admission_date'];
  if (admission) {
    const d = new Date(`${admission}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  const created = new Date(student.createdAt);
  return isNaN(created.getTime()) ? null : created;
}

/** Number of billing cycles that have started as of `reference` (counts the first/current cycle). */
function countElapsedCycles(anchor: Date, reference: Date, cycleMonths: number): number {
  if (anchor.getTime() > reference.getTime()) return 1;
  let months =
    (reference.getFullYear() - anchor.getFullYear()) * 12 +
    (reference.getMonth() - anchor.getMonth());
  if (reference.getDate() < anchor.getDate()) months -= 1;
  if (months < 0) months = 0;
  return Math.floor(months / cycleMonths) + 1;
}

/**
 * Calculates what a member has paid and what's still due, based on
 * fee_amount + fee_type + fee_frequency and their recorded payments.
 *
 * `payments` should already be the (non-archived) payments for this one
 * member — pass `[]` if unknown.
 */
export function calculateFeeDue(
  student: Student,
  payments: Payment[],
  referenceDate: Date = new Date()
): FeeDueSummary {
  const feeAmount = Number(student.values['fee_amount'] ?? 0) || 0;
  const isRecurring = Boolean(student.values['fee_type']);
  const frequency = String(student.values['fee_frequency'] ?? '');
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (feeAmount <= 0) {
    return { totalPaid, totalDue: 0, isRecurring, feeAmount, cyclesAccrued: 0, frequency };
  }

  let cyclesAccrued = 1;

  if (isRecurring) {
    if (frequency === 'instalment2') {
      cyclesAccrued = 2;
    } else if (frequency === 'instalment3') {
      cyclesAccrued = 3;
    } else if (CYCLE_MONTHS[frequency]) {
      const anchor = resolveAnchorDate(student);
      cyclesAccrued = anchor
        ? countElapsedCycles(anchor, referenceDate, CYCLE_MONTHS[frequency])
        : 1;
    }
    // oneTime / custom / unrecognised frequency → no time-based cadence to
    // accrue against, so fall back to a single cycle (cyclesAccrued stays 1).
  }

  const totalAccrued = feeAmount * cyclesAccrued;
  const totalDue = Math.max(0, totalAccrued - totalPaid);

  return { totalPaid, totalDue, isRecurring, feeAmount, cyclesAccrued, frequency };
}

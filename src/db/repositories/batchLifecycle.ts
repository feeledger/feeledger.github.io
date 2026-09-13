/**
 * Batch lifecycle automation.
 *
 * When a batch's end date passes:
 *  1. Every student's ACTIVE membership in that batch is marked 'completed'
 *     (with leftAt = the batch's end date).
 *  2. If, after that, a student has NO other active batch membership,
 *     their student_status field flips to 'inactive'. This mirrors an
 *     archive without actually archiving the record — they remain fully
 *     visible and searchable via the Members list "Inactive" or "All" filter.
 *
 * This runs automatically once per day (checked on app start) since
 * FeeLedger has no backend/cron — the check happens client-side.
 */

import { getDB, now } from '../indexeddb/database';

const LAST_RUN_KEY = 'fl_batch_lifecycle_last_run';

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface LifecycleResult {
  batchesProcessed: number;
  membershipsEnded: number;
  studentsDeactivated: number;
}

/**
 * Checks all active batches with a past end date, ends the relevant
 * memberships, and deactivates students left with no active batch.
 * Idempotent and cheap to call — internally skips if already run today.
 * Pass `force: true` to bypass the once-per-day guard (used for manual re-run).
 */
export async function processExpiredBatchMemberships(force = false): Promise<LifecycleResult> {
  const today = todayISODate();

  if (!force) {
    const lastRun = localStorage.getItem(LAST_RUN_KEY);
    if (lastRun === today) {
      return { batchesProcessed: 0, membershipsEnded: 0, studentsDeactivated: 0 };
    }
  }

  const db = getDB();
  const allBatches = await db.batches.toArray();
  const expiredBatches = allBatches.filter(b =>
    b.status === 'active' && b.endDate && b.endDate < today
  );

  let membershipsEnded = 0;
  let studentsDeactivated = 0;

  if (expiredBatches.length > 0) {
    const expiredBatchIds = new Set(expiredBatches.map(b => b.id));
    const expiredEndDateByBatch = new Map(expiredBatches.map(b => [b.id, b.endDate!]));

    const allStudents = await db.students.filter(s => !s.archivedAt).toArray();

    await db.transaction('rw', db.students, async () => {
      for (const student of allStudents) {
        const relevantMemberships = student.batchMemberships.filter(
          m => m.status === 'active' && expiredBatchIds.has(m.batchId)
        );
        if (relevantMemberships.length === 0) continue;

        const updatedMemberships = student.batchMemberships.map(m => {
          if (m.status === 'active' && expiredBatchIds.has(m.batchId)) {
            membershipsEnded++;
            return { ...m, status: 'completed' as const, leftAt: expiredEndDateByBatch.get(m.batchId) };
          }
          return m;
        });

        const stillHasActiveBatch = updatedMemberships.some(m => m.status === 'active');
        const currentStatus = String(student.values['student_status'] ?? 'active');

        const newValues = { ...student.values };
        if (!stillHasActiveBatch && currentStatus === 'active') {
          newValues['student_status'] = 'inactive';
          studentsDeactivated++;
        }

        await db.students.put({
          ...student,
          batchMemberships: updatedMemberships,
          values: newValues,
          updatedAt: now(),
        });
      }
    });
  }

  localStorage.setItem(LAST_RUN_KEY, today);

  const result: LifecycleResult = {
    batchesProcessed: expiredBatches.length,
    membershipsEnded,
    studentsDeactivated,
  };

  // Let the app know something changed, so open UI refreshes and a Drive
  // sync gets queued (mirrors the fl:drive-restored / fl:onboarding-complete pattern).
  if (membershipsEnded > 0 || studentsDeactivated > 0) {
    window.dispatchEvent(new CustomEvent('fl:batch-lifecycle-processed', { detail: result }));
  }

  return result;
}

/**
 * One-off data migrations that can't be expressed as a Dexie schema version bump
 * (i.e. changes to field *definitions* or *values*, not object store indexes).
 *
 * Each migration must be idempotent — safe to run on every app start.
 */

import { getDB, now } from '../indexeddb/database';

/**
 * fee_type used to be a `select` field with string values 'total' | 'per_frequency'
 * (defaulting to 'per_frequency'). It's now a `boolean` field where unchecked (false)
 * means "Total Fee Due" and checked (true) means "recurring at the set frequency" —
 * with false as the new default.
 *
 * This migration:
 *  1. Converts the stored field DEFINITION from select → boolean, if not already done.
 *  2. Converts every student's stored VALUE: 'total' → false, 'per_frequency' → true.
 *     (A naive `Boolean(value)` would treat both old strings as `true` since they're
 *     non-empty strings — this migration prevents that silent data corruption.)
 */
export async function migrateFeeTypeField(): Promise<void> {
  const db = getDB();

  const field = await db.studentFields.get('fee_type');
  const needsDefinitionMigration = field && field.type !== 'boolean';

  if (needsDefinitionMigration) {
    await db.studentFields.put({
      ...field!,
      label: field!.label === 'Fee Amount Type' ? 'This is a recurring amount' : field!.label,
      type: 'boolean',
      options: undefined,
      defaultValue: false,
      booleanLabels: { on: 'Recurring amount', off: 'Total fee due' },
      updatedAt: now(),
    });
  }

  // Only scan/convert student values if the definition actually needed migrating —
  // this makes the whole function a cheap no-op on every subsequent app start.
  if (!needsDefinitionMigration) return;

  const students = await db.students.toArray();
  const toUpdate = students.filter(s => {
    const v = s.values['fee_type'];
    return v === 'total' || v === 'per_frequency';
  });

  if (toUpdate.length === 0) return;

  await db.transaction('rw', db.students, async () => {
    for (const student of toUpdate) {
      const raw = student.values['fee_type'];
      const converted = raw === 'per_frequency'; // 'total' -> false, 'per_frequency' -> true
      await db.students.put({
        ...student,
        values: { ...student.values, fee_type: converted },
        updatedAt: now(),
      });
    }
  });
}

/** Runs all pending migrations, in order. Safe to call on every app start. */
export async function runMigrations(): Promise<void> {
  await migrateFeeTypeField();
}

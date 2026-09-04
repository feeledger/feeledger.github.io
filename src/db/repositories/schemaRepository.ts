import { getDB, generateId, now, type StoredStudentField, type StoredPaymentField } from '../indexeddb/database';
import { getDefaultStudentFields, getDefaultPaymentFields } from '../indexeddb/defaultFields';
import type { StudentFieldDefinition, PaymentFieldDefinition } from '../../types';

export const schemaRepository = {

  // ── Student fields ──────────────────────────────────────────────────────────

  async getStudentFields(): Promise<StudentFieldDefinition[]> {
    const db = getDB();
    const rows = await db.studentFields.orderBy('order').toArray();
    if (rows.length === 0) {
      // First run — seed defaults
      await this.seedStudentFields();
      return this.getStudentFields();
    }
    return rows.map(({ _store: _, ...f }) => f as StudentFieldDefinition);
  },

  async getEnabledStudentFields(): Promise<StudentFieldDefinition[]> {
    const fields = await this.getStudentFields();
    return fields.filter(f => f.enabled);
  },

  async getListStudentFields(): Promise<StudentFieldDefinition[]> {
    const fields = await this.getStudentFields();
    return fields.filter(f => f.enabled && f.showInList);
  },

  async seedStudentFields(): Promise<void> {
    const db = getDB();
    const defaults = getDefaultStudentFields();
    const rows: StoredStudentField[] = defaults.map(f => ({
      ...f,
      _store: 'studentFields' as const,
    }));
    await db.studentFields.bulkPut(rows);
  },

  async saveStudentField(field: StudentFieldDefinition): Promise<void> {
    const db = getDB();
    await db.studentFields.put({ ...field, _store: 'studentFields' });
  },

  async createCustomStudentField(
    partial: Omit<StudentFieldDefinition, 'id' | 'createdAt' | 'updatedAt' | 'category'>
  ): Promise<StudentFieldDefinition> {
    const ts = now();
    const field: StudentFieldDefinition = {
      ...partial,
      id: generateId('udf'),
      category: 'custom',
      createdAt: ts,
      updatedAt: ts,
    };
    await this.saveStudentField(field);
    return field;
  },

  async updateStudentField(id: string, changes: Partial<StudentFieldDefinition>): Promise<void> {
    const db = getDB();
    const existing = await db.studentFields.get(id);
    if (!existing) throw new Error(`Student field ${id} not found`);
    await db.studentFields.put({
      ...existing,
      ...changes,
      id,          // never change the ID
      updatedAt: now(),
    });
  },

  async reorderStudentFields(orderedIds: string[]): Promise<void> {
    const db = getDB();
    await db.transaction('rw', db.studentFields, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.studentFields.update(orderedIds[i], { order: i, updatedAt: now() });
      }
    });
  },

  // ── Payment fields ──────────────────────────────────────────────────────────

  async getPaymentFields(): Promise<PaymentFieldDefinition[]> {
    const db = getDB();
    const rows = await db.paymentFields.orderBy('order').toArray();
    if (rows.length === 0) {
      await this.seedPaymentFields();
      return this.getPaymentFields();
    }
    return rows.map(({ _store: _, ...f }) => f as PaymentFieldDefinition);
  },

  async seedPaymentFields(): Promise<void> {
    const db = getDB();
    const defaults = getDefaultPaymentFields();
    const rows: StoredPaymentField[] = defaults.map(f => ({
      ...f,
      _store: 'paymentFields' as const,
    }));
    await db.paymentFields.bulkPut(rows);
  },

  async savePaymentField(field: PaymentFieldDefinition): Promise<void> {
    const db = getDB();
    await db.paymentFields.put({ ...field, _store: 'paymentFields' });
  },

  // ── Initialise all schemas on first run ─────────────────────────────────────

  async initialise(): Promise<void> {
    const db = getDB();
    const studentFieldCount = await db.studentFields.count();
    const paymentFieldCount = await db.paymentFields.count();
    if (studentFieldCount === 0) await this.seedStudentFields();
    if (paymentFieldCount === 0) await this.seedPaymentFields();
  },
};

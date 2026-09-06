import { getDB, generateId, now } from '../indexeddb/database';
import type { Student, StudentBatchMembership } from '../../types';

export interface StudentListItem {
  id: string;
  values: Record<string, unknown>;
  activeBatches: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateStudentInput {
  values: Record<string, unknown>;
  batchIds?: string[];
}

export const studentRepository = {

  async create(input: CreateStudentInput): Promise<Student> {
    const db = getDB();
    const ts = now();
    const id = generateId('stu');

    const memberships: StudentBatchMembership[] = (input.batchIds ?? []).map(batchId => ({
      id: generateId('mbr'),
      studentId: id,
      batchId,
      joinedAt: ts,
      status: 'active' as const,
    }));

    const student: Student = {
      id,
      values: input.values,
      batchMemberships: memberships,
      createdAt: ts,
      updatedAt: ts,
    };

    await db.students.add(student);
    return student;
  },

  async getById(id: string): Promise<Student | undefined> {
    return getDB().students.get(id);
  },

  async update(id: string, values: Record<string, unknown>): Promise<void> {
    const db = getDB();
    const existing = await db.students.get(id);
    if (!existing) throw new Error(`Student ${id} not found`);
    await db.students.put({
      ...existing,
      values: { ...existing.values, ...values },
      updatedAt: now(),
    });
  },

  async archive(id: string): Promise<void> {
    const db = getDB();
    await db.students.update(id, { archivedAt: now(), updatedAt: now() });
  },

  async restore(id: string): Promise<void> {
    const db = getDB();
    await db.students.update(id, { archivedAt: undefined, updatedAt: now() });
  },

  async delete(id: string): Promise<void> {
    await getDB().students.delete(id);
  },

  async listActive(): Promise<Student[]> {
    return getDB().students
      .filter(s => !s.archivedAt)
      .sortBy('createdAt')
      .then(arr => arr.reverse());
  },

  async listAll(): Promise<Student[]> {
    return getDB().students.orderBy('createdAt').reverse().toArray();
  },

  async listByBatch(batchId: string): Promise<Student[]> {
    const all = await this.listActive();
    return all.filter(s =>
      s.batchMemberships.some(m => m.batchId === batchId && m.status === 'active')
    );
  },

  /**
   * Search across all searchable text fields.
   * Runs in JS after fetching active students (dataset is small for tuition use).
   */
  async search(query: string, searchableFieldIds: string[]): Promise<Student[]> {
    if (!query.trim()) return this.listActive();
    const q = query.toLowerCase();
    const students = await this.listActive();
    return students.filter(s =>
      searchableFieldIds.some(fieldId => {
        const val = s.values[fieldId];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  },

  async count(): Promise<number> {
    return getDB().students.filter(s => !s.archivedAt).count();
  },

  // ── Batch memberships ───────────────────────────────────────────────────────

  async addToBatch(studentId: string, batchId: string): Promise<void> {
    const db = getDB();
    const student = await db.students.get(studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);

    const alreadyMember = student.batchMemberships.some(
      m => m.batchId === batchId && m.status === 'active'
    );
    if (alreadyMember) return;

    const membership: StudentBatchMembership = {
      id: generateId('mbr'),
      studentId,
      batchId,
      joinedAt: now(),
      status: 'active',
    };

    await db.students.put({
      ...student,
      batchMemberships: [...student.batchMemberships, membership],
      updatedAt: now(),
    });
  },

  async removeFromBatch(studentId: string, batchId: string): Promise<void> {
    const db = getDB();
    const student = await db.students.get(studentId);
    if (!student) return;

    const updatedMemberships = student.batchMemberships.map(m =>
      m.batchId === batchId && m.status === 'active'
        ? { ...m, status: 'completed' as const, leftAt: now() }
        : m
    );

    await db.students.put({
      ...student,
      batchMemberships: updatedMemberships,
      updatedAt: now(),
    });
  },
};

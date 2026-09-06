import { getDB, generateId, now } from '../indexeddb/database';
import type { Batch, Subject, AcademicYear } from '../../types';

// ── Academic Year ─────────────────────────────────────────────────────────────

export const academicYearRepository = {

  async create(name: string, startDate?: string, endDate?: string): Promise<AcademicYear> {
    const db = getDB();
    const ts = now();
    const year: AcademicYear = {
      id: generateId('ay'),
      name,
      startDate,
      endDate,
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    await db.academicYears.add(year);
    return year;
  },

  async listActive(): Promise<AcademicYear[]> {
    return getDB().academicYears
      .where('status').equals('active')
      .sortBy('name');
  },

  async listAll(): Promise<AcademicYear[]> {
    return getDB().academicYears.orderBy('name').toArray();
  },

  async update(id: string, changes: Partial<AcademicYear>): Promise<void> {
    await getDB().academicYears.update(id, { ...changes, updatedAt: now() });
  },

  async archive(id: string): Promise<void> {
    await getDB().academicYears.update(id, { status: 'archived', updatedAt: now() });
  },
};

// ── Subject ───────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECTS = [
  'Physics', 'Chemistry', 'Mathematics', 'Biology',
  'English', 'Computer Science', 'History', 'Geography',
];

export const subjectRepository = {

  async create(name: string): Promise<Subject> {
    const db = getDB();
    const ts = now();
    const subject: Subject = {
      id: generateId('sub'),
      name,
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    await db.subjects.add(subject);
    return subject;
  },

  async listActive(): Promise<Subject[]> {
    return getDB().subjects
      .where('status').equals('active')
      .sortBy('name');
  },

  async listAll(): Promise<Subject[]> {
    return getDB().subjects.orderBy('name').toArray();
  },

  async update(id: string, name: string): Promise<void> {
    await getDB().subjects.update(id, { name, updatedAt: now() });
  },

  async archive(id: string): Promise<void> {
    await getDB().subjects.update(id, { status: 'archived', updatedAt: now() });
  },

  async seedDefaults(): Promise<void> {
    const db = getDB();
    const count = await db.subjects.count();
    if (count > 0) return;
    const ts = now();
    const subjects: Subject[] = DEFAULT_SUBJECTS.map(name => ({
      id: generateId('sub'),
      name,
      status: 'active' as const,
      createdAt: ts,
      updatedAt: ts,
    }));
    await db.subjects.bulkAdd(subjects);
  },
};

// ── Batch ─────────────────────────────────────────────────────────────────────

export const batchRepository = {

  async create(input: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Batch> {
    const db = getDB();
    const ts = now();
    const batch: Batch = {
      ...input,
      id: generateId('bat'),
      createdAt: ts,
      updatedAt: ts,
    };
    await db.batches.add(batch);
    return batch;
  },

  async getById(id: string): Promise<Batch | undefined> {
    return getDB().batches.get(id);
  },

  async listActive(): Promise<Batch[]> {
    return getDB().batches
      .where('status').equals('active')
      .sortBy('name');
  },

  async listByAcademicYear(academicYearId: string): Promise<Batch[]> {
    return getDB().batches
      .where('academicYearId').equals(academicYearId)
      .sortBy('name');
  },

  async listAll(): Promise<Batch[]> {
    return getDB().batches.orderBy('name').toArray();
  },

  async update(id: string, changes: Partial<Batch>): Promise<void> {
    await getDB().batches.update(id, { ...changes, updatedAt: now() });
  },

  async archive(id: string): Promise<void> {
    await getDB().batches.update(id, { status: 'archived', updatedAt: now() });
  },

  async delete(id: string): Promise<void> {
    await getDB().batches.delete(id);
  },
};

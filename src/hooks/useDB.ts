import { useState, useEffect, useCallback } from 'react';
import { studentRepository } from '../db/repositories/studentRepository';
import { paymentRepository } from '../db/repositories/paymentRepository';
import { receiptRepository } from '../db/repositories/receiptRepository';
import { settingsRepository } from '../db/repositories/settingsRepository';
import { schemaRepository } from '../db/repositories/schemaRepository';
import { batchRepository, academicYearRepository, subjectRepository } from '../db/repositories/batchRepository';
import type { Student, Payment, Receipt, AppSettings, StudentFieldDefinition, Batch, Subject, AcademicYear } from '../types';
import { resolveYtdStartDate } from '../utils/ytd';

// ── Generic async data hook ───────────────────────────────────────────────────

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  // Re-fetch when Drive data is restored (cross-device sync)
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('fl:drive-restored', handler);
    window.addEventListener('fl:batch-lifecycle-processed', handler);
    return () => {
      window.removeEventListener('fl:drive-restored', handler);
      window.removeEventListener('fl:batch-lifecycle-processed', handler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(result => { if (!cancelled) { setData(result); setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(String(err)); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch };
}

// ── Students ──────────────────────────────────────────────────────────────────

export function useStudents() {
  return useAsync(() => studentRepository.listActive());
}

export function useStudent(id: string | undefined) {
  return useAsync(
    () => id ? studentRepository.getById(id).then(s => s ?? null) : Promise.resolve(null),
    [id]
  );
}

export function useStudentsByBatch(batchId: string | undefined) {
  return useAsync(
    () => batchId ? studentRepository.listByBatch(batchId) : Promise.resolve([]),
    [batchId]
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function usePayments(studentId?: string) {
  return useAsync(
    () => studentId
      ? paymentRepository.listByStudent(studentId)
      : paymentRepository.listAll(),
    [studentId]
  );
}

export function useRecentPayments(limit = 10) {
  return useAsync(() => paymentRepository.listRecent(limit));
}

// ── Receipts ──────────────────────────────────────────────────────────────────

export function useReceipts(studentId?: string) {
  return useAsync(
    () => studentId
      ? receiptRepository.listByStudent(studentId)
      : receiptRepository.listAll(),
    [studentId]
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useSettings() {
  const result = useAsync(() => settingsRepository.get());

  const save = useCallback(async (settings: AppSettings) => {
    await settingsRepository.save(settings);
    result.refetch();
  }, [result]);

  const patch = useCallback(async (partial: Partial<AppSettings>) => {
    await settingsRepository.patch(partial);
    result.refetch();
  }, [result]);

  return { ...result, save, patch };
}

// ── Schema / Fields ───────────────────────────────────────────────────────────

export function useStudentFields() {
  const result = useAsync(() => schemaRepository.getStudentFields());

  const updateField = useCallback(async (id: string, changes: Partial<StudentFieldDefinition>) => {
    await schemaRepository.updateStudentField(id, changes);
    result.refetch();
  }, [result]);

  const createCustomField = useCallback(async (
    partial: Omit<StudentFieldDefinition, 'id' | 'createdAt' | 'updatedAt' | 'category'>
  ) => {
    const field = await schemaRepository.createCustomStudentField(partial);
    result.refetch();
    return field;
  }, [result]);

  const reorder = useCallback(async (orderedIds: string[]) => {
    await schemaRepository.reorderStudentFields(orderedIds);
    result.refetch();
  }, [result]);

  return { ...result, updateField, createCustomField, reorder };
}

// ── Batches ───────────────────────────────────────────────────────────────────

export function useBatches(academicYearId?: string) {
  return useAsync(
    () => academicYearId
      ? batchRepository.listByAcademicYear(academicYearId)
      : batchRepository.listActive(),
    [academicYearId]
  );
}

export function useAllBatches() {
  return useAsync(() => batchRepository.listAll());
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export function useSubjects() {
  return useAsync(() => subjectRepository.listActive());
}

// ── Academic Years ────────────────────────────────────────────────────────────

export function useAcademicYears() {
  return useAsync(() => academicYearRepository.listAll());
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  studentCount: number;
  paymentCount: number;
  totalCollection: number;
  ytdCollection: number;
  ytdStartDate: string; // resolved YYYY-MM-DD, for display
  collectionByMode: Record<string, number>;
  monthlyBreakdown: { month: string; amount: number }[];
}

/** @param ytdAnchor Recurring 'MM-DD' anchor for Year-to-Date (e.g. '04-01'). Defaults to calendar year. */
export function useDashboardStats(ytdAnchor?: string) {
  return useAsync(async (): Promise<DashboardStats> => {
    const ytdStartDate = resolveYtdStartDate(ytdAnchor);
    const [
      studentCount,
      paymentCount,
      totalCollection,
      ytdCollection,
      collectionByMode,
      monthlyBreakdown,
    ] = await Promise.all([
      studentRepository.count(),
      paymentRepository.count(),
      paymentRepository.totalCollection(),
      paymentRepository.collectionSince(ytdStartDate),
      paymentRepository.collectionByMode(),
      paymentRepository.monthlyBreakdown(12),
    ]);

    return {
      studentCount,
      paymentCount,
      totalCollection,
      ytdCollection,
      ytdStartDate,
      collectionByMode,
      monthlyBreakdown,
    };
  }, [ytdAnchor]);
}

// Re-export types for convenience
export type { Student, Payment, Receipt, AppSettings, StudentFieldDefinition, Batch, Subject, AcademicYear };

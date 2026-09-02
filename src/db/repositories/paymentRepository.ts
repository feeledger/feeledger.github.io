import { getDB, generateId, now } from '../indexeddb/database';
import type { Payment } from '../../types';

export interface CreatePaymentInput {
  studentId: string;
  batchId?: string;
  amount: number;
  currency?: string;
  paymentMode: string;
  paymentDate: string;
  purpose?: string;
  notes?: string;
  customValues?: Record<string, unknown>;
}

export interface PaymentFilters {
  studentId?: string;
  batchId?: string;
  paymentMode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const paymentRepository = {

  async create(input: CreatePaymentInput): Promise<Payment> {
    const db = getDB();
    const ts = now();
    const payment: Payment = {
      id: generateId('pay'),
      studentId: input.studentId,
      batchId: input.batchId,
      amount: input.amount,
      currency: input.currency ?? 'INR',
      paymentMode: input.paymentMode,
      paymentDate: input.paymentDate,
      purpose: input.purpose,
      notes: input.notes,
      customValues: input.customValues,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.payments.add(payment);
    return payment;
  },

  async getById(id: string): Promise<Payment | undefined> {
    return getDB().payments.get(id);
  },

  async linkReceipt(paymentId: string, receiptId: string): Promise<void> {
    await getDB().payments.update(paymentId, { receiptId, updatedAt: now() });
  },

  async listByStudent(studentId: string): Promise<Payment[]> {
    return getDB().payments
      .where('studentId').equals(studentId)
      .filter(p => !p.archivedAt)
      .reverse()
      .sortBy('paymentDate')
      .then(arr => arr.reverse());
  },

  async listAll(filters?: PaymentFilters): Promise<Payment[]> {
    let collection = getDB().payments
      .filter(p => !p.archivedAt);

    if (filters?.studentId) {
      collection = collection.filter(p => p.studentId === filters.studentId);
    }
    if (filters?.batchId) {
      collection = collection.filter(p => p.batchId === filters.batchId);
    }
    if (filters?.paymentMode) {
      collection = collection.filter(p => p.paymentMode === filters.paymentMode);
    }
    if (filters?.dateFrom) {
      collection = collection.filter(p => p.paymentDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      collection = collection.filter(p => p.paymentDate <= filters.dateTo!);
    }

    const results = await collection.toArray();
    return results.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  },

  async listRecent(limit = 10): Promise<Payment[]> {
    return getDB().payments
      .orderBy('createdAt')
      .reverse()
      .filter(p => !p.archivedAt)
      .limit(limit)
      .toArray();
  },

  async archive(id: string): Promise<void> {
    await getDB().payments.update(id, { archivedAt: now(), updatedAt: now() });
  },

  // ── Dashboard aggregations ──────────────────────────────────────────────────

  async totalCollection(): Promise<number> {
    const all = await getDB().payments.filter(p => !p.archivedAt).toArray();
    return all.reduce((sum, p) => sum + p.amount, 0);
  },

  async monthlyCollection(year: number, month: number): Promise<number> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month)}`;
    const all = await getDB().payments
      .filter(p => !p.archivedAt && p.paymentDate.startsWith(prefix))
      .toArray();
    return all.reduce((sum, p) => sum + p.amount, 0);
  },

  async collectionByMode(): Promise<Record<string, number>> {
    const all = await getDB().payments.filter(p => !p.archivedAt).toArray();
    const result: Record<string, number> = {};
    for (const p of all) {
      result[p.paymentMode] = (result[p.paymentMode] ?? 0) + p.amount;
    }
    return result;
  },

  async monthlyBreakdown(months = 12): Promise<{ month: string; amount: number }[]> {
    const all = await getDB().payments.filter(p => !p.archivedAt).toArray();
    const map: Record<string, number> = {};
    for (const p of all) {
      const key = p.paymentDate.slice(0, 7); // YYYY-MM
      map[key] = (map[key] ?? 0) + p.amount;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-months)
      .map(([month, amount]) => ({ month, amount }));
  },

  async count(): Promise<number> {
    return getDB().payments.filter(p => !p.archivedAt).count();
  },
};

import { getDB, generateId, now } from '../indexeddb/database';
import type { Receipt } from '../../types';

export interface CreateReceiptInput {
  receiptNumber: string;
  paymentId: string;
  studentId: string;
  templateId?: string;
  pdfDriveFileId?: string;
}

export const receiptRepository = {

  async create(input: CreateReceiptInput): Promise<Receipt> {
    const db = getDB();
    const ts = now();
    const receipt: Receipt = {
      id: generateId('rec'),
      receiptNumber: input.receiptNumber,
      paymentId: input.paymentId,
      studentId: input.studentId,
      templateId: input.templateId,
      pdfDriveFileId: input.pdfDriveFileId,
      issuedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.receipts.add(receipt);
    return receipt;
  },

  async getById(id: string): Promise<Receipt | undefined> {
    return getDB().receipts.get(id);
  },

  async getByPaymentId(paymentId: string): Promise<Receipt | undefined> {
    return getDB().receipts.where('paymentId').equals(paymentId).first();
  },

  async listByStudent(studentId: string): Promise<Receipt[]> {
    return getDB().receipts
      .where('studentId').equals(studentId)
      .reverse()
      .sortBy('issuedAt')
      .then(arr => arr.reverse());
  },

  async listAll(): Promise<Receipt[]> {
    return getDB().receipts.orderBy('issuedAt').reverse().toArray();
  },

  async updateDriveFileId(id: string, pdfDriveFileId: string): Promise<void> {
    await getDB().receipts.update(id, { pdfDriveFileId, updatedAt: now() });
  },

  async count(): Promise<number> {
    return getDB().receipts.count();
  },
};

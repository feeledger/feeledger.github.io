import Dexie, { type Table } from 'dexie';
import type {
  Student,
  Batch,
  Subject,
  AcademicYear,
  Payment,
  Receipt,
  StudentFieldDefinition,
  PaymentFieldDefinition,
  ReceiptTemplate,
  AppSettings,
  SyncMetadata,
  SyncQueueItem,
  DriveMetadata,
  FeeSchedule,
  PaymentMode,
} from '../../types';

// ── Stored types (some extend base types with DB-specific needs) ──────────────

export type StoredStudent    = Student;
export type StoredBatch      = Batch;
export type StoredSubject    = Subject;
export type StoredAcademicYear = AcademicYear;
export type StoredPayment    = Payment;
export type StoredReceipt    = Receipt;
export type StoredFeeSchedule = FeeSchedule;
export type StoredPaymentMode = PaymentMode & { id: string };

export interface StoredStudentField extends StudentFieldDefinition { _store: 'studentFields' }
export interface StoredPaymentField extends PaymentFieldDefinition { _store: 'paymentFields' }
export interface StoredReceiptTemplate extends ReceiptTemplate { _store: 'receiptTemplates' }

// Settings stored as a single row with id='singleton'
export interface StoredSettings extends AppSettings { id: 'singleton' }

// SyncMetadata keyed by entityType+entityId composite
export interface StoredSyncMeta extends SyncMetadata { id: string }

// DriveMetadata stored as single row
export interface StoredDriveMeta extends DriveMetadata { id: 'singleton' }

// ── Database class ────────────────────────────────────────────────────────────

export class FeeLedgerDB extends Dexie {
  students!:        Table<StoredStudent,        string>;
  batches!:         Table<StoredBatch,          string>;
  subjects!:        Table<StoredSubject,        string>;
  academicYears!:   Table<StoredAcademicYear,   string>;
  payments!:        Table<StoredPayment,        string>;
  receipts!:        Table<StoredReceipt,        string>;
  feeSchedules!:    Table<StoredFeeSchedule,    string>;
  studentFields!:   Table<StoredStudentField,   string>;
  paymentFields!:   Table<StoredPaymentField,   string>;
  receiptTemplates!:Table<StoredReceiptTemplate,string>;
  settings!:        Table<StoredSettings,       string>;
  syncMeta!:        Table<StoredSyncMeta,       string>;
  syncQueue!:       Table<SyncQueueItem,        string>;
  driveMeta!:       Table<StoredDriveMeta,      string>;

  constructor() {
    super('FeeLedgerDB');

    this.version(1).stores({
      // Students — searchable by name, phone, status, batch
      students:
        'id, ' +
        '*values.student_name, ' +
        'values.student_status, ' +
        'createdAt, updatedAt, archivedAt',

      // Batches — by academic year and status
      batches:
        'id, academicYearId, status, createdAt, updatedAt',

      // Subjects
      subjects:
        'id, status, name',

      // Academic years
      academicYears:
        'id, status, name',

      // Payments — by student, batch, date, mode
      payments:
        'id, studentId, batchId, paymentDate, paymentMode, createdAt, archivedAt',

      // Receipts — by payment, student, receipt number
      receipts:
        'id, paymentId, studentId, receiptNumber, issuedAt',

      // Fee schedules
      feeSchedules:
        'id, studentId, batchId',

      // Field definitions
      studentFields:
        'id, category, enabled, order',

      paymentFields:
        'id, category, enabled, order',

      // Receipt templates
      receiptTemplates:
        'id, name',

      // Settings singleton
      settings:
        'id',

      // Sync metadata — composite key entityType+entityId
      syncMeta:
        'id, entityType, entityId, status',

      // Sync queue
      syncQueue:
        'id, entityType, entityId, status, createdAt',

      // Drive metadata singleton
      driveMeta:
        'id',
    });
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────

let _db: FeeLedgerDB | null = null;

export function getDB(): FeeLedgerDB {
  if (!_db) _db = new FeeLedgerDB();
  return _db;
}

// ── ID generation ─────────────────────────────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function now(): string {
  return new Date().toISOString();
}

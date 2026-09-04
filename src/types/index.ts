// ── App User ──────────────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  googleSubjectId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Business Settings ─────────────────────────────────────────────────────
export interface BusinessSettings {
  businessName: string;
  logoFileId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstin?: string;
  otherIdentifier?: string;
}

// ── Field System ──────────────────────────────────────────────────────────
export type FieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'phone'
  | 'email'
  | 'url';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  searchable: boolean;
  enabled: boolean;
  showInList: boolean;
  showOnReceipt: boolean;
  order: number;
  options?: FieldOption[];
  defaultValue?: unknown;
  createdAt: string;
  updatedAt: string;
}

export type StudentFieldCategory =
  | 'basic'
  | 'parent'
  | 'academic'
  | 'tuition'
  | 'contact'
  | 'custom';

export interface StudentFieldDefinition extends FieldDefinition {
  category: StudentFieldCategory;
}

export interface PaymentFieldDefinition extends FieldDefinition {
  category: 'payment' | 'custom';
}

// ── Academic Year ─────────────────────────────────────────────────────────
export interface AcademicYear {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ── Subject ───────────────────────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ── Batch ─────────────────────────────────────────────────────────────────
export interface Batch {
  id: string;
  name: string;
  academicYearId: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  subjectIds: string[];
  schedule?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ── Student Batch Membership ──────────────────────────────────────────────
export interface StudentBatchMembership {
  id: string;
  studentId: string;
  batchId: string;
  joinedAt?: string;
  leftAt?: string;
  status: 'active' | 'completed' | 'transferred';
}

// ── Student ───────────────────────────────────────────────────────────────
export interface Student {
  id: string;
  values: Record<string, unknown>;
  batchMemberships: StudentBatchMembership[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// ── Payment Mode ──────────────────────────────────────────────────────────
export interface PaymentMode {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

// ── Payment ───────────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  studentId: string;
  batchId?: string;
  amount: number;
  currency: string;
  paymentMode: string;
  paymentDate: string;
  purpose?: string;
  notes?: string;
  customValues?: Record<string, unknown>;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// ── Receipt ───────────────────────────────────────────────────────────────
export type ReceiptSource = 'business' | 'student' | 'batch' | 'payment' | 'custom';

export interface ReceiptFieldDefinition {
  id: string;
  source: ReceiptSource;
  sourceFieldId?: string;
  label: string;
  enabled: boolean;
  required: boolean;
  order: number;
  format?: string;
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  fields: ReceiptFieldDefinition[];
  footerText?: string;
  termsText?: string;
  thankYouText?: string;
  showLogo: boolean;
  showSignature: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  studentId: string;
  templateId?: string;
  pdfDriveFileId?: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Receipt Numbering ─────────────────────────────────────────────────────
// Format: FEE-YYYY-MM-SeriesNumber  e.g. FEE-2026-09-0001
export interface ReceiptNumberSettings {
  prefix: string;
  includeYear: boolean;
  includeMonth: boolean;
  startingNumber: number;
  padding: number;
  nextNumber: number;
}

// ── Fee Schedule ──────────────────────────────────────────────────────────
export type FeeFrequency =
  | 'monthly'
  | 'quarterly'
  | 'halfYearly'
  | 'yearly'
  | 'oneTime'
  | 'custom';

export interface FeeSchedule {
  id: string;
  studentId: string;
  batchId?: string;
  amount: number;
  currency: string;
  frequency: FeeFrequency;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Sync ──────────────────────────────────────────────────────────────────
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';
export type SyncOperation = 'create' | 'update' | 'archive';

export interface SyncMetadata {
  entityType: string;
  entityId: string;
  status: SyncStatus;
  localUpdatedAt: string;
  remoteUpdatedAt?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  status: 'queued' | 'processing' | 'failed';
  errorMessage?: string;
}

// ── Drive Metadata ────────────────────────────────────────────────────────
export interface DriveMetadata {
  applicationRootFolderId?: string;
  dataFolderId?: string;
  receiptsFolderId?: string;
  exportsFolderId?: string;
  studentsFileId?: string;
  batchesFileId?: string;
  subjectsFileId?: string;
  paymentsFileId?: string;
  schemasFileId?: string;
  settingsFileId?: string;
  lastRemoteSyncAt?: string;
}

// ── App Settings (aggregate) ──────────────────────────────────────────────
export interface AppSettings {
  schemaVersion: number;
  business: BusinessSettings;
  receiptNumbering: ReceiptNumberSettings;
  paymentModes: PaymentMode[];
  defaultCurrency: string;
  onboardingComplete: boolean;
}

// ── Google OAuth ──────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// ── Google Drive scopes ───────────────────────────────────────────────────
// drive.file: access only files created by this app — minimum required scope
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// ── App constants ─────────────────────────────────────────────────────────
export const APP_NAME = 'FeeLedger';
export const APP_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

// ── Drive folder structure ────────────────────────────────────────────────
export const DRIVE_ROOT_FOLDER = 'FeeLedger';
export const DRIVE_DATA_FOLDER = 'Data';
export const DRIVE_RECEIPTS_FOLDER = 'Receipts';
export const DRIVE_EXPORTS_FOLDER = 'Exports';

// ── Receipt numbering defaults ────────────────────────────────────────────
// Output format: FEE-2026-09-0001
export const DEFAULT_RECEIPT_PREFIX = 'FEE';
export const DEFAULT_RECEIPT_PADDING = 4;
export const DEFAULT_RECEIPT_START = 1;

// ── Default payment modes ─────────────────────────────────────────────────
export const DEFAULT_PAYMENT_MODES = [
  { id: 'cash',          label: 'Cash',          enabled: true, order: 0 },
  { id: 'upi',           label: 'UPI',           enabled: true, order: 1 },
  { id: 'bank_transfer', label: 'Bank Transfer',  enabled: true, order: 2 },
  { id: 'card',          label: 'Card',           enabled: true, order: 3 },
  { id: 'cheque',        label: 'Cheque',         enabled: true, order: 4 },
  { id: 'other',         label: 'Other',          enabled: true, order: 5 },
];

// ── Default currency ──────────────────────────────────────────────────────
export const DEFAULT_CURRENCY = 'INR';

// ── GitHub Pages base path ────────────────────────────────────────────────
export const BASE_PATH = '/feeledger';

// ── Sync ──────────────────────────────────────────────────────────────────
export const SYNC_RETRY_MAX = 3;
export const SYNC_RETRY_BASE_DELAY_MS = 2000;

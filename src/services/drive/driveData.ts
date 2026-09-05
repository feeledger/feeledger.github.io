/**
 * Reads and writes FeeLedger data JSON files in Google Drive.
 *
 * Each entity type is stored as a single JSON file in FeeLedger/Data/:
 *   students.json   — all student records
 *   batches.json    — batches + academic years + subjects
 *   payments.json   — all payment records
 *   receipts.json   — all receipt metadata
 *   schemas.json    — field definitions
 *   settings.json   — app settings
 *
 * File IDs are cached in IndexedDB so we never re-scan Drive.
 * Write strategy: read → merge → write (last-write-wins for single-user case).
 */

import { driveClient } from '../google/driveClient';
import { driveMetaRepository } from '../../db/repositories/syncRepository';
import { SCHEMA_VERSION } from '../../config/index';

// ── Data file names ───────────────────────────────────────────────────────────

export const DATA_FILES = {
  students:  'students.json',
  batches:   'batches.json',
  payments:  'payments.json',
  receipts:  'receipts.json',
  schemas:   'schemas.json',
  settings:  'settings.json',
} as const;

export type DataFileKey = keyof typeof DATA_FILES;

// ── Envelope format ───────────────────────────────────────────────────────────

interface DataEnvelope<T> {
  schemaVersion: number;
  exportedAt: string;
  data: T;
}

function wrap<T>(data: T): DataEnvelope<T> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// ── File ID cache helpers ─────────────────────────────────────────────────────

const FILE_ID_MAP: Record<DataFileKey, string> = {
  students:  'studentsFileId',
  batches:   'batchesFileId',
  payments:  'paymentsFileId',
  receipts:  'receiptsFileId',  // not in DriveMetadata — will store in settings file for now
  schemas:   'schemasFileId',
  settings:  'settingsFileId',
};

// ── Core read/write ───────────────────────────────────────────────────────────

/**
 * Write a data file to Drive. Creates it if new, updates if existing.
 */
export async function writeDriveDataFile<T>(
  token: string,
  key: DataFileKey,
  data: T,
): Promise<string> {
  const meta = await driveMetaRepository.get();
  const dataFolderId = meta.dataFolderId;
  if (!dataFolderId) throw new Error('Drive Data folder not initialised. Run ensureDriveFolders first.');

  const fileIdKey = FILE_ID_MAP[key] as string;
  const existingFileId = (meta as Record<string, unknown>)[fileIdKey] as string | undefined;

  const envelope = wrap(data);
  const uploaded = await driveClient.uploadJSON(
    token,
    DATA_FILES[key],
    envelope,
    dataFolderId,
    existingFileId,
  );

  // Cache the file ID
  await driveMetaRepository.patch({ [fileIdKey]: uploaded.id } as Record<string, string>);

  return uploaded.id;
}

/**
 * Read a data file from Drive.
 * Returns null if the file doesn't exist yet.
 */
export async function readDriveDataFile<T>(
  token: string,
  key: DataFileKey,
): Promise<T | null> {
  const meta = await driveMetaRepository.get();
  const fileIdKey = FILE_ID_MAP[key] as string;
  const fileId = (meta as Record<string, unknown>)[fileIdKey] as string | undefined;

  if (!fileId) return null;

  try {
    const envelope = await driveClient.downloadJSON<DataEnvelope<T>>(token, fileId);
    return envelope.data ?? null;
  } catch (err: unknown) {
    // 404 means the file was deleted from Drive externally
    if (err instanceof Error && err.message.includes('404')) {
      await driveMetaRepository.patch({ [fileIdKey]: undefined } as Record<string, undefined>);
      return null;
    }
    throw err;
  }
}

// ── Receipt PDF upload ────────────────────────────────────────────────────────

/**
 * Upload a receipt PDF to FeeLedger/Receipts/YYYY/
 */
export async function uploadReceiptPDF(
  token: string,
  receiptNumber: string,
  pdfBlob: Blob,
  yearFolderId: string,
): Promise<string> {
  const fileName = `${receiptNumber}.pdf`;
  const uploaded = await driveClient.uploadPDF(
    token,
    fileName,
    pdfBlob,
    yearFolderId,
  );
  return uploaded.id;
}

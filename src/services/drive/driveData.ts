/**
 * Reads and writes FeeLedger data JSON files in Google Drive.
 *
 * CROSS-DEVICE FIX: When file IDs aren't in local IndexedDB (new device),
 * we search Drive by name inside the Data folder and cache the found IDs.
 */

import { driveClient } from '../google/driveClient';
import { driveMetaRepository } from '../../db/repositories/syncRepository';
import { SCHEMA_VERSION } from '../../config/index';

export const DATA_FILES = {
  students:  'students.json',
  batches:   'batches.json',
  payments:  'payments.json',
  receipts:  'receipts.json',
  schemas:   'schemas.json',
  settings:  'settings.json',
} as const;

export type DataFileKey = keyof typeof DATA_FILES;

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

const FILE_ID_MAP: Record<DataFileKey, keyof import('../../types').DriveMetadata> = {
  students:  'studentsFileId',
  batches:   'batchesFileId',
  payments:  'paymentsFileId',
  receipts:  'receiptsFileId',
  schemas:   'schemasFileId',
  settings:  'settingsFileId',
};

/**
 * Search Drive by filename inside the Data folder.
 * Used as fallback when local file ID cache is empty (new device / cleared data).
 */
async function searchFileByName(
  token: string,
  fileName: string,
  parentFolderId: string,
): Promise<string | null> {
  try {
    const files = await driveClient.listFiles(
      token,
      `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`,
      'files(id,name)',
    );
    return files.length > 0 ? files[0].id : null;
  } catch {
    return null;
  }
}

export async function writeDriveDataFile<T>(
  token: string,
  key: DataFileKey,
  data: T,
): Promise<string> {
  const meta = await driveMetaRepository.get();
  const dataFolderId = meta.dataFolderId;
  if (!dataFolderId) throw new Error('Drive Data folder not initialised.');

  const fileIdKey = FILE_ID_MAP[key];
  let existingFileId = meta[fileIdKey] as string | undefined;

  // Cross-device: if no cached file ID, search Drive by name
  if (!existingFileId) {
    const found = await searchFileByName(token, DATA_FILES[key], dataFolderId);
    if (found) {
      existingFileId = found;
      await driveMetaRepository.patch({ [fileIdKey]: found });
    }
  }

  const envelope = wrap(data);
  const uploaded = await driveClient.uploadJSON(
    token,
    DATA_FILES[key],
    envelope,
    dataFolderId,
    existingFileId,
  );

  await driveMetaRepository.patch({ [fileIdKey]: uploaded.id });
  return uploaded.id;
}

export async function readDriveDataFile<T>(
  token: string,
  key: DataFileKey,
): Promise<T | null> {
  const meta = await driveMetaRepository.get();
  const fileIdKey = FILE_ID_MAP[key];
  let fileId = meta[fileIdKey] as string | undefined;

  // Cross-device: search Drive by name if no cached ID
  if (!fileId && meta.dataFolderId) {
    const found = await searchFileByName(token, DATA_FILES[key], meta.dataFolderId);
    if (found) {
      fileId = found;
      await driveMetaRepository.patch({ [fileIdKey]: found });
    }
  }

  if (!fileId) return null;

  try {
    const envelope = await driveClient.downloadJSON<DataEnvelope<T>>(token, fileId);
    return envelope.data ?? null;
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('404') || err.message.includes('403'))) {
      await driveMetaRepository.patch({ [fileIdKey]: undefined });
      return null;
    }
    throw err;
  }
}

export async function uploadReceiptPDF(
  token: string,
  receiptNumber: string,
  pdfBlob: Blob,
  yearFolderId: string,
): Promise<string> {
  const fileName = `${receiptNumber}.pdf`;
  const uploaded = await driveClient.uploadPDF(token, fileName, pdfBlob, yearFolderId);
  return uploaded.id;
}

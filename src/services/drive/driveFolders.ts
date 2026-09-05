/**
 * Manages the FeeLedger folder structure in Google Drive.
 *
 * Structure:
 *   FeeLedger/
 *   ├── Data/
 *   │   ├── students.json
 *   │   ├── batches.json
 *   │   ├── payments.json
 *   │   ├── schemas.json
 *   │   └── settings.json
 *   ├── Receipts/
 *   │   └── 2026/
 *   │       └── FEE-2026-09-0001.pdf
 *   └── Exports/
 *
 * All folder IDs are stored locally in IndexedDB (driveMetaRepository)
 * so we never scan the whole Drive on every load.
 */

import { driveClient } from '../google/driveClient';
import { driveMetaRepository } from '../../db/repositories/syncRepository';
import type { DriveMetadata } from '../../types';

const ROOT_NAME     = 'FeeLedger';
const DATA_NAME     = 'Data';
const RECEIPTS_NAME = 'Receipts';
const EXPORTS_NAME  = 'Exports';
const FOLDER_MIME   = 'application/vnd.google-apps.folder';

// ── Folder resolution ─────────────────────────────────────────────────────────

/**
 * Find an existing folder by name inside a parent, or create it.
 * Returns the folder ID.
 */
async function findOrCreateFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string> {
  // Search for existing
  let query = `name='${name}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;

  const existing = await driveClient.listFiles(token, query, 'files(id,name)');
  if (existing.length > 0) return existing[0].id;

  // Create new
  const created = await driveClient.createFolder(token, name, parentId);
  return created.id;
}

// ── Main initialiser ──────────────────────────────────────────────────────────

/**
 * Ensure the full FeeLedger folder structure exists in Drive.
 * Cached in IndexedDB — only makes Drive API calls when folder IDs are missing.
 * Safe to call on every app start.
 */
export async function ensureDriveFolders(token: string): Promise<DriveMetadata> {
  const meta = await driveMetaRepository.get();

  let changed = false;
  let rootId   = meta.applicationRootFolderId;
  let dataId   = meta.dataFolderId;
  let receiptsId = meta.receiptsFolderId;
  let exportsId  = meta.exportsFolderId;

  // Root: FeeLedger/
  if (!rootId) {
    rootId = await findOrCreateFolder(token, ROOT_NAME);
    changed = true;
  }

  // Data/
  if (!dataId) {
    dataId = await findOrCreateFolder(token, DATA_NAME, rootId);
    changed = true;
  }

  // Receipts/
  if (!receiptsId) {
    receiptsId = await findOrCreateFolder(token, RECEIPTS_NAME, rootId);
    changed = true;
  }

  // Exports/
  if (!exportsId) {
    exportsId = await findOrCreateFolder(token, EXPORTS_NAME, rootId);
    changed = true;
  }

  if (changed) {
    await driveMetaRepository.patch({
      applicationRootFolderId: rootId,
      dataFolderId: dataId,
      receiptsFolderId: receiptsId,
      exportsFolderId: exportsId,
    });
  }

  return driveMetaRepository.get();
}

/**
 * Get or create a year sub-folder inside Receipts/.
 * e.g. FeeLedger/Receipts/2026/
 */
export async function getReceiptsYearFolder(
  token: string,
  year: number,
): Promise<string> {
  const meta = await driveMetaRepository.get();
  const receiptsId = meta.receiptsFolderId;
  if (!receiptsId) throw new Error('Receipts folder not initialised');

  return findOrCreateFolder(token, String(year), receiptsId);
}

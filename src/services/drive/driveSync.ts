/**
 * Drive sync service.
 *
 * pull() — Downloads all Drive data files → populates IndexedDB
 * push() — Reads all IndexedDB data → writes to Drive data files
 * pushReceiptPDF() — Generates and uploads a single receipt PDF
 *
 * This is a simple full-file sync (not delta/patch).
 * Suitable for a single-user tuition management app with moderate data volume.
 */

import { ensureDriveFolders, getReceiptsYearFolder } from './driveFolders';
import { writeDriveDataFile, readDriveDataFile, uploadReceiptPDF } from './driveData';
import { driveMetaRepository } from '../../db/repositories/syncRepository';
import { getDB } from '../../db/indexeddb/database';
import { settingsRepository } from '../../db/repositories/settingsRepository';
import { receiptRepository } from '../../db/repositories/receiptRepository';
import type { ReceiptData } from '../pdf/receiptPDF';
import type {
  Student, Batch, Subject, AcademicYear,
  Payment, Receipt, StudentFieldDefinition,
  PaymentFieldDefinition, AppSettings,
} from '../../types';

// ── Serialised data shapes ────────────────────────────────────────────────────

interface StudentsFile   { students: Student[] }
interface BatchesFile    { batches: Batch[]; subjects: Subject[]; academicYears: AcademicYear[] }
interface PaymentsFile   { payments: Payment[] }
interface ReceiptsFile   { receipts: Receipt[] }
interface SchemasFile    { studentFields: StudentFieldDefinition[]; paymentFields: PaymentFieldDefinition[] }

// ── Push (local → Drive) ──────────────────────────────────────────────────────

/**
 * Write all local data to Drive.
 * Called after any significant change (or on a timer).
 */
export async function pushAllToDrive(token: string): Promise<void> {
  const db = getDB();

  // Ensure folder structure exists
  await ensureDriveFolders(token);

  // Read all local data in parallel
  const [
    students,
    batches, subjects, academicYears,
    payments,
    receipts,
    studentFields, paymentFields,
    settings,
  ] = await Promise.all([
    db.students.filter(s => !s.archivedAt).toArray(),
    db.batches.toArray(),
    db.subjects.toArray(),
    db.academicYears.toArray(),
    db.payments.filter(p => !p.archivedAt).toArray(),
    db.receipts.toArray(),
    db.studentFields.toArray().then(rows => rows.map(({ _store: _sf, ...f }) => { void _sf; return f as StudentFieldDefinition; })),
    db.paymentFields.toArray().then(rows => rows.map(({ _store: _pf, ...f }) => { void _pf; return f as PaymentFieldDefinition; })),
    settingsRepository.get(),
  ]);

  // Write all files in parallel
  await Promise.all([
    writeDriveDataFile<StudentsFile>(token, 'students', { students }),
    writeDriveDataFile<BatchesFile>(token, 'batches', { batches, subjects, academicYears }),
    writeDriveDataFile<PaymentsFile>(token, 'payments', { payments }),
    writeDriveDataFile<ReceiptsFile>(token, 'receipts', { receipts }),
    writeDriveDataFile<SchemasFile>(token, 'schemas', { studentFields, paymentFields }),
    writeDriveDataFile<AppSettings>(token, 'settings', settings),
  ]);

  // Record sync time
  await driveMetaRepository.patch({ lastRemoteSyncAt: new Date().toISOString() });
}

// ── Pull (Drive → local) ──────────────────────────────────────────────────────

/**
 * Pull all data from Drive into IndexedDB.
 * Called on first login to restore data from Drive,
 * or to sync from another device.
 */
export async function pullAllFromDrive(token: string): Promise<{ restored: boolean }> {
  await ensureDriveFolders(token);
  const db = getDB();

  const [studentsFile, batchesFile, paymentsFile, receiptsFile, schemasFile, settingsFile] =
    await Promise.all([
      readDriveDataFile<StudentsFile>(token, 'students'),
      readDriveDataFile<BatchesFile>(token, 'batches'),
      readDriveDataFile<PaymentsFile>(token, 'payments'),
      readDriveDataFile<ReceiptsFile>(token, 'receipts'),
      readDriveDataFile<SchemasFile>(token, 'schemas'),
      readDriveDataFile<AppSettings>(token, 'settings'),
    ]);

  // If no data exists on Drive yet, nothing to restore
  if (!studentsFile && !paymentsFile && !settingsFile) {
    return { restored: false };
  }

  // Write into IndexedDB (bulkPut = upsert, won't duplicate)
  await db.transaction('rw',
    [db.students, db.batches, db.subjects, db.academicYears,
    db.payments, db.receipts, db.studentFields, db.paymentFields],
    async () => {
      if (studentsFile?.students?.length) {
        await db.students.bulkPut(studentsFile.students);
      }
      if (batchesFile?.batches?.length) {
        await db.batches.bulkPut(batchesFile.batches);
      }
      if (batchesFile?.subjects?.length) {
        await db.subjects.bulkPut(batchesFile.subjects);
      }
      if (batchesFile?.academicYears?.length) {
        await db.academicYears.bulkPut(batchesFile.academicYears);
      }
      if (paymentsFile?.payments?.length) {
        await db.payments.bulkPut(paymentsFile.payments);
      }
      if (receiptsFile?.receipts?.length) {
        await db.receipts.bulkPut(receiptsFile.receipts);
      }
      if (schemasFile?.studentFields?.length) {
        await db.studentFields.bulkPut(
          schemasFile.studentFields.map(f => ({ ...f, _store: 'studentFields' as const }))
        );
      }
      if (schemasFile?.paymentFields?.length) {
        await db.paymentFields.bulkPut(
          schemasFile.paymentFields.map(f => ({ ...f, _store: 'paymentFields' as const }))
        );
      }
    }
  );

  if (settingsFile) {
    await settingsRepository.save(settingsFile);
  }

  await driveMetaRepository.patch({ lastRemoteSyncAt: new Date().toISOString() });
  return { restored: true };
}

// ── Receipt PDF upload ────────────────────────────────────────────────────────

/**
 * Generate and upload a single receipt PDF to Drive.
 * Called immediately after a payment is recorded.
 */
export async function pushReceiptPDFToDrive(
  token: string,
  receiptData: ReceiptData,
): Promise<string | null> {
  try {
    await ensureDriveFolders(token);

    const year = new Date(receiptData.payment.paymentDate).getFullYear();
    const yearFolderId = await getReceiptsYearFolder(token, year);

    const { getReceiptPDFBlob } = await import('../pdf/receiptPDF');
    const pdfBlob = await getReceiptPDFBlob(receiptData);
    const fileId  = await uploadReceiptPDF(
      token,
      receiptData.receipt.receiptNumber,
      pdfBlob,
      yearFolderId,
    );

    // Store the Drive file ID on the receipt record
    await receiptRepository.updateDriveFileId(receiptData.receipt.id, fileId);
    return fileId;

  } catch (err) {
    console.error('[FeeLedger] Receipt PDF upload failed:', err);
    return null;
  }
}

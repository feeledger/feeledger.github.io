import { getDB } from './database';
import { schemaRepository } from '../repositories/schemaRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { subjectRepository } from '../repositories/batchRepository';

/**
 * Runs once on app start.
 * Seeds default field definitions, default subjects, and default settings
 * if the database is empty (first install).
 * Safe to call multiple times — all operations are idempotent.
 */
export async function initialiseDatabase(): Promise<void> {
  try {
    // Open the database (creates it if it doesn't exist)
    const db = getDB();
    await db.open();

    // Seed schemas
    await schemaRepository.initialise();

    // Seed subjects if none exist
    await subjectRepository.seedDefaults();

    // Ensure settings singleton exists
    const settings = await settingsRepository.get();
    await settingsRepository.save(settings);

  } catch (err) {
    console.error('[FeeLedger] Database initialisation error:', err);
    // Don't throw — allow app to render even if DB has issues,
    // individual operations will show their own errors
  }
}

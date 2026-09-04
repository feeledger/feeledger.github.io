import { getDB, type StoredSettings } from '../indexeddb/database';
import { getDefaultSettings } from '../indexeddb/defaultSettings';
import type { AppSettings } from '../../types';

const SINGLETON_ID = 'singleton' as const;

export const settingsRepository = {

  async get(): Promise<AppSettings> {
    const db = getDB();
    const row = await db.settings.get(SINGLETON_ID);
    if (!row) return getDefaultSettings();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...settings } = row;
    return settings as AppSettings;
  },

  async save(settings: AppSettings): Promise<void> {
    const db = getDB();
    const row: StoredSettings = { id: SINGLETON_ID, ...settings };
    await db.settings.put(row);
  },

  async patch(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated: AppSettings = {
      ...current,
      ...partial,
      business: { ...current.business, ...(partial.business ?? {}) },
      receiptNumbering: { ...current.receiptNumbering, ...(partial.receiptNumbering ?? {}) },
      paymentModes: partial.paymentModes ?? current.paymentModes,
    };
    await this.save(updated);
    return updated;
  },

  async isOnboardingComplete(): Promise<boolean> {
    const s = await this.get();
    return s.onboardingComplete;
  },

  async completeOnboarding(): Promise<void> {
    await this.patch({ onboardingComplete: true });
  },

  /** Increment and return the next receipt number, updating the stored counter */
  async nextReceiptNumber(): Promise<string> {
    const settings = await this.get();
    const { prefix, includeYear, includeMonth, padding, nextNumber } = settings.receiptNumbering;
    const d = new Date();
    const year  = d.getFullYear().toString();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const serial = String(nextNumber).padStart(padding, '0');

    let parts = [prefix];
    if (includeYear)  parts.push(year);
    if (includeMonth) parts.push(month);
    parts.push(serial);

    const receiptNumber = parts.join('-');

    // Increment counter
    await this.patch({
      receiptNumbering: {
        ...settings.receiptNumbering,
        nextNumber: nextNumber + 1,
      },
    });

    return receiptNumber;
  },
};

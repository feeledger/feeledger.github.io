import type { AppSettings } from '../../types';

export function getDefaultSettings(): AppSettings {
  return {
    schemaVersion: 1,
    onboardingComplete: false,
    defaultCurrency: 'INR',
    business: {
      businessName: '',
    },
    receiptNumbering: {
      prefix: 'FEE',
      includeYear: true,
      includeMonth: true,
      startingNumber: 1,
      padding: 4,
      nextNumber: 1,
    },
    paymentModes: [
      { id: 'cash',          label: 'Cash',          enabled: true, order: 0 },
      { id: 'upi',           label: 'UPI',           enabled: true, order: 1 },
      { id: 'bank_transfer', label: 'Bank Transfer',  enabled: true, order: 2 },
      { id: 'card',          label: 'Card',           enabled: true, order: 3 },
      { id: 'cheque',        label: 'Cheque',         enabled: true, order: 4 },
      { id: 'other',         label: 'Other',          enabled: true, order: 5 },
    ],
  };
}

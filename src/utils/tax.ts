import type { TaxRate, TaxSettings, PaymentTaxLine } from '../types/index';

export interface TaxCalculationResult {
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxLines: PaymentTaxLine[];
}

/**
 * Calculate tax breakdown given an entered amount, the selected tax rates,
 * and whether the entered amount is inclusive or exclusive of tax.
 *
 * Inclusive: `enteredAmount` is the final total. Tax is extracted from within it.
 *   base = enteredAmount / (1 + totalRatePct/100)
 *   tax  = enteredAmount - base
 *
 * Exclusive: `enteredAmount` is the pre-tax base. Tax is added on top.
 *   base  = enteredAmount
 *   tax   = enteredAmount * totalRatePct/100
 *   total = enteredAmount + tax
 *
 * When multiple rates are selected (e.g. CGST 9% + SGST 9%), each is
 * calculated independently on the same base amount and summed — this is
 * the standard GST-compliant approach.
 */
export function calculateTax(
  enteredAmount: number,
  selectedRates: TaxRate[],
  inclusive: boolean,
): TaxCalculationResult {
  if (!selectedRates.length || enteredAmount <= 0) {
    return { baseAmount: enteredAmount, taxAmount: 0, totalAmount: enteredAmount, taxLines: [] };
  }

  const totalRatePct = selectedRates.reduce((sum, r) => sum + r.rate, 0);

  // Compute the unrounded base first, then round each tax line — then derive
  // the base/total as the exact complement of the rounded tax lines. This
  // guarantees subtotal + sum(taxLines) always equals the total exactly,
  // with no floating-point/rounding drift (critical for a financial document).
  const unroundedBase = inclusive
    ? enteredAmount / (1 + totalRatePct / 100)
    : enteredAmount;

  const taxLines: PaymentTaxLine[] = selectedRates.map(rate => ({
    taxRateId: rate.id,
    name: rate.name,
    rate: rate.rate,
    amount: round2(unroundedBase * (rate.rate / 100)),
  }));

  const taxAmount = round2(taxLines.reduce((sum, l) => sum + l.amount, 0));

  let baseAmount: number;
  let totalAmount: number;

  if (inclusive) {
    totalAmount = round2(enteredAmount);
    baseAmount = round2(totalAmount - taxAmount);
  } else {
    baseAmount = round2(enteredAmount);
    totalAmount = round2(baseAmount + taxAmount);
  }

  return { baseAmount, taxAmount, totalAmount, taxLines };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Get the TaxRate objects that should be pre-selected by default, from TaxSettings. */
export function getDefaultTaxRates(taxSettings: TaxSettings | undefined): TaxRate[] {
  if (!taxSettings?.enabled) return [];
  const defaultIds = new Set(normalizeDefaultRateIds(taxSettings));
  return taxSettings.rates.filter(r => r.enabled && defaultIds.has(r.id));
}

/**
 * Reads default tax rate IDs, tolerating settings saved before the
 * single-rate → multi-rate migration (old shape had `defaultRateId?: string`).
 */
export function normalizeDefaultRateIds(taxSettings: {
  defaultRateIds?: string[];
  defaultRateId?: string;
}): string[] {
  if (Array.isArray(taxSettings.defaultRateIds)) return taxSettings.defaultRateIds;
  return taxSettings.defaultRateId ? [taxSettings.defaultRateId] : [];
}

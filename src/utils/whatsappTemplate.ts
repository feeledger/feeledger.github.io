// Single source of truth for the WhatsApp reminder template, shared by the
// Settings → WhatsApp tab (where it's edited) and the member profile
// (where it's turned into an actual message). Keeping the default text and
// storage key here means the "Send WhatsApp reminder" button always picks
// up exactly what's shown/saved in Settings — even before anything has
// ever been explicitly saved.

export const WA_TEMPLATE_STORAGE_KEY = 'fl_wa_template';

export const DEFAULT_WA_TEMPLATE = `Hi {{name}},

This is a reminder that your fee payment is due.

Total paid so far: {{total_paid}}
Amount due: {{total_due}}
Due date: {{due_date}}

Kindly make the payment at your earliest convenience.

Thank you,
{{business_name}}`;

export const WA_PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: '{{name}}',          desc: 'Member name' },
  { key: '{{total_due}}',     desc: 'Amount currently due — calculated from fee amount, frequency and payments made' },
  { key: '{{total_paid}}',    desc: 'Total amount paid so far' },
  { key: '{{due_date}}',      desc: 'Due date' },
  { key: '{{period}}',        desc: 'Current month and year (e.g. September 2026)' },
  { key: '{{business_name}}', desc: 'Your business name' },
];

/** The currently saved template, or the default if nothing has been saved yet. */
export function getSavedWaTemplate(): string {
  return localStorage.getItem(WA_TEMPLATE_STORAGE_KEY) ?? DEFAULT_WA_TEMPLATE;
}

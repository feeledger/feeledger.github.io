
import type { FieldDefinition, StudentFieldCategory } from '../../types';
import { FieldInput } from './FieldInput';
import { FormRow } from '../ui/index';
import { getFrequencyLabel } from '../../utils/fees';

export interface DynamicFormValues {
  [fieldId: string]: unknown;
}

interface DynamicFormProps {
  fields: FieldDefinition[];
  values: DynamicFormValues;
  onChange: (values: DynamicFormValues) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  currency?: string;
  /** If true, groups fields by category with section headings */
  groupByCategory?: boolean;
  /** Only render enabled fields */
  enabledOnly?: boolean;
}

const CATEGORY_LABELS: Record<StudentFieldCategory, string> = {
  basic:    'Basic Information',
  parent:   'Parent / Guardian',
  academic: 'Academic',
  tuition:  'Tuition / Membership',
  contact:  'Contact & Additional',
  custom:   'Custom Fields',
};

/**
 * fee_amount, fee_type ("This is a recurring amount") and fee_frequency work
 * together to define what a member owes — see utils/fees.ts. Show a live
 * hint under each of the three so it's clear how they combine as the user
 * fills them in.
 */
function getFeeFieldHint(fieldId: string, values: DynamicFormValues): string | undefined {
  const isRecurring = Boolean(values['fee_type']);
  const freq = String(values['fee_frequency'] ?? '');
  const freqLabel = freq ? getFrequencyLabel(freq) : '';

  switch (fieldId) {
    case 'fee_amount':
      return isRecurring
        ? `Recurring amount — charged every cycle${freqLabel ? ` (currently ${freqLabel})` : ', set a frequency below'}.`
        : 'Treated as the total amount due for the whole course/engagement, not a per-cycle amount.';
    case 'fee_type':
      return 'Turn this on if the amount above repeats at a set frequency (e.g. every month), instead of being a one-off total.';
    case 'fee_frequency':
      return isRecurring
        ? 'How often the fee amount above is charged.'
        : 'Description only — the amount above is still treated as the total due, however this is filled in.';
    default:
      return undefined;
  }
}

export function DynamicForm({
  fields,
  values,
  onChange,
  errors = {},
  disabled,
  currency = 'INR',
  groupByCategory = false,
  enabledOnly = true,
}: DynamicFormProps) {

  const visibleFields = enabledOnly ? fields.filter(f => f.enabled) : fields;

  const handleChange = (fieldId: string, value: unknown) => {
    onChange({ ...values, [fieldId]: value });
  };

  if (!groupByCategory) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {visibleFields.map(field => (
          <FormRow
            key={field.id}
            label={field.label}
            required={field.required}
            hint={getFeeFieldHint(field.id, values)}
            error={errors[field.id]}
          >
            <FieldInput
              field={field}
              value={values[field.id]}
              onChange={v => handleChange(field.id, v)}
              disabled={disabled}
              error={errors[field.id]}
              currency={currency}
            />
          </FormRow>
        ))}
      </div>
    );
  }

  // Group by category
  const categories = Array.from(
    new Set(
      visibleFields
        .filter(f => 'category' in f)
        .map(f => (f as { category: string }).category)
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {categories.map(category => {
        const categoryFields = visibleFields.filter(
          f => 'category' in f && (f as { category: string }).category === category
        );
        if (categoryFields.length === 0) return null;
        return (
          <div key={category}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--color-slate)',
              marginBottom: 14, paddingBottom: 8,
              borderBottom: '1px solid var(--color-dust)',
            }}>
              {CATEGORY_LABELS[category as StudentFieldCategory] ?? category}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {categoryFields.map(field => (
                <FormRow
                  key={field.id}
                  label={field.label}
                  required={field.required}
                  hint={getFeeFieldHint(field.id, values)}
                  error={errors[field.id]}
                >
                  <FieldInput
                    field={field}
                    value={values[field.id]}
                    onChange={v => handleChange(field.id, v)}
                    disabled={disabled}
                    error={errors[field.id]}
                    currency={currency}
                  />
                </FormRow>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Validation helper ─────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function validateForm(
  fields: FieldDefinition[],
  values: DynamicFormValues
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.enabled) continue;
    if (field.required) {
      const val = values[field.id];
      const isEmpty =
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        errors[field.id] = `${field.label} is required`;
      }
    }
  }
  return errors;
}

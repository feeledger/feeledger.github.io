
import type { FieldDefinition, StudentFieldCategory } from '../../types';
import { FieldInput } from './FieldInput';
import { FormRow } from '../ui/index';

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

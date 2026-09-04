import React from 'react';
import type { FieldDefinition, FieldType } from '../../types';

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-white)',
  border: '1px solid rgba(20,20,19,0.22)',
  borderRadius: 12,
  padding: '10px 14px',
  fontFamily: 'var(--font-sans)',
  fontSize: 15,
  fontWeight: 400,
  color: 'var(--color-ink)',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'var(--color-ink)',
};

function useInputFocus() {
  const [focused, setFocused] = React.useState(false);
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: focused ? { ...inputStyle, ...focusStyle } : inputStyle,
  };
}

// ── Individual field components ───────────────────────────────────────────────

function TextField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder={field.label}
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function LongTextField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <textarea
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder={field.label}
      required={field.required}
      disabled={disabled}
      rows={3}
      style={{ ...style, resize: 'vertical', lineHeight: 1.5 }}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function NumberField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="number"
      value={value === undefined || value === null ? '' : String(value)}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={field.label}
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function CurrencyField({ field, value, onChange, disabled, currency = 'INR' }: FieldInputProps & { currency?: string }) {
  const { style, onFocus, onBlur } = useInputFocus();
  const symbol = currency === 'INR' ? '₹' : currency;
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 15, color: 'var(--color-slate)', pointerEvents: 'none',
      }}>
        {symbol}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="0.00"
        required={field.required}
        disabled={disabled}
        style={{ ...style, paddingLeft: 30 }}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={field.label}
      />
    </div>
  );
}

function DateField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="date"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function TimeField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="time"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function DateTimeField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="datetime-local"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function BooleanField({ value, onChange, disabled }: FieldInputProps) {
  const checked = Boolean(value);
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !disabled) { e.preventDefault(); onChange(!checked); } }}
        style={{
          width: 40, height: 22, borderRadius: 22,
          backgroundColor: checked ? 'var(--color-ink)' : 'var(--color-dust)',
          position: 'relative', transition: 'background-color 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          backgroundColor: 'white',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ fontSize: 14, color: 'var(--color-ink)' }}>
        {checked ? 'Yes' : 'No'}
      </span>
    </label>
  );
}

function SelectField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <select
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      disabled={disabled}
      style={{ ...style, cursor: 'pointer', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23696969' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
        paddingRight: 36,
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    >
      <option value="">— Select —</option>
      {(field.options ?? []).map(opt => (
        <option key={opt.id} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function MultiSelectField({ field, value, onChange, disabled }: FieldInputProps) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter(s => s !== v));
    else onChange([...selected, v]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {(field.options ?? []).map(opt => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => !disabled && toggle(opt.value)}
            disabled={disabled}
            style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1.5px solid ${active ? 'var(--color-ink)' : 'var(--color-dust)'}`,
              background: active ? 'var(--color-ink)' : 'var(--color-white)',
              color: active ? 'var(--color-white)' : 'var(--color-ink)',
              fontSize: 13, fontWeight: active ? 600 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PhoneField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="tel"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder="+91 9876543210"
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function EmailField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="email"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder="name@example.com"
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

function UrlField({ field, value, onChange, disabled }: FieldInputProps) {
  const { style, onFocus, onBlur } = useInputFocus();
  return (
    <input
      type="url"
      value={String(value ?? '')}
      onChange={e => onChange(e.target.value)}
      placeholder="https://example.com"
      required={field.required}
      disabled={disabled}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      aria-label={field.label}
    />
  );
}

// ── Main FieldInput component ─────────────────────────────────────────────────

export interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string;
  currency?: string;
}

const FIELD_MAP: Record<FieldType, React.ComponentType<FieldInputProps>> = {
  text:        TextField,
  longText:    LongTextField,
  number:      NumberField,
  currency:    CurrencyField,
  date:        DateField,
  time:        TimeField,
  datetime:    DateTimeField,
  boolean:     BooleanField,
  select:      SelectField,
  multiselect: MultiSelectField,
  phone:       PhoneField,
  email:       EmailField,
  url:         UrlField,
};

export function FieldInput(props: FieldInputProps) {
  const Component = FIELD_MAP[props.field.type] ?? TextField;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <Component {...props} />
      {props.error && (
        <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{props.error}</p>
      )}
    </div>
  );
}

// ── Field type label helper ───────────────────────────────────────────────────

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text:        'Text',
  longText:    'Long Text',
  number:      'Number',
  currency:    'Amount / Currency',
  date:        'Date',
  time:        'Time',
  datetime:    'Date & Time',
  boolean:     'Yes / No',
  select:      'Dropdown',
  multiselect: 'Multi-select',
  phone:       'Phone Number',
  email:       'Email',
  url:         'URL',
};

import React, { useState } from 'react';
import type { StudentFieldDefinition, FieldType, FieldOption } from '../../types';
import { useStudentFields } from '../../hooks/useDB';
import { Modal, Toggle, Badge, EmptyState, Spinner, FormRow } from '../../components/ui/index';
import { FIELD_TYPE_LABELS } from '../../components/fields/FieldInput';
import { generateId, now } from '../../db/indexeddb/database';

// ── Category colours ──────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  basic:    'info',
  parent:   'success',
  academic: 'warning',
  tuition:  'default',
  contact:  'default',
  custom:   'warning',
};

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  onToggle,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: StudentFieldDefinition;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: field.enabled ? 'var(--color-white)' : 'var(--color-canvas)',
      borderBottom: '1px solid var(--color-dust)',
      opacity: field.enabled ? 1 : 0.6,
      transition: 'background 0.15s ease',
    }}>
      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <button
          onClick={onMoveUp} disabled={isFirst}
          style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
            fontSize: 12, color: isFirst ? 'var(--color-dust)' : 'var(--color-slate)', padding: '0 2px', lineHeight: 1 }}
        >▲</button>
        <button
          onClick={onMoveDown} disabled={isLast}
          style={{ background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer',
            fontSize: 12, color: isLast ? 'var(--color-dust)' : 'var(--color-slate)', padding: '0 2px', lineHeight: 1 }}
        >▼</button>
      </div>

      {/* Label + type */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
            {field.label}
          </span>
          <Badge variant={CATEGORY_BADGE[field.category] ?? 'default'}>
            {field.category}
          </Badge>
          {field.required && <Badge variant="error">required</Badge>}
          {field.showInList && <Badge variant="info">in list</Badge>}
          {field.showOnReceipt && <Badge variant="success">on receipt</Badge>}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>
          {FIELD_TYPE_LABELS[field.type]}
          {field.searchable && ' · searchable'}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Toggle checked={field.enabled} onChange={onToggle} size="sm" />
        <button
          onClick={onEdit}
          style={{
            background: 'var(--color-bone)', border: 'none',
            borderRadius: 8, padding: '6px 12px',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
            color: 'var(--color-ink)', fontFamily: 'var(--font-sans)',
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Edit / Create modal ───────────────────────────────────────────────────────

interface FieldEditorModalProps {
  open: boolean;
  field: StudentFieldDefinition | null; // null = create new
  onSave: (field: StudentFieldDefinition) => void;
  onClose: () => void;
  nextOrder: number;
}

function FieldEditorModal({ open, field, onSave, onClose, nextOrder }: FieldEditorModalProps) {
  const isNew = field === null;
  const [label, setLabel] = useState(field?.label ?? '');
  const [type, setType] = useState<FieldType>(field?.type ?? 'text');
  const [required, setRequired] = useState(field?.required ?? false);
  const [searchable, setSearchable] = useState(field?.searchable ?? false);
  const [showInList, setShowInList] = useState(field?.showInList ?? false);
  const [showOnReceipt, setShowOnReceipt] = useState(field?.showOnReceipt ?? false);
  const [options, setOptions] = useState<FieldOption[]>(field?.options ?? []);
  const [optionLabel, setOptionLabel] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    setLabel(field?.label ?? '');
    setType(field?.type ?? 'text');
    setRequired(field?.required ?? false);
    setSearchable(field?.searchable ?? false);
    setShowInList(field?.showInList ?? false);
    setShowOnReceipt(field?.showOnReceipt ?? false);
    setOptions(field?.options ?? []);
    setOptionLabel('');
    setError('');
  }, [field, open]);

  const needsOptions = type === 'select' || type === 'multiselect';

  const addOption = () => {
    if (!optionLabel.trim()) return;
    const id = generateId('opt');
    setOptions(prev => [...prev, { id, label: optionLabel.trim(), value: optionLabel.trim().toLowerCase().replace(/\s+/g, '_') }]);
    setOptionLabel('');
  };

  const removeOption = (id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const handleSave = () => {
    if (!label.trim()) { setError('Field label is required.'); return; }
    if (needsOptions && options.length === 0) { setError('Add at least one option.'); return; }

    const ts = now();
    const saved: StudentFieldDefinition = {
      id: field?.id ?? generateId('udf'),
      label: label.trim(),
      type,
      required,
      searchable,
      enabled: field?.enabled ?? true,
      showInList,
      showOnReceipt,
      options: needsOptions ? options : undefined,
      category: field?.category ?? 'custom',
      order: field?.order ?? nextOrder,
      createdAt: field?.createdAt ?? ts,
      updatedAt: ts,
    };
    onSave(saved);
  };

  const inputS: React.CSSProperties = {
    width: '100%', background: 'var(--color-white)',
    border: '1px solid rgba(20,20,19,0.22)', borderRadius: 10,
    padding: '9px 12px', fontFamily: 'var(--font-sans)',
    fontSize: 14, color: 'var(--color-ink)', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add Custom Field' : `Edit: ${field?.label}`}
      width={480}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: 14 }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 18px', fontSize: 14 }}>
            {isNew ? 'Add Field' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#b91c1c' }}>{error}</p>
          </div>
        )}

        <FormRow label="Field Label" required>
          <input
            style={inputS}
            value={label}
            onChange={e => { setLabel(e.target.value); setError(''); }}
            placeholder="e.g. Roll Number"
            autoFocus
          />
        </FormRow>

        <FormRow label="Field Type" required hint={isNew ? 'Cannot be changed after creation.' : undefined}>
          <select
            style={{ ...inputS, cursor: 'pointer' }}
            value={type}
            onChange={e => setType(e.target.value as FieldType)}
            disabled={!isNew}
          >
            {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FormRow>

        {needsOptions && (
          <FormRow label="Options" required hint="Options the user can pick from.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map(opt => (
                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--color-ink)', padding: '6px 0' }}>{opt.label}</span>
                  <button
                    onClick={() => removeOption(opt.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16, padding: '0 4px' }}
                  >✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputS, flex: 1 }}
                  value={optionLabel}
                  onChange={e => setOptionLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                  placeholder="Type option label and press Enter"
                />
                <button
                  onClick={addOption}
                  style={{ background: 'var(--color-ink)', color: 'var(--color-canvas)', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer', fontSize: 18, fontWeight: 300 }}
                >+</button>
              </div>
            </div>
          </FormRow>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormRow label="Required">
            <Toggle checked={required} onChange={setRequired} label={required ? 'Yes' : 'No'} />
          </FormRow>
          <FormRow label="Searchable">
            <Toggle checked={searchable} onChange={setSearchable} label={searchable ? 'Yes' : 'No'} />
          </FormRow>
          <FormRow label="Show in member list">
            <Toggle checked={showInList} onChange={setShowInList} label={showInList ? 'Yes' : 'No'} />
          </FormRow>
          <FormRow label="Show on receipt">
            <Toggle checked={showOnReceipt} onChange={setShowOnReceipt} label={showOnReceipt ? 'Yes' : 'No'} />
          </FormRow>
        </div>
      </div>
    </Modal>
  );
}

// ── Main FieldBuilder component ───────────────────────────────────────────────

export function FieldBuilder() {
  const { data: fields, loading, error, updateField, createCustomField, reorder, refetch } = useStudentFields();
  const [editingField, setEditingField] = useState<StudentFieldDefinition | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const handleToggle = async (field: StudentFieldDefinition, enabled: boolean) => {
    await updateField(field.id, { enabled });
    showSuccess(`"${field.label}" ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleMoveUp = async (fields: StudentFieldDefinition[], index: number) => {
    if (index === 0) return;
    const ids = fields.map(f => f.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorder(ids);
  };

  const handleMoveDown = async (fields: StudentFieldDefinition[], index: number) => {
    if (index === fields.length - 1) return;
    const ids = fields.map(f => f.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorder(ids);
  };

  const handleSaveField = async (updated: StudentFieldDefinition) => {
    setSaving(true);
    try {
      if (updated.category === 'custom' && !fields?.find(f => f.id === updated.id)) {
        // New custom field
        await createCustomField({
          label: updated.label,
          type: updated.type,
          required: updated.required,
          searchable: updated.searchable,
          enabled: updated.enabled,
          showInList: updated.showInList,
          showOnReceipt: updated.showOnReceipt,
          options: updated.options,
          order: updated.order,
        });
        showSuccess(`"${updated.label}" added`);
      } else {
        await updateField(updated.id, updated);
        showSuccess(`"${updated.label}" updated`);
      }
      setEditingField(undefined);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState emoji="⚠️" title="Failed to load fields"
        body="There was a problem reading your field configuration from the local database." />
    );
  }

  const fieldList = fields ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Member Fields
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-slate)', marginTop: 3 }}>
            Configure which fields are collected for each member. Toggle, reorder, or add your own.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setEditingField(null)}
          style={{ padding: '9px 18px', fontSize: 14, gap: 8 }}
        >
          + Add custom field
        </button>
      </div>

      {saveMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#15803d', fontWeight: 500,
        }}>
          ✓ {saveMsg}
        </div>
      )}

      {/* Field list */}
      <div style={{ border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden' }}>
        {fieldList.length === 0
          ? <EmptyState emoji="📋" title="No fields yet" body="Fields will appear here once the database initialises." />
          : fieldList.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              isFirst={index === 0}
              isLast={index === fieldList.length - 1}
              onToggle={enabled => handleToggle(field, enabled)}
              onEdit={() => setEditingField(field)}
              onMoveUp={() => handleMoveUp(fieldList, index)}
              onMoveDown={() => handleMoveDown(fieldList, index)}
            />
          ))
        }
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-dust)', marginTop: 12 }}>
        {fieldList.filter(f => f.enabled).length} of {fieldList.length} fields enabled
      </p>

      {/* Edit/Create modal */}
      <FieldEditorModal
        open={editingField !== undefined}
        field={editingField ?? null}
        onSave={handleSaveField}
        onClose={() => setEditingField(undefined)}
        nextOrder={fieldList.length}
      />

      {saving && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: 'var(--color-ink)', color: 'var(--color-canvas)',
          borderRadius: 12, padding: '10px 18px', fontSize: 14, display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <Spinner size={16} /> Saving…
        </div>
      )}
    </div>
  );
}

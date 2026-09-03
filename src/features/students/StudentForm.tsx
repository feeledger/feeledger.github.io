import { useState, useEffect } from 'react';
import { DynamicForm, validateForm, type DynamicFormValues } from '../../components/fields/DynamicForm';
import { Spinner } from '../../components/ui/index';
import { useStudentFields, useAllBatches, useSettings } from '../../hooks/useDB';
import { studentRepository } from '../../db/repositories/studentRepository';
import type { Student } from '../../types';

interface StudentFormProps {
  student?: Student;                   // undefined = create mode
  onSaved: (student: Student) => void;
  onCancel: () => void;
}

export function StudentForm({ student, onSaved, onCancel }: StudentFormProps) {
  const { data: fields } = useStudentFields();
  const { data: batches } = useAllBatches();
  const { data: settings } = useSettings();

  const [values, setValues] = useState<DynamicFormValues>(() => student?.values ?? {});
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(() => {
    if (!student) return [];
    return student.batchMemberships
      .filter(m => m.status === 'active')
      .map(m => m.batchId);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Pre-fill default values for new students
  useEffect(() => {
    if (!student && fields) {
      const defaults: DynamicFormValues = {};
      for (const f of fields) {
        if (f.defaultValue !== undefined) defaults[f.id] = f.defaultValue;
      }
      setValues(prev => ({ ...defaults, ...prev }));
    }
  }, [fields, student]);

  const handleSave = async () => {
    if (!fields) return;
    const enabledFields = fields.filter(f => f.enabled);
    const validationErrors = validateForm(enabledFields, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError('');

    try {
      if (student) {
        // Update existing
        await studentRepository.update(student.id, values);
        // Sync batch memberships
        const currentBatchIds = student.batchMemberships
          .filter(m => m.status === 'active')
          .map(m => m.batchId);
        const toAdd    = selectedBatchIds.filter(id => !currentBatchIds.includes(id));
        const toRemove = currentBatchIds.filter(id => !selectedBatchIds.includes(id));
        for (const batchId of toAdd)    await studentRepository.addToBatch(student.id, batchId);
        for (const batchId of toRemove) await studentRepository.removeFromBatch(student.id, batchId);
        const updated = await studentRepository.getById(student.id);
        if (updated) onSaved(updated);
      } else {
        // Create new
        const created = await studentRepository.create({ values, batchIds: selectedBatchIds });
        onSaved(created);
      }
    } catch (err) {
      setSaveError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleBatch = (batchId: string) => {
    setSelectedBatchIds(prev =>
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    );
  };

  const currency = settings?.defaultCurrency ?? 'INR';
  const activeBatches = (batches ?? []).filter(b => b.status === 'active');

  if (!fields) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div>
      {saveError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: '#b91c1c' }}>{saveError}</p>
        </div>
      )}

      {/* Dynamic fields grouped by category */}
      <DynamicForm
        fields={fields}
        values={values}
        onChange={setValues}
        errors={errors}
        currency={currency}
        groupByCategory
        enabledOnly
      />

      {/* Batch assignment */}
      {activeBatches.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--color-slate)',
            marginBottom: 14, paddingBottom: 8,
            borderBottom: '1px solid var(--color-dust)',
          }}>
            Batch Assignments
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {activeBatches.map(batch => {
              const active = selectedBatchIds.includes(batch.id);
              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => toggleBatch(batch.id)}
                  style={{
                    padding: '7px 16px', borderRadius: 999,
                    border: `1.5px solid ${active ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                    background: active ? 'var(--color-ink)' : 'var(--color-white)',
                    color: active ? 'var(--color-canvas)' : 'var(--color-ink)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {active ? '✓ ' : ''}{batch.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        marginTop: 32, paddingTop: 20,
        borderTop: '1px solid var(--color-dust)',
        display: 'flex', justifyContent: 'flex-end', gap: 10,
      }}>
        <button
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
          style={{ padding: '10px 22px', fontSize: 14 }}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 22px', fontSize: 14, gap: 8 }}
        >
          {saving ? <><Spinner size={16} /> Saving…</> : student ? 'Save Changes' : 'Add Member'}
        </button>
      </div>
    </div>
  );
}

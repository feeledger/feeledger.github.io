import { useState, useEffect } from 'react';
import { useAcademicYears, useSubjects } from '../../hooks/useDB';
import { batchRepository, academicYearRepository } from '../../db/repositories/batchRepository';
import { useSync } from '../../services/SyncContext';
import { Modal, FormRow, Spinner } from '../../components/ui/index';
import type { Batch } from '../../types';

interface BatchFormProps {
  open: boolean;
  batch?: Batch;           // undefined = create mode
  onSaved: (batch: Batch) => void;
  onClose: () => void;
}

const IS: React.CSSProperties = {
  width: '100%', background: 'var(--color-white)',
  border: '1px solid rgba(20,20,19,0.22)', borderRadius: 10,
  padding: '10px 13px', fontFamily: 'var(--font-sans)',
  fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
};

import React from 'react';

export function BatchForm({ open, batch, onSaved, onClose }: BatchFormProps) {
  const { data: academicYears, refetch: refetchYears } = useAcademicYears();
  const { enqueuePush } = useSync();
  const { data: subjects } = useSubjects();

  const [name, setName]                   = useState(batch?.name ?? '');
  const [academicYearId, setAcademicYearId] = useState(batch?.academicYearId ?? '');
  const [description, setDescription]    = useState(batch?.description ?? '');
  const [startDate, setStartDate]         = useState(batch?.startDate ?? '');
  const [endDate, setEndDate]             = useState(batch?.endDate ?? '');
  const [schedule, setSchedule]           = useState(batch?.schedule ?? '');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(batch?.subjectIds ?? []);
  const [newYearName, setNewYearName]     = useState('');
  const [addingYear, setAddingYear]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (!open) return;
    setName(batch?.name ?? '');
    setAcademicYearId(batch?.academicYearId ?? '');
    setDescription(batch?.description ?? '');
    setStartDate(batch?.startDate ?? '');
    setEndDate(batch?.endDate ?? '');
    setSchedule(batch?.schedule ?? '');
    setSelectedSubjectIds(batch?.subjectIds ?? []);
    setNewYearName('');
    setError('');
  }, [open, batch]);

  const toggleSubject = (id: string) =>
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const handleAddYear = async () => {
    if (!newYearName.trim()) return;
    setAddingYear(true);
    try {
      const created = await academicYearRepository.create(newYearName.trim());
      await refetchYears();
      setAcademicYearId(created.id);
      setNewYearName('');
    } finally {
      setAddingYear(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Batch name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (batch) {
        await batchRepository.update(batch.id, {
          name: name.trim(), academicYearId, description,
          startDate: startDate || undefined, endDate: endDate || undefined,
          schedule: schedule || undefined, subjectIds: selectedSubjectIds,
        });
        const updated = await batchRepository.getById(batch.id);
        if (updated) { enqueuePush(); onSaved(updated); }
      } else {
        enqueuePush();
        const created = await batchRepository.create({
          name: name.trim(), academicYearId, description,
          startDate: startDate || undefined, endDate: endDate || undefined,
          schedule: schedule || undefined, subjectIds: selectedSubjectIds,
          status: 'active',
        });
        onSaved(created);
      }
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={batch ? `Edit: ${batch.name}` : 'Create Batch'}
      width={500}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: 14, padding: '8px 18px' }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}
            style={{ fontSize: 14, padding: '8px 20px', gap: 8 }}>
            {saving ? <><Spinner size={14} /> Saving…</> : batch ? 'Save Changes' : 'Create Batch'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '9px 13px' }}>
            <p style={{ fontSize: 13, color: '#b91c1c' }}>{error}</p>
          </div>
        )}

        <FormRow label="Batch Name" required>
          <input style={IS} value={name} autoFocus
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Class 12 CBSE Morning — 2026" />
        </FormRow>

        {/* Academic Year */}
        <FormRow label="Academic Year" hint="Group batches by year for easier filtering">
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ ...IS, flex: 1, cursor: 'pointer' }}
              value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}>
              <option value="">— No year —</option>
              {(academicYears ?? []).map(ay => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
          {/* Quick-add year inline */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              style={{ ...IS, flex: 1, padding: '7px 11px', fontSize: 13 }}
              value={newYearName}
              onChange={e => setNewYearName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddYear(); } }}
              placeholder="Or type new year: 2026-2027" />
            <button
              onClick={handleAddYear}
              disabled={!newYearName.trim() || addingYear}
              style={{ background: 'var(--color-bone)', border: '1px solid var(--color-dust)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 13, color: 'var(--color-ink)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
              {addingYear ? '…' : '+ Add'}
            </button>
          </div>
        </FormRow>

        <FormRow label="Description">
          <input style={IS} value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Morning batch, Mon-Sat 7–9 AM" />
        </FormRow>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Start Date">
            <input style={IS} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormRow>
          <FormRow label="End Date">
            <input style={IS} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormRow>
        </div>

        <FormRow label="Schedule" hint="e.g. Mon/Wed/Fri 6–8 PM">
          <input style={IS} value={schedule}
            onChange={e => setSchedule(e.target.value)}
            placeholder="Mon/Wed/Fri 6–8 PM" />
        </FormRow>

        {/* Subjects */}
        {(subjects ?? []).length > 0 && (
          <FormRow label="Subjects" hint="Which subjects are taught in this batch">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(subjects ?? []).map(sub => {
                const active = selectedSubjectIds.includes(sub.id);
                return (
                  <button key={sub.id} type="button" onClick={() => toggleSubject(sub.id)} style={{
                    padding: '5px 13px', borderRadius: 999,
                    border: `1.5px solid ${active ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                    background: active ? 'var(--color-ink)' : 'var(--color-white)',
                    color: active ? 'var(--color-canvas)' : 'var(--color-ink)',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                  }}>
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </FormRow>
        )}
      </div>
    </Modal>
  );
}

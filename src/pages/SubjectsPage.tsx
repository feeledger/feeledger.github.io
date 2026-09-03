import { useState } from 'react';
import { useSubjects, useAcademicYears } from '../hooks/useDB';
import { subjectRepository, academicYearRepository } from '../db/repositories/batchRepository';
import { PageHeader, EmptyState, Spinner, Modal, SectionCard, FormRow } from '../components/ui/index';

const IS: React.CSSProperties = {
  width: '100%', background: 'var(--color-white)',
  border: '1px solid rgba(20,20,19,0.22)', borderRadius: 10,
  padding: '10px 13px', fontFamily: 'var(--font-sans)',
  fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
};

import React from 'react';

export function SubjectsPage() {
  const { data: subjects, loading: loadingSubjects, refetch: refetchSubjects } = useSubjects();
  const { data: academicYears, loading: loadingYears, refetch: refetchYears }   = useAcademicYears();

  // Subjects state
  const [newSubject, setNewSubject]       = useState('');
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string } | null>(null);
  const [archiveSubject, setArchiveSubject] = useState<{ id: string; name: string } | null>(null);
  const [subjectSaving, setSubjectSaving] = useState(false);

  // Academic years state
  const [newYear, setNewYear]           = useState('');
  const [editingYear, setEditingYear]   = useState<{ id: string; name: string } | null>(null);
  const [archiveYear, setArchiveYear]   = useState<{ id: string; name: string } | null>(null);
  const [yearSaving, setYearSaving]     = useState(false);

  // ── Subject actions ──────────────────────────────────────────────────────────

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    setSubjectSaving(true);
    try {
      await subjectRepository.create(newSubject.trim());
      refetchSubjects();
      setNewSubject('');
    } finally { setSubjectSaving(false); }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    setSubjectSaving(true);
    try {
      await subjectRepository.update(editingSubject.id, editingSubject.name);
      refetchSubjects();
      setEditingSubject(null);
    } finally { setSubjectSaving(false); }
  };

  const handleArchiveSubject = async () => {
    if (!archiveSubject) return;
    setSubjectSaving(true);
    try {
      await subjectRepository.archive(archiveSubject.id);
      refetchSubjects();
      setArchiveSubject(null);
    } finally { setSubjectSaving(false); }
  };

  // ── Academic year actions ────────────────────────────────────────────────────

  const handleAddYear = async () => {
    if (!newYear.trim()) return;
    setYearSaving(true);
    try {
      await academicYearRepository.create(newYear.trim());
      refetchYears();
      setNewYear('');
    } finally { setYearSaving(false); }
  };

  const handleUpdateYear = async () => {
    if (!editingYear) return;
    setYearSaving(true);
    try {
      await academicYearRepository.update(editingYear.id, { name: editingYear.name });
      refetchYears();
      setEditingYear(null);
    } finally { setYearSaving(false); }
  };

  const handleArchiveYear = async () => {
    if (!archiveYear) return;
    setYearSaving(true);
    try {
      await academicYearRepository.archive(archiveYear.id);
      refetchYears();
      setArchiveYear(null);
    } finally { setYearSaving(false); }
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 760, margin: '0 auto' }}>
      <PageHeader eyebrow="Organisation" title="Subjects & Academic Years" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Subjects ────────────────────────────────────────────────────────── */}
        <SectionCard
          title="Subjects"
          subtitle="Subjects that can be assigned to batches"
        >
          {loadingSubjects ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
              {(subjects ?? []).length === 0 ? (
                <EmptyState emoji="📚" title="No subjects yet" body="Add your first subject below." />
              ) : (
                <div style={{ border: '1px solid var(--color-dust)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                  {(subjects ?? []).map((sub, i) => (
                    <div key={sub.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderBottom: i < (subjects ?? []).length - 1 ? '1px solid var(--color-dust)' : 'none',
                      background: 'var(--color-white)',
                    }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{sub.name}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditingSubject({ id: sub.id, name: sub.name })}
                          style={{ background: 'var(--color-bone)', border: 'none', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--color-ink)' }}>
                          Edit
                        </button>
                        <button onClick={() => setArchiveSubject({ id: sub.id, name: sub.name })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}>
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Add new */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...IS, flex: 1 }}
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubject(); } }}
                  placeholder="Add subject (e.g. Physics)" />
                <button onClick={handleAddSubject} disabled={!newSubject.trim() || subjectSaving}
                  className="btn-primary" style={{ padding: '0 18px', fontSize: 14, whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Academic Years ───────────────────────────────────────────────────── */}
        <SectionCard
          title="Academic Years"
          subtitle="Group batches by academic year for easier filtering"
        >
          {loadingYears ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
              {(academicYears ?? []).length === 0 ? (
                <EmptyState emoji="📅" title="No academic years yet" body="Add your current academic year below." />
              ) : (
                <div style={{ border: '1px solid var(--color-dust)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                  {(academicYears ?? []).map((ay, i) => (
                    <div key={ay.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderBottom: i < (academicYears ?? []).length - 1 ? '1px solid var(--color-dust)' : 'none',
                      background: ay.status === 'archived' ? 'var(--color-canvas)' : 'var(--color-white)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: ay.status === 'archived' ? 'var(--color-slate)' : 'var(--color-ink)' }}>
                          {ay.name}
                        </p>
                        {ay.status === 'archived' && (
                          <span style={{ fontSize: 11, background: 'var(--color-bone)', borderRadius: 999, padding: '1px 7px', color: 'var(--color-slate)' }}>archived</span>
                        )}
                      </div>
                      {ay.status === 'active' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditingYear({ id: ay.id, name: ay.name })}
                            style={{ background: 'var(--color-bone)', border: 'none', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--color-ink)' }}>
                            Edit
                          </button>
                          <button onClick={() => setArchiveYear({ id: ay.id, name: ay.name })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}>
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Add new */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...IS, flex: 1 }}
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddYear(); } }}
                  placeholder="e.g. 2026-2027" />
                <button onClick={handleAddYear} disabled={!newYear.trim() || yearSaving}
                  className="btn-primary" style={{ padding: '0 18px', fontSize: 14, whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Edit subject modal ─────────────────────────────────────────────────── */}
      <Modal open={!!editingSubject} onClose={() => setEditingSubject(null)} title="Edit Subject" width={380}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingSubject(null)} style={{ fontSize: 14, padding: '8px 16px' }}>Cancel</button>
            <button className="btn-primary" onClick={handleUpdateSubject} disabled={subjectSaving} style={{ fontSize: 14, padding: '8px 18px' }}>
              {subjectSaving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <FormRow label="Subject Name" required>
          <input style={IS} autoFocus value={editingSubject?.name ?? ''}
            onChange={e => setEditingSubject(s => s ? { ...s, name: e.target.value } : null)}
            onKeyDown={e => { if (e.key === 'Enter') handleUpdateSubject(); }} />
        </FormRow>
      </Modal>

      {/* ── Archive subject modal ──────────────────────────────────────────────── */}
      <Modal open={!!archiveSubject} onClose={() => setArchiveSubject(null)} title="Archive Subject" width={380}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setArchiveSubject(null)} style={{ fontSize: 14, padding: '8px 16px' }}>Cancel</button>
            <button onClick={handleArchiveSubject} disabled={subjectSaving}
              style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-btn)', padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {subjectSaving ? 'Archiving…' : 'Archive'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.7 }}>
          Archive <strong>{archiveSubject?.name}</strong>? It will be removed from new batch creation but existing batches will keep it.
        </p>
      </Modal>

      {/* ── Edit year modal ────────────────────────────────────────────────────── */}
      <Modal open={!!editingYear} onClose={() => setEditingYear(null)} title="Edit Academic Year" width={380}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingYear(null)} style={{ fontSize: 14, padding: '8px 16px' }}>Cancel</button>
            <button className="btn-primary" onClick={handleUpdateYear} disabled={yearSaving} style={{ fontSize: 14, padding: '8px 18px' }}>
              {yearSaving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <FormRow label="Year Name" required>
          <input style={IS} autoFocus value={editingYear?.name ?? ''}
            onChange={e => setEditingYear(y => y ? { ...y, name: e.target.value } : null)}
            onKeyDown={e => { if (e.key === 'Enter') handleUpdateYear(); }} />
        </FormRow>
      </Modal>

      {/* ── Archive year modal ─────────────────────────────────────────────────── */}
      <Modal open={!!archiveYear} onClose={() => setArchiveYear(null)} title="Archive Academic Year" width={380}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setArchiveYear(null)} style={{ fontSize: 14, padding: '8px 16px' }}>Cancel</button>
            <button onClick={handleArchiveYear} disabled={yearSaving}
              style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-btn)', padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {yearSaving ? 'Archiving…' : 'Archive'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.7 }}>
          Archive <strong>{archiveYear?.name}</strong>? Existing batches in this year will remain but it will be hidden from filters.
        </p>
      </Modal>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { useStudents, useStudentFields, useAllBatches, useSettings } from '../hooks/useDB';
import { studentRepository } from '../db/repositories/studentRepository';
import { StudentForm } from '../features/students/StudentForm';
import { StudentProfile } from '../features/students/StudentProfile';
import { PageHeader, EmptyState, Spinner, Modal } from '../components/ui/index';
import type { Student } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number | unknown, currency = 'INR') {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return `${currency === 'INR' ? '₹' : currency}${n.toLocaleString('en-IN')}`;
}

// ── Student card (list row) ───────────────────────────────────────────────────

function StudentCard({
  student,
  listFields,
  batchNames,
  currency,
  onView,
}: {
  student: Student;
  listFields: { id: string; label: string }[];
  batchNames: string[];
  currency: string;
  onView: () => void;
}) {
  const name   = String(student.values['student_name'] ?? 'Unknown');
  const status = String(student.values['student_status'] ?? 'active');

  return (
    <div
      onClick={onView}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-dust)',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--color-canvas)')}
      onMouseOut={e  => (e.currentTarget.style.background = 'var(--color-white)')}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onView(); }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-canvas)', fontSize: 15, fontWeight: 700,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--color-bone)',
            color: status === 'active' ? '#15803d' : 'var(--color-slate)',
          }}>
            {status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
          {/* Show list fields */}
          {listFields.slice(0, 3).map(f => {
            const val = student.values[f.id];
            if (!val) return null;
            return (
              <p key={f.id} style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                {f.id === 'fee_amount' ? formatAmount(val, currency) : String(val)}
              </p>
            );
          })}
          {/* Batch chips */}
          {batchNames.slice(0, 2).map(name => (
            <span key={name} style={{
              fontSize: 11, background: 'var(--color-bone)',
              borderRadius: 999, padding: '1px 8px', color: 'var(--color-slate)',
            }}>
              {name}
            </span>
          ))}
        </div>
      </div>

      <span style={{ color: 'var(--color-dust)', fontSize: 18, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main StudentsPage ─────────────────────────────────────────────────────────

type PanelMode = 'list' | 'view' | 'add' | 'edit';

export function StudentsPage() {
  const { data: students, loading, refetch } = useStudents();
  const { data: fields } = useStudentFields();
  const { data: batches } = useAllBatches();
  const { data: settings } = useSettings();

  const [mode, setMode]               = useState<PanelMode>('list');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);
  const [archiving, setArchiving] = useState(false);

  const currency = settings?.defaultCurrency ?? 'INR';

  // Fields to show in the list view
  const listFields = useMemo(() =>
    (fields ?? []).filter(f => f.enabled && f.showInList && f.id !== 'student_name' && f.id !== 'student_status'),
    [fields]
  );

  // Searchable field IDs
  const searchableIds = useMemo(() =>
    (fields ?? []).filter(f => f.searchable).map(f => f.id),
    [fields]
  );

  // Filter + search students
  const filtered = useMemo(() => {
    let list = students ?? [];

    if (filterStatus) {
      list = list.filter(s => String(s.values['student_status'] ?? 'active') === filterStatus);
    }

    if (filterBatch) {
      list = list.filter(s =>
        s.batchMemberships.some(m => m.batchId === filterBatch && m.status === 'active')
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        searchableIds.some(id => String(s.values[id] ?? '').toLowerCase().includes(q)) ||
        String(s.values['student_name'] ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [students, search, filterBatch, filterStatus, searchableIds]);

  const getBatchNames = useCallback((student: Student) =>
    student.batchMemberships
      .filter(m => m.status === 'active')
      .map(m => batches?.find(b => b.id === m.batchId)?.name ?? '')
      .filter(Boolean),
    [batches]
  );

  const selectedStudent = useMemo(() =>
    selectedId ? (students ?? []).find(s => s.id === selectedId) : undefined,
    [selectedId, students]
  );

  const handleSaved = (student: Student) => {
    refetch();
    setSelectedId(student.id);
    setMode('view');
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await studentRepository.archive(archiveTarget.id);
      refetch();
      if (selectedId === archiveTarget.id) setMode('list');
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  const activeBatches = (batches ?? []).filter(b => b.status === 'active');

  // ── Panel: list ──────────────────────────────────────────────────────────────

  if (mode === 'add') {
    return (
      <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 680, margin: '0 auto' }}>
        <PageHeader title="Add Member" eyebrow="Members" />
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-dust)', borderRadius: 20, padding: 'clamp(20px, 4vw, 32px)' }}>
          <StudentForm
            onSaved={handleSaved}
            onCancel={() => setMode('list')}
          />
        </div>
      </div>
    );
  }

  if (mode === 'edit' && selectedStudent) {
    return (
      <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 680, margin: '0 auto' }}>
        <PageHeader title="Edit Member" eyebrow="Members" />
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-dust)', borderRadius: 20, padding: 'clamp(20px, 4vw, 32px)' }}>
          <StudentForm
            student={selectedStudent}
            onSaved={handleSaved}
            onCancel={() => setMode('view')}
          />
        </div>
      </div>
    );
  }

  if (mode === 'view' && selectedId) {
    return (
      <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setMode('list')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Members
          </button>
          <div style={{ flex: 1 }} />
          {selectedStudent && (
            <button
              onClick={() => setArchiveTarget(selectedStudent)}
              style={{ background: 'none', border: '1px solid var(--color-dust)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}
            >
              Archive
            </button>
          )}
        </div>
        <StudentProfile
          studentId={selectedId}
          onEdit={() => setMode('edit')}
          onBack={() => setMode('list')}
        />
      </div>
    );
  }

  // Default: list view
  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <PageHeader
        eyebrow="Members"
        title="Members"
        subtitle={`${students?.length ?? 0} member${(students?.length ?? 0) !== 1 ? 's' : ''}`}
        action={
          <button className="btn-primary" onClick={() => setMode('add')} style={{ padding: '10px 20px', fontSize: 14, gap: 8 }}>
            + Add Member
          </button>
        }
      />

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--color-dust)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone…"
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              border: '1px solid var(--color-dust)', borderRadius: 12,
              fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
              background: 'var(--color-white)', boxSizing: 'border-box',
            }}
          />
        </div>

        {activeBatches.length > 0 && (
          <select
            value={filterBatch}
            onChange={e => setFilterBatch(e.target.value)}
            style={{
              flex: '0 1 180px', padding: '10px 14px',
              border: '1px solid var(--color-dust)', borderRadius: 12,
              fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
              background: 'var(--color-white)', cursor: 'pointer',
            }}
          >
            <option value="">All batches</option>
            {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            flex: '0 1 150px', padding: '10px 14px',
            border: '1px solid var(--color-dust)', borderRadius: 12,
            fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
            background: 'var(--color-white)', cursor: 'pointer',
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji={search || filterBatch || filterStatus ? '🔍' : '🧑‍🎓'}
          title={search || filterBatch || filterStatus ? 'No members found' : 'No members yet'}
          body={search || filterBatch || filterStatus
            ? 'Try a different search term or filter.'
            : 'Add your first member to get started.'
          }
          action={
            !search && !filterBatch && !filterStatus
              ? <button className="btn-primary" onClick={() => setMode('add')} style={{ padding: '10px 20px' }}>+ Add Member</button>
              : undefined
          }
        />
      ) : (
        <div style={{ border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Column headers */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '10px 16px', background: 'var(--color-canvas)',
            borderBottom: '1px solid var(--color-dust)',
          }}>
            <div style={{ width: 40, flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Name / Status
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 24 }}>
              {filtered.length} results
            </p>
          </div>

          {filtered.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              listFields={listFields}
              batchNames={getBatchNames(student)}
              currency={currency}
              onView={() => { setSelectedId(student.id); setMode('view'); }}
            />
          ))}
        </div>
      )}

      {/* Archive confirm modal */}
      <Modal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Member"
        width={400}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setArchiveTarget(null)} style={{ fontSize: 14, padding: '8px 18px' }}>
              Cancel
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              style={{
                background: '#b91c1c', color: 'white', border: 'none',
                borderRadius: 'var(--radius-btn)', padding: '8px 18px',
                cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500,
              }}
            >
              {archiving ? 'Archiving…' : 'Archive Member'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.7 }}>
          Archive <strong>{String(archiveTarget?.values['student_name'] ?? 'this member')}</strong>?
          Their payment history will be preserved. You can restore them from Settings → Data.
        </p>
      </Modal>
    </div>
  );
}

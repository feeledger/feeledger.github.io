import { useState, useMemo } from 'react';
import { useAllBatches, useAcademicYears, useSubjects, useStudentsByBatch } from '../hooks/useDB';
import { batchRepository } from '../db/repositories/batchRepository';
import { BatchForm } from '../features/batches/BatchForm';
import { PageHeader, EmptyState, Spinner, Modal, SectionCard } from '../components/ui/index';
import type { Batch } from '../types';

// ── Batch detail panel ────────────────────────────────────────────────────────

function BatchDetail({
  batch,
  subjectNames,
  academicYearName,
  onEdit,
  onArchive,
}: {
  batch: Batch;
  subjectNames: string[];
  academicYearName: string;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { data: members, loading } = useStudentsByBatch(batch.id);

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-ink)', borderRadius: 24,
        padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Batch
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-canvas)', letterSpacing: '-0.02em' }}>
              {batch.name}
            </h2>
            {academicYearName && (
              <span style={{
                marginTop: 8, display: 'inline-block',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 999, padding: '2px 10px', fontSize: 12,
              }}>
                {academicYearName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} className="btn-secondary"
              style={{ fontSize: 13, padding: '8px 14px', borderColor: 'rgba(255,255,255,0.25)', color: 'var(--color-canvas)', background: 'transparent' }}>
              ✏️ Edit
            </button>
            <button onClick={onArchive}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)' }}>
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Members',    value: loading ? '…' : String(members?.length ?? 0) },
          { label: 'Start',      value: formatDate(batch.startDate) },
          { label: 'End',        value: formatDate(batch.endDate) },
          { label: 'Status',     value: batch.status },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-white)', border: '1px solid var(--color-dust)',
            borderRadius: 16, padding: '14px 18px',
          }}>
            <p style={{ fontSize: 11, color: 'var(--color-slate)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Batch info */}
      <SectionCard title="Batch Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {batch.description && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Description</p>
              <p style={{ fontSize: 14, color: 'var(--color-ink)' }}>{batch.description}</p>
            </div>
          )}
          {batch.schedule && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Schedule</p>
              <p style={{ fontSize: 14, color: 'var(--color-ink)' }}>{batch.schedule}</p>
            </div>
          )}
          {subjectNames.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Subjects</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subjectNames.map(name => (
                  <span key={name} style={{
                    background: 'var(--color-bone)', borderRadius: 999,
                    padding: '3px 10px', fontSize: 12, color: 'var(--color-ink)',
                  }}>{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Member list */}
      <SectionCard title="Members" subtitle={`${members?.length ?? 0} active members`}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
        ) : (members ?? []).length === 0 ? (
          <EmptyState emoji="🧑‍🎓" title="No members in this batch yet"
            body="Assign members to this batch from the Members section." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(members ?? []).map((student, i) => {
              const name  = String(student.values['student_name'] ?? 'Unknown');
              const phone = String(student.values['parent_phone'] ?? student.values['whatsapp_number'] ?? '');
              return (
                <div key={student.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 0',
                  borderBottom: i < (members ?? []).length - 1 ? '1px solid var(--color-dust)' : 'none',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-canvas)', border: '1px solid var(--color-dust)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--color-ink)',
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{name}</p>
                    {phone && <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{phone}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Batch card ────────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  academicYearName,
  subjectNames,
  onClick,
}: {
  batch: Batch;
  academicYearName: string;
  subjectNames: string[];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-dust)',
        borderRadius: 20, padding: '20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4, letterSpacing: '-0.01em' }}>
            {batch.name}
          </h3>
          {academicYearName && (
            <span style={{ fontSize: 11, color: 'var(--color-slate)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {academicYearName}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
          background: batch.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--color-bone)',
          color: batch.status === 'active' ? '#15803d' : 'var(--color-slate)',
        }}>
          {batch.status}
        </span>
      </div>

      {batch.schedule && (
        <p style={{ fontSize: 12, color: 'var(--color-slate)', marginBottom: 10 }}>🕐 {batch.schedule}</p>
      )}
      {batch.description && (
        <p style={{ fontSize: 12, color: 'var(--color-slate)', marginBottom: 10 }}>{batch.description}</p>
      )}

      {subjectNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {subjectNames.slice(0, 4).map(name => (
            <span key={name} style={{
              background: 'var(--color-bone)', borderRadius: 999,
              padding: '2px 8px', fontSize: 11, color: 'var(--color-slate)',
            }}>{name}</span>
          ))}
          {subjectNames.length > 4 && (
            <span style={{ fontSize: 11, color: 'var(--color-dust)', padding: '2px 4px' }}>
              +{subjectNames.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main BatchesPage ──────────────────────────────────────────────────────────

export function BatchesPage() {
  const { data: batches, loading, refetch } = useAllBatches();
  const { data: academicYears }             = useAcademicYears();
  const { data: subjects }                  = useSubjects();

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [formOpen, setFormOpen]         = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | undefined>(undefined);
  const [filterYear, setFilterYear]     = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null);
  const [archiving, setArchiving]       = useState(false);

  const selectedBatch = useMemo(() =>
    selectedId ? (batches ?? []).find(b => b.id === selectedId) : undefined,
    [selectedId, batches]
  );

  const getAcademicYearName = (id: string) =>
    academicYears?.find(ay => ay.id === id)?.name ?? '';

  const getSubjectNames = (ids: string[]) =>
    ids.map(id => subjects?.find(s => s.id === id)?.name ?? '').filter(Boolean);

  const filtered = useMemo(() => {
    let list = batches ?? [];
    if (filterYear) list = list.filter(b => b.academicYearId === filterYear);
    return list;
  }, [batches, filterYear]);

  const activeBatches   = filtered.filter(b => b.status === 'active');
  const archivedBatches = filtered.filter(b => b.status === 'archived');

  const handleSaved = (batch: Batch) => {
    refetch();
    setFormOpen(false);
    setEditingBatch(undefined);
    setSelectedId(batch.id);
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await batchRepository.archive(archiveTarget.id);
      refetch();
      if (selectedId === archiveTarget.id) setSelectedId(null);
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  // Detail view
  if (selectedBatch) {
    return (
      <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <button onClick={() => setSelectedId(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Batches
          </button>
        </div>
        <BatchDetail
          batch={selectedBatch}
          subjectNames={getSubjectNames(selectedBatch.subjectIds)}
          academicYearName={getAcademicYearName(selectedBatch.academicYearId)}
          onEdit={() => { setEditingBatch(selectedBatch); setFormOpen(true); }}
          onArchive={() => setArchiveTarget(selectedBatch)}
        />

        {/* Edit form */}
        <BatchForm
          open={formOpen}
          batch={editingBatch}
          onSaved={handleSaved}
          onClose={() => { setFormOpen(false); setEditingBatch(undefined); }}
        />

        {/* Archive confirm */}
        <Modal
          open={!!archiveTarget}
          onClose={() => setArchiveTarget(null)}
          title="Archive Batch"
          width={400}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setArchiveTarget(null)} style={{ fontSize: 14, padding: '8px 18px' }}>Cancel</button>
              <button onClick={handleArchive} disabled={archiving}
                style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-btn)', padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                {archiving ? 'Archiving…' : 'Archive Batch'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.7 }}>
            Archive <strong>{archiveTarget?.name}</strong>? Existing member memberships will be preserved. You can unarchive later from Settings.
          </p>
        </Modal>
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
      <PageHeader
        eyebrow="Organisation"
        title="Batches"
        subtitle={`${activeBatches.length} active batch${activeBatches.length !== 1 ? 'es' : ''}`}
        action={
          <button className="btn-primary" onClick={() => { setEditingBatch(undefined); setFormOpen(true); }}
            style={{ padding: '10px 20px', fontSize: 14, gap: 8 }}>
            + New Batch
          </button>
        }
      />

      {/* Academic year filter */}
      {(academicYears ?? []).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterYear('')}
            style={{ padding: '7px 16px', borderRadius: 999, border: `1.5px solid ${!filterYear ? 'var(--color-ink)' : 'var(--color-dust)'}`, background: !filterYear ? 'var(--color-ink)' : 'var(--color-white)', color: !filterYear ? 'var(--color-canvas)' : 'var(--color-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            All years
          </button>
          {(academicYears ?? []).map(ay => (
            <button key={ay.id} onClick={() => setFilterYear(ay.id)}
              style={{ padding: '7px 16px', borderRadius: 999, border: `1.5px solid ${filterYear === ay.id ? 'var(--color-ink)' : 'var(--color-dust)'}`, background: filterYear === ay.id ? 'var(--color-ink)' : 'var(--color-white)', color: filterYear === ay.id ? 'var(--color-canvas)' : 'var(--color-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {ay.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>
      ) : activeBatches.length === 0 && archivedBatches.length === 0 ? (
        <EmptyState emoji="🗂️" title="No batches yet"
          body="Create your first batch to organise members by class, plan, or any group."
          action={
            <button className="btn-primary" onClick={() => { setEditingBatch(undefined); setFormOpen(true); }} style={{ padding: '10px 20px' }}>
              + Create First Batch
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {activeBatches.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                Active ({activeBatches.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
                {activeBatches.map(batch => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    academicYearName={getAcademicYearName(batch.academicYearId)}
                    subjectNames={getSubjectNames(batch.subjectIds)}
                    onClick={() => setSelectedId(batch.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {archivedBatches.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-dust)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                Archived ({archivedBatches.length})
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
                {archivedBatches.map(batch => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    academicYearName={getAcademicYearName(batch.academicYearId)}
                    subjectNames={getSubjectNames(batch.subjectIds)}
                    onClick={() => setSelectedId(batch.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      <BatchForm
        open={formOpen && !selectedBatch}
        batch={editingBatch}
        onSaved={handleSaved}
        onClose={() => { setFormOpen(false); setEditingBatch(undefined); }}
      />
    </div>
  );
}

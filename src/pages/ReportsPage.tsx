import { useState, useMemo } from 'react';
import { usePayments, useStudents, useAllBatches, useAcademicYears, useSettings } from '../hooks/useDB';
import { PageHeader, Spinner, EmptyState } from '../components/ui/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFull(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = rows.map(row => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Filter controls ───────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  flex: '0 1 180px',
  padding: '9px 12px',
  border: '1px solid var(--color-dust)',
  borderRadius: 10,
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
  background: 'var(--color-white)',
  cursor: 'pointer',
  color: 'var(--color-ink)',
};

const inputStyle: React.CSSProperties = {
  flex: '0 1 150px',
  padding: '9px 12px',
  border: '1px solid var(--color-dust)',
  borderRadius: 10,
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
  background: 'var(--color-white)',
  color: 'var(--color-ink)',
};

import React from 'react';

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--color-white)',
      border: '1px solid var(--color-dust)',
      borderRadius: 16, padding: '16px 18px',
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-ink)', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ── Main ReportsPage ──────────────────────────────────────────────────────────

export function ReportsPage() {
  const { data: payments, loading } = usePayments();
  const { data: students }          = useStudents();
  const { data: batches }           = useAllBatches();
  const { data: academicYears }     = useAcademicYears();
  const { data: settings }          = useSettings();

  const currency     = settings?.defaultCurrency ?? 'INR';
  const paymentModes = (settings?.paymentModes ?? []).filter(m => m.enabled);

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [filterMode,   setFilterMode]   = useState('');
  const [filterBatch,  setFilterBatch]  = useState('');
  const [filterStudent,setFilterStudent]= useState('');
  const [filterYear,   setFilterYear]   = useState('');
  const [sortField,    setSortField]    = useState<'date' | 'amount' | 'name'>('date');
  const [sortDir,      setSortDir]      = useState<'desc' | 'asc'>('desc');

  // ── Lookup helpers ─────────────────────────────────────────────────────────────
  const getStudentName = (id: string) =>
    String(students?.find(s => s.id === id)?.values['student_name'] ?? 'Unknown');
  const getBatchName   = (id?: string) =>
    id ? (batches?.find(b => b.id === id)?.name ?? '') : '';
  const getBatchYear   = (batchId?: string) => {
    if (!batchId) return '';
    const batch = batches?.find(b => b.id === batchId);
    return batch?.academicYearId
      ? (academicYears?.find(ay => ay.id === batch.academicYearId)?.name ?? '')
      : '';
  };

  // ── Filtered + sorted payments ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = payments ?? [];
    if (dateFrom)     list = list.filter(p => p.paymentDate >= dateFrom);
    if (dateTo)       list = list.filter(p => p.paymentDate <= dateTo);
    if (filterMode)   list = list.filter(p => p.paymentMode === filterMode);
    if (filterBatch)  list = list.filter(p => p.batchId === filterBatch);
    if (filterStudent)list = list.filter(p => p.studentId === filterStudent);
    if (filterYear) {
      const batchIds = (batches ?? [])
        .filter(b => b.academicYearId === filterYear)
        .map(b => b.id);
      list = list.filter(p => p.batchId && batchIds.includes(p.batchId));
    }

    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date')   cmp = a.paymentDate.localeCompare(b.paymentDate);
      if (sortField === 'amount') cmp = a.amount - b.amount;
      if (sortField === 'name')   cmp = getStudentName(a.studentId).localeCompare(getStudentName(b.studentId));
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, dateFrom, dateTo, filterMode, filterBatch, filterStudent, filterYear, sortField, sortDir]);

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);
  const avgAmount   = filtered.length > 0 ? totalAmount / filtered.length : 0;

  const modeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of filtered) map[p.paymentMode] = (map[p.paymentMode] ?? 0) + p.amount;
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  // ── CSV export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const header = [
      'Receipt No', 'Date', 'Member Name', 'Batch', 'Academic Year',
      'Amount', 'Currency', 'Mode', 'Purpose', 'Notes',
    ];
    const rows = filtered.map(p => [
      p.receiptId ? `#${p.receiptId.slice(0, 8)}` : '',
      p.paymentDate,
      getStudentName(p.studentId),
      getBatchName(p.batchId),
      getBatchYear(p.batchId),
      String(p.amount),
      p.currency,
      p.paymentMode,
      p.purpose ?? '',
      p.notes ?? '',
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    exportCSV([header, ...rows], `FeeLedger-Report-${dateStr}.csv`);
  };

  // ── Student CSV export ────────────────────────────────────────────────────────
  const handleExportStudentsCSV = () => {
    const header = ['Name', 'Status', 'Batch', 'Phone', 'WhatsApp', 'Class/Grade', 'Admission Date'];
    const rows = (students ?? []).map(s => [
      String(s.values['student_name'] ?? ''),
      String(s.values['student_status'] ?? 'active'),
      s.batchMemberships.filter(m => m.status === 'active')
        .map(m => getBatchName(m.batchId)).filter(Boolean).join('; '),
      String(s.values['parent_phone'] ?? ''),
      String(s.values['whatsapp_number'] ?? ''),
      String(s.values['class_grade'] ?? ''),
      String(s.values['admission_date'] ?? ''),
    ]);
    exportCSV([header, ...rows], `FeeLedger-Members-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // ── Sort toggle helper ────────────────────────────────────────────────────────
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const sortIcon = (field: typeof sortField) =>
    sortField === field ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  const hasFilters = !!(dateFrom || dateTo || filterMode || filterBatch || filterStudent || filterYear);
  const activeBatches = (batches ?? []).filter(b => b.status === 'active');

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
      <PageHeader
        eyebrow="Reports"
        title="Fee Collection Report"
        subtitle="Analyse and export your payment data"
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={handleExportStudentsCSV}
              disabled={!students?.length}
              style={{ fontSize: 13, padding: '9px 16px', gap: 6 }}
            >
              ⬇ Members CSV
            </button>
            <button
              className="btn-primary"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              style={{ fontSize: 13, padding: '9px 16px', gap: 6 }}
            >
              ⬇ Export CSV
            </button>
          </div>
        }
      />

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={inputStyle} title="From date" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={inputStyle} title="To date" />

        {paymentModes.length > 0 && (
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={selectStyle}>
            <option value="">All modes</option>
            {paymentModes.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        )}

        {activeBatches.length > 0 && (
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={selectStyle}>
            <option value="">All batches</option>
            {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {(academicYears ?? []).length > 0 && (
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selectStyle}>
            <option value="">All years</option>
            {(academicYears ?? []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
          </select>
        )}

        <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} style={{ ...selectStyle, flex: '0 1 200px' }}>
          <option value="">All members</option>
          {(students ?? []).map(s => (
            <option key={s.id} value={s.id}>{String(s.values['student_name'] ?? 'Unknown')}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setFilterMode(''); setFilterBatch(''); setFilterStudent(''); setFilterYear(''); }}
            style={{ background: 'none', border: '1px solid var(--color-dust)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px),1fr))', gap: 12, marginBottom: 24 }}>
            <SummaryCard
              label="Total"
              value={fmtFull(totalAmount, currency)}
              sub={`${filtered.length} payment${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
            />
            <SummaryCard
              label="Average"
              value={filtered.length > 0 ? fmtFull(avgAmount, currency) : '—'}
              sub="per payment"
            />
            {modeBreakdown.slice(0, 2).map(([mode, amount]) => (
              <SummaryCard
                key={mode}
                label={mode.replace('_', ' ')}
                value={fmtFull(amount, currency)}
                sub={`${Math.round((amount / totalAmount) * 100)}% of total`}
              />
            ))}
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <EmptyState
              emoji="📊"
              title={hasFilters ? 'No payments match these filters' : 'No payments yet'}
              body={hasFilters ? 'Try adjusting the date range or clearing some filters.' : 'Payments will appear here once you start recording them.'}
            />
          ) : (
            <div style={{ border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--color-canvas)' }}>
                    {[
                      { key: 'date',   label: 'Date' },
                      { key: 'name',   label: 'Member' },
                      { key: 'none',   label: 'Batch' },
                      { key: 'none2',  label: 'Mode' },
                      { key: 'none3',  label: 'Purpose' },
                      { key: 'amount', label: 'Amount' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.key !== 'none' && col.key !== 'none2' && col.key !== 'none3'
                          ? toggleSort(col.key as typeof sortField) : undefined}
                        style={{
                          textAlign: col.key === 'amount' ? 'right' : 'left',
                          padding: '10px 14px',
                          fontSize: 11, fontWeight: 700,
                          color: 'var(--color-slate)',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                          cursor: col.key.startsWith('none') ? 'default' : 'pointer',
                          userSelect: 'none',
                          borderBottom: '1px solid var(--color-dust)',
                        }}
                      >
                        {col.label}{col.key !== 'none' && col.key !== 'none2' && col.key !== 'none3' ? sortIcon(col.key as typeof sortField) : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment, i) => (
                    <tr
                      key={payment.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--color-white)' : 'var(--color-canvas)',
                        borderBottom: '1px solid var(--color-dust)',
                      }}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                        {fmtDate(payment.paymentDate)}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
                        {getStudentName(payment.studentId)}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                        {getBatchName(payment.batchId) || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--color-slate)', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: 'var(--color-bone)', borderRadius: 999,
                          padding: '2px 8px', fontSize: 12,
                        }}>
                          {payment.paymentMode.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--color-slate)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {payment.purpose || '—'}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {fmtFull(payment.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-canvas)', borderTop: '2px solid var(--color-dust)' }}>
                    <td colSpan={5} style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>
                      Total — {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', textAlign: 'right' }}>
                      {fmtFull(totalAmount, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

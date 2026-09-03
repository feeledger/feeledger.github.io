import { useState, useMemo } from 'react';
import { usePayments, useStudents, useAllBatches, useSettings } from '../hooks/useDB';
import { paymentRepository } from '../db/repositories/paymentRepository';
import { ReceivePaymentForm, type PaymentResult } from '../features/payments/ReceivePaymentForm';
import { PageHeader, EmptyState, Spinner, Modal, Badge } from '../components/ui/index';
import type { Payment } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Payment success screen ────────────────────────────────────────────────────

function PaymentSuccess({
  result,
  onDone,
  onNewPayment,
}: {
  result: PaymentResult;
  onDone: () => void;
  onNewPayment: () => void;
}) {
  const currency = 'INR';
  const studentName = String(result.student.values['student_name'] ?? 'Member');

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
        Payment recorded!
      </h2>
      <p style={{ fontSize: 15, color: 'var(--color-slate)', marginBottom: 28 }}>
        {formatAmount(result.payment.amount, currency)} from <strong>{studentName}</strong>
      </p>

      {/* Receipt card preview */}
      <div style={{
        background: 'var(--color-ink)', borderRadius: 20, padding: '20px 24px',
        textAlign: 'left', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <svg viewBox="0 0 340 160" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }} aria-hidden="true">
          <path d="M-20 140 Q170 -10 360 100" stroke="var(--color-signal-light)" strokeWidth="1.5" fill="none"/>
        </svg>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--color-signal-light)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            {result.receipt.receiptNumber}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 3 }}>Member</p>
              <p style={{ color: 'var(--color-canvas)', fontWeight: 600 }}>{studentName}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 3 }}>Mode</p>
              <p style={{ color: 'var(--color-canvas)', fontWeight: 600 }}>{result.payment.paymentMode}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 3 }}>Date</p>
              <p style={{ color: 'var(--color-canvas)', fontWeight: 600 }}>{formatDate(result.payment.paymentDate)}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 3 }}>Amount</p>
              <p style={{ color: 'var(--color-canvas)', fontWeight: 700, fontSize: 18 }}>
                {formatAmount(result.payment.amount, currency)}
              </p>
            </div>
          </div>
          {result.payment.purpose && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 12 }}>
              {result.payment.purpose}
            </p>
          )}
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-slate)', marginBottom: 24 }}>
        Receipt saved locally. Drive sync happens in Phase 10.
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={onNewPayment} style={{ fontSize: 14, padding: '11px 22px' }}>
          + New Payment
        </button>
        <button className="btn-primary" onClick={onDone} style={{ fontSize: 14, padding: '11px 28px' }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({
  payment,
  studentName,
  batchName,
  currency,
  onArchive,
}: {
  payment: Payment;
  studentName: string;
  batchName: string;
  currency: string;
  onArchive: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 16px',
      borderBottom: '1px solid var(--color-dust)',
      background: 'var(--color-white)',
    }}>
      {/* Amount */}
      <div style={{ flexShrink: 0, minWidth: 90, textAlign: 'right' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
          {formatAmount(payment.amount, currency)}
        </p>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {studentName}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>
          {formatDate(payment.paymentDate)} · {payment.paymentMode}
          {batchName ? ` · ${batchName}` : ''}
          {payment.purpose ? ` · ${payment.purpose}` : ''}
        </p>
      </div>

      {/* Receipt badge */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {payment.receiptId && (
          <Badge variant="success">Receipt</Badge>
        )}
        <button
          onClick={onArchive}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-dust)', padding: 4, lineHeight: 1 }}
          title="Archive payment"
          aria-label="Archive payment"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Main PaymentsPage ─────────────────────────────────────────────────────────

type PageMode = 'list' | 'receive' | 'success';

export function PaymentsPage() {
  const { data: payments, loading, refetch } = usePayments();
  const { data: students }  = useStudents();
  const { data: batches }   = useAllBatches();
  const { data: settings }  = useSettings();

  const [mode, setMode]           = useState<PageMode>('list');
  const [successResult, setSuccessResult] = useState<PaymentResult | null>(null);

  // Filters
  const [filterMode, setFilterMode]   = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  // Archive confirm
  const [archiveTarget, setArchiveTarget] = useState<Payment | null>(null);
  const [archiving, setArchiving]         = useState(false);

  const currency     = settings?.defaultCurrency ?? 'INR';
  const paymentModes = (settings?.paymentModes ?? []).filter(m => m.enabled);
  const activeBatches = (batches ?? []).filter(b => b.status === 'active');

  const getStudentName = (studentId: string) =>
    String(students?.find(s => s.id === studentId)?.values['student_name'] ?? 'Unknown');

  const getBatchName = (batchId?: string) =>
    batchId ? (batches?.find(b => b.id === batchId)?.name ?? '') : '';

  // Apply filters
  const filtered = useMemo(() => {
    let list = payments ?? [];
    if (filterMode)  list = list.filter(p => p.paymentMode === filterMode);
    if (filterBatch) list = list.filter(p => p.batchId === filterBatch);
    if (dateFrom)    list = list.filter(p => p.paymentDate >= dateFrom);
    if (dateTo)      list = list.filter(p => p.paymentDate <= dateTo);
    return list;
  }, [payments, filterMode, filterBatch, dateFrom, dateTo]);

  const totalFiltered = useMemo(() =>
    filtered.reduce((sum, p) => sum + p.amount, 0),
    [filtered]
  );

  const handleComplete = (result: PaymentResult) => {
    setSuccessResult(result);
    setMode('success');
    refetch();
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await paymentRepository.archive(archiveTarget.id);
      refetch();
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  // ── Receive payment view ───────────────────────────────────────────────────

  if (mode === 'receive') {
    return (
      <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 600, margin: '0 auto' }}>
        <PageHeader eyebrow="Payments" title="Receive Payment" />
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-dust)', borderRadius: 24, padding: 'clamp(20px,4vw,32px)' }}>
          <ReceivePaymentForm
            onComplete={handleComplete}
            onCancel={() => setMode('list')}
          />
        </div>
      </div>
    );
  }

  // ── Success view ───────────────────────────────────────────────────────────

  if (mode === 'success' && successResult) {
    return (
      <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-dust)', borderRadius: 24, padding: 'clamp(20px,4vw,32px)' }}>
          <PaymentSuccess
            result={successResult}
            onDone={() => { setSuccessResult(null); setMode('list'); }}
            onNewPayment={() => { setSuccessResult(null); setMode('receive'); }}
          />
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
      <PageHeader
        eyebrow="Payments"
        title="Payments"
        subtitle={`${payments?.length ?? 0} payment${(payments?.length ?? 0) !== 1 ? 's' : ''}`}
        action={
          <button className="btn-primary" onClick={() => setMode('receive')}
            style={{ padding: '10px 20px', fontSize: 14, gap: 8, borderRadius: 'var(--radius-pill)' }}>
            💸 Receive Payment
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {paymentModes.length > 0 && (
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            style={{ flex: '0 1 160px', padding: '9px 12px', border: '1px solid var(--color-dust)', borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', background: 'var(--color-white)', cursor: 'pointer' }}>
            <option value="">All modes</option>
            {paymentModes.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        )}
        {activeBatches.length > 0 && (
          <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)}
            style={{ flex: '0 1 180px', padding: '9px 12px', border: '1px solid var(--color-dust)', borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', background: 'var(--color-white)', cursor: 'pointer' }}>
            <option value="">All batches</option>
            {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ flex: '0 1 150px', padding: '9px 12px', border: '1px solid var(--color-dust)', borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', background: 'var(--color-white)' }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ flex: '0 1 150px', padding: '9px 12px', border: '1px solid var(--color-dust)', borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', background: 'var(--color-white)' }} />
        {(filterMode || filterBatch || dateFrom || dateTo) && (
          <button onClick={() => { setFilterMode(''); setFilterBatch(''); setDateFrom(''); setDateTo(''); }}
            style={{ background: 'none', border: '1px solid var(--color-dust)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-canvas)', borderRadius: 12, padding: '12px 16px',
          marginBottom: 16, flexWrap: 'wrap', gap: 8,
        }}>
          <p style={{ fontSize: 13, color: 'var(--color-slate)' }}>
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
            {(filterMode || filterBatch || dateFrom || dateTo) ? ' (filtered)' : ''}
          </p>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Total: {formatAmount(totalFiltered, currency)}
          </p>
        </div>
      )}

      {/* Payment list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="💸"
          title={payments?.length === 0 ? 'No payments yet' : 'No payments match filters'}
          body={payments?.length === 0
            ? 'Record your first payment to get started.'
            : 'Try adjusting the date range or removing filters.'}
          action={
            payments?.length === 0
              ? <button className="btn-primary" onClick={() => setMode('receive')} style={{ padding: '10px 20px' }}>💸 Receive Payment</button>
              : undefined
          }
        />
      ) : (
        <div style={{ border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{
            display: 'flex', gap: 14, padding: '10px 16px',
            background: 'var(--color-canvas)', borderBottom: '1px solid var(--color-dust)',
          }}>
            <p style={{ minWidth: 90, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount</p>
            <p style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member / Details</p>
          </div>

          {filtered.map(payment => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              studentName={getStudentName(payment.studentId)}
              batchName={getBatchName(payment.batchId)}
              currency={currency}
              onArchive={() => setArchiveTarget(payment)}
            />
          ))}
        </div>
      )}

      {/* Archive confirm modal */}
      <Modal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Payment"
        width={400}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setArchiveTarget(null)} style={{ fontSize: 14, padding: '8px 18px' }}>Cancel</button>
            <button onClick={handleArchive} disabled={archiving}
              style={{ background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-btn)', padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              {archiving ? 'Archiving…' : 'Archive Payment'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 15, color: 'var(--color-ink)', lineHeight: 1.7 }}>
          Archive this payment of <strong>{formatAmount(archiveTarget?.amount ?? 0, currency)}</strong>?
          It will be hidden from all reports and the member's history.
        </p>
      </Modal>
    </div>
  );
}

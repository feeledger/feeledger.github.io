import { useState, useEffect } from 'react';
import { useReceipts, useStudents, useAllBatches, useSettings, useStudentFields } from '../hooks/useDB';
import { paymentRepository } from '../db/repositories/paymentRepository';
import { ReceiptViewer } from '../features/receipts/ReceiptViewer';
import { PageHeader, EmptyState, Spinner, Badge } from '../components/ui/index';
import type { Receipt, Student } from '../types';
import type { ReceiptData } from '../services/pdf/receiptPDF';

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

// ── Receipt row ───────────────────────────────────────────────────────────────

function ReceiptRow({
  receipt,
  studentName,
  amount,
  currency,
  mode,
  onClick,
}: {
  receipt: Receipt;
  studentName: string;
  amount: number;
  currency: string;
  mode: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-dust)',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--color-canvas)')}
      onMouseOut={e  => (e.currentTarget.style.background = 'var(--color-white)')}
    >
      {/* Receipt icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(243,115,56,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        🧾
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {receipt.receiptNumber}
          </p>
          <Badge variant="success">Issued</Badge>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>
          {studentName} · {formatDate(receipt.issuedAt)} · {mode}
        </p>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>
          {formatAmount(amount, currency)}
        </p>
      </div>

      <span style={{ color: 'var(--color-dust)', fontSize: 16, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ── Main ReceiptsPage ─────────────────────────────────────────────────────────

export function ReceiptsPage() {
  const { data: receipts, loading } = useReceipts();
  const { data: students }          = useStudents();
  const { data: batches }           = useAllBatches();
  const { data: settings }          = useSettings();
  const { data: fields }            = useStudentFields();

  const [viewerData, setViewerData] = useState<ReceiptData | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(false);

  const currency = settings?.defaultCurrency ?? 'INR';

  const getStudent = (studentId: string): Student | undefined =>
    students?.find(s => s.id === studentId);

  const getBatchName = (batchId?: string) =>
    batchId ? (batches?.find(b => b.id === batchId)?.name ?? '') : '';

  const handleOpenReceipt = async (receipt: Receipt) => {
    setLoadingViewer(true);
    try {
      const payment = await paymentRepository.getById(receipt.paymentId);
      const student = getStudent(receipt.studentId);
      if (!payment || !student || !settings || !fields) return;

      setViewerData({
        receipt,
        payment,
        student,
        settings,
        fields,
        batchName: getBatchName(payment.batchId),
      });
    } finally {
      setLoadingViewer(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
      <PageHeader
        eyebrow="Receipts"
        title="Receipts"
        subtitle={`${receipts?.length ?? 0} receipt${(receipts?.length ?? 0) !== 1 ? 's' : ''} issued`}
      />

      {loadingViewer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(20,20,19,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Spinner size={36} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner size={32} />
        </div>
      ) : (receipts ?? []).length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="No receipts yet"
          body="Receipts are generated automatically when you record a payment."
        />
      ) : (
        <div style={{ border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'flex', gap: 14, padding: '10px 16px',
            background: 'var(--color-canvas)',
            borderBottom: '1px solid var(--color-dust)',
          }}>
            <div style={{ width: 36, flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Receipt / Member
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Amount
            </p>
            <div style={{ width: 16 }} />
          </div>

          {(receipts ?? []).map(receipt => {
            const student = getStudent(receipt.studentId);
            const studentName = String(student?.values['student_name'] ?? 'Unknown');
            return (
              <ReceiptRowLoader
                key={receipt.id}
                receipt={receipt}
                studentName={studentName}
                currency={currency}
                onOpen={() => handleOpenReceipt(receipt)}
              />
            );
          })}
        </div>
      )}

      {/* Receipt viewer modal */}
      <ReceiptViewer
        open={!!viewerData}
        data={viewerData}
        onClose={() => setViewerData(null)}
      />
    </div>
  );
}

// ── ReceiptRowLoader — loads payment amount lazily ─────────────────────────────

function ReceiptRowLoader({
  receipt,
  studentName,
  currency,
  onOpen,
}: {
  receipt: Receipt;
  studentName: string;
  currency: string;
  onOpen: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode]     = useState<string>('');

  useEffect(() => {
    paymentRepository.getById(receipt.paymentId).then(p => {
      if (p) { setAmount(p.amount); setMode(p.paymentMode); }
    });
  }, [receipt.paymentId]);

  return (
    <ReceiptRow
      receipt={receipt}
      studentName={studentName}
      amount={amount}
      currency={currency}
      mode={mode}
      onClick={onOpen}
    />
  );
}

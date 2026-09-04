import type { ReceiptData } from '../../services/pdf/receiptPDF';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFieldValue(data: ReceiptData, fieldId: string): string {
  const val = data.student.values[fieldId];
  if (val === undefined || val === null || val === '') return '';
  const field = data.fields.find(f => f.id === fieldId);
  if (!field) return String(val);
  if (field.type === 'select') return field.options?.find(o => o.value === val)?.label ?? String(val);
  if (field.type === 'date' && typeof val === 'string') return formatDate(val);
  return String(val);
}

// ── Receipt Preview component ─────────────────────────────────────────────────

interface ReceiptPreviewProps {
  data: ReceiptData;
  /** If true, renders as a compact card (for success screen). Full A5 paper look otherwise. */
  compact?: boolean;
}

export function ReceiptPreview({ data, compact = false }: ReceiptPreviewProps) {
  const { receipt, payment, student, settings, fields, batchName } = data;
  const currency = settings.defaultCurrency ?? 'INR';
  const studentName = String(student.values['student_name'] ?? 'Unknown');
  const bizName = settings.business.businessName || 'FeeLedger';

  const receiptFields = fields.filter(f => f.enabled && f.showOnReceipt && f.id !== 'student_name');

  const details: { label: string; value: string }[] = [
    { label: 'Payment Mode', value: payment.paymentMode },
    { label: 'Payment Date', value: formatDate(payment.paymentDate) },
  ];
  if (payment.purpose) details.push({ label: 'Purpose / Period', value: payment.purpose });
  if (batchName) details.push({ label: 'Batch', value: batchName });
  if (payment.notes) details.push({ label: 'Notes', value: payment.notes });

  return (
    <div
      id="receipt-preview"
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        background: '#fff',
        borderRadius: compact ? 16 : 8,
        overflow: 'hidden',
        boxShadow: compact ? 'none' : '0 4px 24px rgba(0,0,0,0.1)',
        border: compact ? 'none' : '1px solid #e5e2df',
        maxWidth: compact ? '100%' : 420,
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{
        background: '#141413',
        padding: compact ? '18px 20px 14px' : '22px 24px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative arc */}
        <svg viewBox="0 0 400 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }} aria-hidden="true">
          <path d="M-20 80 Q200 -20 420 60" stroke="#F37338" strokeWidth="1.5" fill="none"/>
        </svg>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: '#F3F0EE', fontWeight: 700, fontSize: compact ? 14 : 16, margin: 0, letterSpacing: '-0.01em' }}>
              {bizName}
            </p>
            {settings.business.gstin && (
              <p style={{ color: 'rgba(243,240,238,0.5)', fontSize: 10, margin: '3px 0 0' }}>
                GSTIN: {settings.business.gstin}
              </p>
            )}
            {settings.business.phone && (
              <p style={{ color: 'rgba(243,240,238,0.5)', fontSize: 10, margin: '2px 0 0' }}>
                {settings.business.phone}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#F37338', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              Payment Receipt
            </p>
            <p style={{ color: '#F3F0EE', fontWeight: 700, fontSize: compact ? 11 : 13, margin: '4px 0 0', letterSpacing: '-0.01em' }}>
              {receipt.receiptNumber}
            </p>
            <p style={{ color: 'rgba(243,240,238,0.5)', fontSize: 9, margin: '3px 0 0' }}>
              {formatDate(payment.paymentDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: compact ? '16px 20px' : '20px 24px' }}>

        {/* Member */}
        <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #F0EDE9' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>
            Member
          </p>
          <p style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: '#141413', margin: 0, letterSpacing: '-0.01em' }}>
            {studentName}
          </p>
          {receiptFields.map(f => {
            const val = getFieldValue(data, f.id);
            if (!val) return null;
            return (
              <p key={f.id} style={{ fontSize: 11, color: '#696969', margin: '3px 0 0' }}>
                {f.label}: {val}
              </p>
            );
          })}
        </div>

        {/* Payment details */}
        <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #F0EDE9' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            Payment Details
          </p>
          {details.map(d => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <p style={{ fontSize: 11, color: '#696969', margin: 0 }}>{d.label}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#141413', margin: 0 }}>{d.value}</p>
            </div>
          ))}
        </div>

        {/* Amount */}
        <div style={{
          background: '#F3F0EE', borderRadius: 10,
          padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#696969', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Amount Paid
          </p>
          <p style={{ fontSize: compact ? 20 : 24, fontWeight: 700, color: '#141413', margin: 0, letterSpacing: '-0.02em' }}>
            {formatAmount(payment.amount, currency)}
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #F0EDE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 9, color: '#ccc', margin: 0 }}>Thank you for your payment.</p>
          <p style={{ fontSize: 9, color: '#ccc', margin: 0 }}>{receipt.receiptNumber}</p>
        </div>
      </div>
    </div>
  );
}

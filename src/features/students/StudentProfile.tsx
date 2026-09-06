import { useState } from 'react';
import { useStudent, useStudentFields, usePayments, useAllBatches, useSettings } from '../../hooks/useDB';
import { Badge, Spinner, EmptyState, SectionCard } from '../../components/ui/index';
import type { StudentFieldDefinition } from '../../types';

interface StudentProfileProps {
  studentId: string;
  onEdit: () => void;
  onBack: () => void;
}

function formatValue(field: StudentFieldDefinition, value: unknown, currency = 'INR'): string {
  if (value === undefined || value === null || value === '') return '—';
  switch (field.type) {
    case 'boolean':  return value ? 'Yes' : 'No';
    case 'currency': return `${currency === 'INR' ? '₹' : currency}${Number(value).toLocaleString('en-IN')}`;
    case 'date':     return value ? new Date(String(value)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    case 'multiselect': return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
    case 'select': {
      const opt = field.options?.find(o => o.value === value);
      return opt?.label ?? String(value);
    }
    default: return String(value);
  }
}

function formatAmount(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StudentProfile({ studentId, onEdit, onBack }: StudentProfileProps) {
  const { data: student, loading: loadingStudent } = useStudent(studentId);
  const { data: fields } = useStudentFields();
  const { data: payments, loading: loadingPayments } = usePayments(studentId);
  const { data: batches } = useAllBatches();
  const { data: settings } = useSettings();
  const [showAllPayments, setShowAllPayments] = useState(false);

  const currency = settings?.defaultCurrency ?? 'INR';

  if (loadingStudent) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={32} /></div>;
  }

  if (!student) {
    return <EmptyState emoji="❓" title="Member not found" body="This member may have been deleted." action={<button className="btn-secondary" onClick={onBack}>← Back</button>} />;
  }

  const enabledFields = (fields ?? []).filter(f => f.enabled);
  const studentName   = String(student.values['student_name'] ?? 'Unknown Member');
  const studentStatus = String(student.values['student_status'] ?? 'active');
  const whatsappNum   = String(student.values['whatsapp_number'] ?? student.values['parent_phone'] ?? '');

  const activeBatchIds = student.batchMemberships.filter(m => m.status === 'active').map(m => m.batchId);
  const activeBatchNames = activeBatchIds.map(id => batches?.find(b => b.id === id)?.name ?? id);

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const lastPayment = payments && payments.length > 0 ? payments[0] : null;

  const waTemplate = localStorage.getItem('fl_wa_template') ?? `Hi {{name}}, your fee is due. Total paid so far: {{amount}}. Please contact us for details.\n\n— {{business_name}}`;
  const businessName = settings?.business.businessName ?? 'FeeLedger';

  const handleWhatsApp = () => {
    if (!whatsappNum) return;
    const feeAmount = String(student.values['fee_amount'] ?? '');
    const msg = waTemplate
      .replace(/{{name}}/g, studentName)
      .replace(/{{amount}}/g, feeAmount ? formatAmount(Number(feeAmount), currency) : '—')
      .replace(/{{period}}/g, new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }))
      .replace(/{{due_date}}/g, String(student.values['fee_due_date'] ?? '—'))
      .replace(/{{business_name}}/g, businessName);

    const phone = whatsappNum.replace(/\D/g, '');
    const url = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const displayPayments = showAllPayments ? (payments ?? []) : (payments ?? []).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-ink)', borderRadius: 24, padding: '24px 28px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-canvas)', letterSpacing: '-0.02em' }}>
              {studentName}
            </h2>
            <span style={{
              background: studentStatus === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
              color: studentStatus === 'active' ? '#4ade80' : 'rgba(255,255,255,0.5)',
              borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600,
            }}>
              {studentStatus}
            </span>
          </div>
          {activeBatchNames.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeBatchNames.map(name => (
                <span key={name} style={{
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 12,
                }}>{name}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {whatsappNum && (
            <button
              onClick={handleWhatsApp}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#25D366', border: 'none', borderRadius: 12,
                padding: '9px 16px', cursor: 'pointer',
                color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              }}
              title="Send WhatsApp reminder"
            >
              <span style={{ fontSize: 16 }}>💬</span> WhatsApp
            </button>
          )}
          <button
            onClick={onEdit}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '9px 16px', borderColor: 'rgba(255,255,255,0.25)', color: 'var(--color-canvas)', background: 'transparent' }}
          >
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Fee summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Paid',    value: formatAmount(totalPaid, currency) },
          { label: 'Payments',      value: String(payments?.length ?? 0) },
          { label: 'Last Payment',  value: lastPayment ? formatDate(lastPayment.paymentDate) : '—' },
          { label: 'Last Amount',   value: lastPayment ? formatAmount(lastPayment.amount, currency) : '—' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--color-white)', border: '1px solid var(--color-dust)',
            borderRadius: 16, padding: '16px 18px',
          }}>
            <p style={{ fontSize: 12, color: 'var(--color-slate)', marginBottom: 4 }}>{stat.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-ink)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Member details */}
      <SectionCard title="Member Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {enabledFields.map(field => {
            const val = student.values[field.id];
            if (val === undefined || val === null || val === '') return null;
            return (
              <div key={field.id}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  {field.label}
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 500, wordBreak: 'break-word' }}>
                  {formatValue(field, val, currency)}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Payment history */}
      <SectionCard
        title="Payment History"
        subtitle={`${payments?.length ?? 0} payment${payments?.length !== 1 ? 's' : ''}`}
      >
        {loadingPayments ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size={24} /></div>
        ) : (payments ?? []).length === 0 ? (
          <EmptyState emoji="💸" title="No payments yet" body="Payments recorded for this member will appear here." />
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayPayments.map((payment, i) => (
                <div key={payment.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', gap: 12, flexWrap: 'wrap',
                  borderBottom: i < displayPayments.length - 1 ? '1px solid var(--color-dust)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                      {formatAmount(payment.amount, currency)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>
                      {formatDate(payment.paymentDate)} · {payment.paymentMode}
                      {payment.purpose ? ` · ${payment.purpose}` : ''}
                    </p>
                  </div>
                  {payment.receiptId && (
                    <Badge variant="success">Receipt issued</Badge>
                  )}
                </div>
              ))}
            </div>
            {(payments ?? []).length > 5 && (
              <button
                onClick={() => setShowAllPayments(s => !s)}
                style={{
                  marginTop: 12, background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 13, color: 'var(--color-link)',
                  fontFamily: 'var(--font-sans)', fontWeight: 600,
                }}
              >
                {showAllPayments ? 'Show less' : `Show all ${payments?.length} payments`}
              </button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

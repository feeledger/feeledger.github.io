import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStudents, useAllBatches, useSettings } from '../../hooks/useDB';
import { paymentRepository } from '../../db/repositories/paymentRepository';
import { receiptRepository } from '../../db/repositories/receiptRepository';
import { settingsRepository } from '../../db/repositories/settingsRepository';
import { studentRepository } from '../../db/repositories/studentRepository';
import { FormRow, Spinner } from '../../components/ui/index';
import { calculateTax, getDefaultTaxRates } from '../../utils/tax';
// Note: Drive push is triggered from PaymentsPage after form completes
import type { Student, Payment, Receipt, TaxRate } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentResult {
  payment: Payment;
  receipt: Receipt;
  student: Student;
}

interface ReceivePaymentFormProps {
  onComplete: (result: PaymentResult) => void;
  onCancel: () => void;
  prefillStudentId?: string;
}

// ── Member search box ─────────────────────────────────────────────────────────

function MemberSearch({
  onSelect,
}: {
  onSelect: (student: Student) => void;
}) {
  const { data: allStudents } = useStudents();
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  const results = query.trim().length < 1
    ? []
    : (allStudents ?? []).filter(s => {
        const q = query.toLowerCase();
        const name  = String(s.values['student_name'] ?? '').toLowerCase();
        const phone = String(s.values['parent_phone'] ?? '').toLowerCase();
        const wa    = String(s.values['whatsapp_number'] ?? '').toLowerCase();
        const sid   = String(s.values['student_id'] ?? '').toLowerCase();
        return name.includes(q) || phone.includes(q) || wa.includes(q) || sid.includes(q);
      }).slice(0, 8);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (student: Student) => {
    setQuery(String(student.values['student_name'] ?? ''));
    setOpen(false);
    onSelect(student);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: 'var(--color-dust)', pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, phone, or ID…"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px 12px 40px',
            border: '2px solid var(--color-ink)', borderRadius: 14,
            fontFamily: 'var(--font-sans)', fontSize: 15,
            color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
            background: 'var(--color-white)',
          }}
        />
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-white)',
          border: '1px solid var(--color-dust)', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          marginTop: 4, overflow: 'hidden',
        }}>
          {results.map((student, i) => {
            const name  = String(student.values['student_name'] ?? 'Unknown');
            const phone = String(student.values['parent_phone'] ?? student.values['whatsapp_number'] ?? '');
            const grade = String(student.values['class_grade'] ?? '');
            return (
              <div
                key={student.id}
                onClick={() => handleSelect(student)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? '1px solid var(--color-dust)' : 'none',
                  transition: 'background 0.1s ease',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--color-canvas)')}
                onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-ink)', color: 'var(--color-canvas)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                    {[phone, grade].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-white)', border: '1px solid var(--color-dust)',
          borderRadius: 14, padding: '16px', marginTop: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--color-slate)' }}>No members found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function ReceivePaymentForm({ onComplete, onCancel, prefillStudentId }: ReceivePaymentFormProps) {
  const { data: students }  = useStudents();
  const { data: batches }   = useAllBatches();
  const { data: settings }  = useSettings();

  const [step, setStep]             = useState<'search' | 'entry'>('search');
  const [student, setStudent]       = useState<Student | null>(null);
  const [amount, setAmount]         = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose]       = useState('');
  const [notes, setNotes]           = useState('');
  const [batchId, setBatchId]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  // Guard against double-submission
  const submittingRef               = useRef(false);

  const currency    = settings?.defaultCurrency ?? 'INR';
  const symbol      = currency === 'INR' ? '₹' : currency;
  const paymentModes = (settings?.paymentModes ?? []).filter(m => m.enabled);
  const taxSettings  = settings?.taxSettings;
  const taxEnabled   = !!taxSettings?.enabled;
  const availableTaxRates = (taxSettings?.rates ?? []).filter(r => r.enabled);

  // Selected tax rates for this payment — pre-filled from defaults, editable
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  const taxDefaultsAppliedRef = useRef(false);

  // Pre-fill default tax rates once settings load (only once, so user edits aren't reset)
  useEffect(() => {
    if (taxDefaultsAppliedRef.current) return;
    if (!settings) return;
    const defaults = getDefaultTaxRates(taxSettings);
    setSelectedTaxIds(defaults.map(r => r.id));
    taxDefaultsAppliedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const toggleTaxRate = (id: string) =>
    setSelectedTaxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedTaxRateObjs: TaxRate[] = availableTaxRates.filter(r => selectedTaxIds.includes(r.id));

  // Live tax calculation preview
  const taxCalc = useMemo(() => {
    const amt = Number(amount);
    if (!taxEnabled || !amt || isNaN(amt) || amt <= 0) return null;
    return calculateTax(amt, selectedTaxRateObjs, !!taxSettings?.amountIsInclusive);
  }, [amount, taxEnabled, selectedTaxRateObjs, taxSettings?.amountIsInclusive]);

  useEffect(() => {
    if (paymentModes.length > 0 && !paymentMode) {
      setPaymentMode(paymentModes[0].id);
    }
  }, [paymentModes, paymentMode]);

  useEffect(() => {
    if (prefillStudentId && students) {
      const s = students.find(st => st.id === prefillStudentId);
      if (s) { setStudent(s); setStep('entry'); }
    }
  }, [prefillStudentId, students]);

  // When student selected, pre-fill their batch
  const handleSelectStudent = useCallback((s: Student) => {
    setStudent(s);
    const activeBatchId = s.batchMemberships.find(m => m.status === 'active')?.batchId ?? '';
    setBatchId(activeBatchId);
    setStep('entry');
  }, []);

  const studentBatches = student
    ? student.batchMemberships
        .filter(m => m.status === 'active')
        .map(m => batches?.find(b => b.id === m.batchId))
        .filter(Boolean)
    : [];

  const handleSave = async () => {
    if (submittingRef.current) return;

    // Validate
    if (!student)        { setError('Please select a member.'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount.'); return;
    }
    if (!paymentMode)    { setError('Select a payment mode.'); return; }
    if (!paymentDate)    { setError('Select a payment date.'); return; }
    if (taxEnabled && availableTaxRates.length > 0 && selectedTaxIds.length === 0) {
      setError('Select at least one tax rate, or mark a default in Settings → Tax.'); return;
    }

    submittingRef.current = true;
    setSaving(true);
    setError('');

    try {
      // 1. Create payment (with tax breakdown if applicable)
      const payment = await paymentRepository.create({
        studentId:   student.id,
        batchId:     batchId || undefined,
        amount:      taxCalc ? taxCalc.totalAmount : Number(amount),
        currency,
        paymentMode,
        paymentDate,
        purpose:     purpose || undefined,
        notes:       notes   || undefined,
        baseAmount:  taxCalc ? taxCalc.baseAmount : undefined,
        taxAmount:   taxCalc ? taxCalc.taxAmount : undefined,
        taxLines:    taxCalc && taxCalc.taxLines.length > 0 ? taxCalc.taxLines : undefined,
        taxInclusive: taxCalc ? !!taxSettings?.amountIsInclusive : undefined,
      });

      // 2. Generate receipt number
      const receiptNumber = await settingsRepository.nextReceiptNumber();

      // 3. Create receipt record
      const receipt = await receiptRepository.create({
        receiptNumber,
        paymentId: payment.id,
        studentId: student.id,
      });

      // 4. Link receipt back to payment
      await paymentRepository.linkReceipt(payment.id, receipt.id);

      // 5. Fetch full student for result
      const fullStudent = await studentRepository.getById(student.id) ?? student;

      onComplete({ payment, receipt, student: fullStudent });

    } catch (err) {
      console.error('Payment save error:', err);
      setError('Failed to save payment. Please try again.');
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const IS: React.CSSProperties = {
    width: '100%', background: 'var(--color-white)',
    border: '1px solid rgba(20,20,19,0.22)', borderRadius: 12,
    padding: '11px 14px', fontFamily: 'var(--font-sans)',
    fontSize: 15, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  };

  // ── Step 1: Member search ──────────────────────────────────────────────────

  if (step === 'search') {
    return (
      <div>
        <p style={{ fontSize: 14, color: 'var(--color-slate)', marginBottom: 20, lineHeight: 1.6 }}>
          Search for the member you are collecting payment from.
        </p>
        <MemberSearch onSelect={handleSelectStudent} />
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ fontSize: 14, padding: '10px 20px' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Payment entry ──────────────────────────────────────────────────

  const studentName = String(student?.values['student_name'] ?? 'Unknown');

  return (
    <div>
      {/* Selected member chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
        background: 'var(--color-canvas)', borderRadius: 12, padding: '10px 14px',
        border: '1px solid var(--color-dust)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'var(--color-ink)', color: 'var(--color-canvas)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700,
        }}>
          {studentName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{studentName}</p>
          <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>
            {String(student?.values['parent_phone'] ?? student?.values['whatsapp_number'] ?? '')}
          </p>
        </div>
        <button
          onClick={() => { setStudent(null); setStep('search'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}
        >
          Change
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '9px 14px', marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Amount — large and prominent */}
        <FormRow label="Amount" required>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 20, fontWeight: 700, color: 'var(--color-ink)',
            }}>{symbol}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); }}
              placeholder="0.00"
              autoFocus
              style={{
                ...IS,
                paddingLeft: 38,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                border: '2px solid var(--color-ink)',
                borderRadius: 14,
                height: 60,
              }}
            />
          </div>
        </FormRow>

        {/* Tax selection — only shown when tax is enabled in Settings */}
        {taxEnabled && availableTaxRates.length > 0 && (
          <FormRow
            label="Tax"
            hint={taxSettings?.amountIsInclusive
              ? 'Amount above is treated as tax-inclusive — tax will be extracted from it.'
              : 'Amount above is the base amount — tax will be added on top.'}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: taxCalc ? 12 : 0 }}>
              {availableTaxRates.map(rate => {
                const active = selectedTaxIds.includes(rate.id);
                return (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => toggleTaxRate(rate.id)}
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
                    {active ? '✓ ' : ''}{rate.name} ({rate.rate}%)
                  </button>
                );
              })}
            </div>

            {/* Live breakdown preview */}
            {taxCalc && taxCalc.taxLines.length > 0 && (
              <div style={{
                background: 'var(--color-canvas)', borderRadius: 12,
                padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>Base amount</span>
                  <span style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 500 }}>
                    {symbol}{taxCalc.baseAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                {taxCalc.taxLines.map(line => (
                  <div key={line.taxRateId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>{line.name} ({line.rate}%)</span>
                    <span style={{ fontSize: 12, color: 'var(--color-ink)', fontWeight: 500 }}>
                      {symbol}{line.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 6, marginTop: 2, borderTop: '1px solid var(--color-dust)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 700 }}>Total to collect</span>
                  <span style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 700 }}>
                    {symbol}{taxCalc.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </FormRow>
        )}
        <FormRow label="Payment Mode" required>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {paymentModes.map(mode => {
              const active = paymentMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPaymentMode(mode.id)}
                  style={{
                    padding: '8px 18px', borderRadius: 999,
                    border: `1.5px solid ${active ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                    background: active ? 'var(--color-ink)' : 'var(--color-white)',
                    color: active ? 'var(--color-canvas)' : 'var(--color-ink)',
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </FormRow>

        {/* Date */}
        <FormRow label="Payment Date" required>
          <input type="date" value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            style={IS} />
        </FormRow>

        {/* Batch (if member is in multiple batches) */}
        {studentBatches.length > 1 && (
          <FormRow label="Batch" hint="Which batch is this payment for?">
            <select value={batchId} onChange={e => setBatchId(e.target.value)} style={{ ...IS, cursor: 'pointer' }}>
              <option value="">— No specific batch —</option>
              {studentBatches.map(b => b && (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </FormRow>
        )}

        {/* Purpose */}
        <FormRow label="Purpose / Period" hint="e.g. September 2026, Term 1">
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder={`${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
            style={IS}
          />
        </FormRow>

        {/* Notes */}
        <FormRow label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes…"
            rows={2}
            style={{ ...IS, resize: 'vertical', lineHeight: 1.5 }}
          />
        </FormRow>
      </div>

      {/* Actions */}
      <div style={{
        marginTop: 28, paddingTop: 20,
        borderTop: '1px solid var(--color-dust)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <button
          className="btn-secondary"
          onClick={() => setStep('search')}
          disabled={saving}
          style={{ fontSize: 14, padding: '10px 20px' }}
        >
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: 16, padding: '12px 32px', gap: 10, borderRadius: 'var(--radius-pill)' }}
        >
          {saving
            ? <><Spinner size={16} /> Saving…</>
            : <>💾 Save & Generate Receipt</>
          }
        </button>
      </div>
    </div>
  );
}

import React from 'react';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Toggle, FormRow, Spinner } from '../../components/ui/index';
import { settingsRepository } from '../../db/repositories/settingsRepository';
import { schemaRepository } from '../../db/repositories/schemaRepository';
import { academicYearRepository } from '../../db/repositories/batchRepository';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Business',      emoji: '🏢' },
  { label: 'Fields',        emoji: '📋' },
  { label: 'Receipt',       emoji: '🧾' },
  { label: 'Ready',         emoji: '🎉' },
];

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <React.Fragment key={step.label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--color-ink)' : active ? 'var(--color-ink)' : 'var(--color-dust)',
                color: (done || active) ? 'var(--color-canvas)' : 'var(--color-slate)',
                fontSize: done ? 18 : 20,
                fontWeight: 700,
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}>
                {done ? '✓' : step.emoji}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 400,
                color: active ? 'var(--color-ink)' : 'var(--color-slate)',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 4px',
                marginBottom: 22,
                background: i < current ? 'var(--color-ink)' : 'var(--color-dust)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const IS: React.CSSProperties = {
  width: '100%', background: 'var(--color-white)',
  border: '1px solid rgba(20,20,19,0.22)', borderRadius: 12,
  padding: '11px 14px', fontFamily: 'var(--font-sans)',
  fontSize: 15, color: 'var(--color-ink)', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s ease',
};

// ── Step 1 — Business profile ─────────────────────────────────────────────────

interface BusinessForm {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  website: string;
}

function StepBusiness({
  onNext,
}: {
  onNext: (data: BusinessForm) => void;
}) {
  const [form, setForm] = useState<BusinessForm>({
    businessName: '', phone: '', email: '', address: '', gstin: '', website: '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof BusinessForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleNext = () => {
    if (!form.businessName.trim()) { setError('Business name is required.'); return; }
    setError('');
    onNext(form);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
        Tell us about your business
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-slate)', marginBottom: 28, lineHeight: 1.6 }}>
        This information will appear on your receipts. You can change it anytime in Settings.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: '#b91c1c' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormRow label="Business / Academy Name" required>
          <input style={IS} value={form.businessName} autoFocus
            onChange={e => set('businessName', e.target.value)}
            placeholder="e.g. Sharma Classes, FitLife Gym" />
        </FormRow>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <FormRow label="Phone">
            <input style={IS} type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+91 9876543210" />
          </FormRow>
          <FormRow label="Email">
            <input style={IS} type="email" value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="contact@yourbusiness.com" />
          </FormRow>
        </div>

        <FormRow label="GSTIN" hint="Optional — shown on receipts if provided">
          <input style={IS} value={form.gstin}
            onChange={e => set('gstin', e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5" />
        </FormRow>

        <FormRow label="Website">
          <input style={IS} value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder="https://yourbusiness.com" />
        </FormRow>

        <FormRow label="Address" hint="Appears on receipts">
          <textarea style={{ ...IS, resize: 'vertical', lineHeight: 1.6 }} rows={2}
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Full business address" />
        </FormRow>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleNext} style={{ padding: '12px 32px', fontSize: 16 }}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Step 2 — Member fields ────────────────────────────────────────────────────

const QUICK_FIELDS = [
  { id: 'parent_phone',    label: 'Parent Phone',          desc: 'Contact number' },
  { id: 'whatsapp_number', label: 'WhatsApp Number',       desc: 'For reminders' },
  { id: 'class_grade',     label: 'Class / Grade',         desc: 'Academic level' },
  { id: 'school_name',     label: 'School / College',      desc: 'Where they study' },
  { id: 'fee_amount',      label: 'Fee Amount',            desc: 'Monthly/term fee' },
  { id: 'fee_frequency',   label: 'Fee Frequency',         desc: 'Monthly, quarterly…' },
  { id: 'fee_due_date',    label: 'Due Date (day)',         desc: 'Day of month' },
  { id: 'membership_expiry', label: 'Membership Expiry',   desc: 'End date' },
  { id: 'admission_date',  label: 'Admission Date',        desc: 'Joining date' },
  { id: 'address',         label: 'Address',               desc: 'Home address' },
  { id: 'date_of_birth',   label: 'Date of Birth',         desc: 'Age tracking' },
  { id: 'gender',          label: 'Gender',                desc: '' },
  { id: 'notes',           label: 'Notes',                 desc: 'Internal remarks' },
];

function StepFields({
  onNext, onBack,
}: {
  onNext: (enabled: string[]) => void;
  onBack: () => void;
}) {
  // Pre-check the most commonly useful ones
  const [enabled, setEnabled] = useState<Set<string>>(new Set([
    'parent_phone', 'whatsapp_number', 'class_grade', 'fee_amount', 'fee_frequency',
  ]));

  const toggle = (id: string) =>
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
        Which fields do you need?
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-slate)', marginBottom: 8, lineHeight: 1.6 }}>
        Toggle the fields you want to collect for each member.
        Name and Status are always included. You can add more custom fields in Settings.
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-dust)', marginBottom: 24 }}>
        {enabled.size} field{enabled.size !== 1 ? 's' : ''} selected
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-dust)', borderRadius: 16, overflow: 'hidden' }}>
        {QUICK_FIELDS.map((f, i) => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px',
            background: enabled.has(f.id) ? 'var(--color-white)' : 'var(--color-canvas)',
            borderBottom: i < QUICK_FIELDS.length - 1 ? '1px solid var(--color-dust)' : 'none',
            transition: 'background 0.15s ease',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{f.label}</p>
              {f.desc && <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{f.desc}</p>}
            </div>
            <Toggle checked={enabled.has(f.id)} onChange={() => toggle(f.id)} size="sm" />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '12px 24px', fontSize: 15 }}>
          ← Back
        </button>
        <button className="btn-primary" onClick={() => onNext(Array.from(enabled))} style={{ padding: '12px 32px', fontSize: 16 }}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Receipt setup ────────────────────────────────────────────────────

interface ReceiptForm {
  prefix: string;
  includeYear: boolean;
  includeMonth: boolean;
  padding: number;
  academicYear: string;
}

function StepReceipt({
  onNext, onBack,
}: {
  onNext: (data: ReceiptForm) => void;
  onBack: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<ReceiptForm>({
    prefix: 'FEE',
    includeYear: true,
    includeMonth: true,
    padding: 4,
    academicYear: `${currentYear}-${currentYear + 1}`,
  });

  const set = <K extends keyof ReceiptForm>(k: K, v: ReceiptForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const preview = [
    form.prefix,
    form.includeYear  ? currentYear.toString() : null,
    form.includeMonth ? String(new Date().getMonth() + 1).padStart(2, '0') : null,
    String(1).padStart(form.padding, '0'),
  ].filter(Boolean).join('-');

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
        Set up your receipts
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-slate)', marginBottom: 28, lineHeight: 1.6 }}>
        Configure how your receipt numbers are generated. This sets the format for every receipt you issue.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Preview */}
        <div style={{
          background: 'var(--color-ink)', borderRadius: 16, padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Receipt number preview</p>
            <p style={{ color: 'var(--color-canvas)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {preview}
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Format</p>
            <p style={{ color: 'var(--color-canvas)', fontSize: 13, fontWeight: 500 }}>
              {form.prefix}-{form.includeYear ? 'YYYY' : ''}{form.includeMonth ? '-MM' : ''}-{'0'.repeat(form.padding - 1)}1
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <FormRow label="Prefix" required hint="Letters before the number">
            <input style={IS} value={form.prefix}
              onChange={e => set('prefix', e.target.value.toUpperCase())}
              placeholder="FEE" maxLength={8} />
          </FormRow>
          <FormRow label="Serial digits" hint="e.g. 4 → 0001">
            <select
              style={{ ...IS, cursor: 'pointer' }}
              value={form.padding}
              onChange={e => set('padding', Number(e.target.value))}
            >
              {[3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} digits — {String(1).padStart(n, '0')}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Include year">
            <Toggle checked={form.includeYear} onChange={v => set('includeYear', v)}
              label={form.includeYear ? 'Yes' : 'No'} />
          </FormRow>
          <FormRow label="Include month">
            <Toggle checked={form.includeMonth} onChange={v => set('includeMonth', v)}
              label={form.includeMonth ? 'Yes' : 'No'} />
          </FormRow>
        </div>

        <FormRow label="Current Academic Year" hint="e.g. 2026-2027 or just 2026">
          <input style={IS} value={form.academicYear}
            onChange={e => set('academicYear', e.target.value)}
            placeholder="2026-2027" />
        </FormRow>
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '12px 24px', fontSize: 15 }}>
          ← Back
        </button>
        <button className="btn-primary" onClick={() => onNext(form)} style={{ padding: '12px 32px', fontSize: 16 }}>
          Finish setup →
        </button>
      </div>
    </div>
  );
}

// ── Step 4 — Done ─────────────────────────────────────────────────────────────

function StepDone({ businessName, onEnter }: { businessName: string; onEnter: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
        You're all set, {businessName || 'welcome'}!
      </h2>
      <p style={{ fontSize: 15, color: 'var(--color-slate)', maxWidth: 380, margin: '0 auto 32px', lineHeight: 1.7 }}>
        FeeLedger is ready to use. Add your first member, create a batch, and start
        recording payments. Everything is saved to your Google Drive automatically.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, maxWidth: 480, margin: '0 auto 36px', textAlign: 'left' }}>
        {[
          { emoji: '🧑‍🎓', title: 'Add members',       hint: 'Start with one student or member' },
          { emoji: '🗂️',  title: 'Create a batch',    hint: 'Group your members by class or plan' },
          { emoji: '💸',   title: 'Record a payment',  hint: 'Collect a fee and generate a receipt' },
        ].map(item => (
          <div key={item.title} style={{
            background: 'var(--color-canvas)', borderRadius: 14,
            padding: '14px 16px', border: '1px solid var(--color-dust)',
          }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>{item.emoji}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 3 }}>{item.title}</p>
            <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{item.hint}</p>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={onEnter}
        style={{ padding: '14px 40px', fontSize: 17, borderRadius: 'var(--radius-pill)' }}
      >
        Open FeeLedger →
      </button>
    </div>
  );
}

// ── Main Onboarding wizard ────────────────────────────────────────────────────

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Collected data
  const [businessData, setBusinessData] = useState<BusinessForm | null>(null);
  const [enabledFieldIds, setEnabledFieldIds] = useState<string[]>([]);

  // Step 1 → 2
  const handleBusinessNext = (data: BusinessForm) => {
    setBusinessData(data);
    setStep(1);
  };

  // Step 2 → 3
  const handleFieldsNext = (enabled: string[]) => {
    setEnabledFieldIds(enabled);
    setStep(2);
  };

  // Step 3 → save everything → Step 4
  const handleReceiptNext = async (data: ReceiptForm) => {
    setSaving(true);
    try {
      // 1. Save business settings
      const current = await settingsRepository.get();
      await settingsRepository.save({
        ...current,
        business: {
          businessName: businessData?.businessName ?? '',
          phone: businessData?.phone,
          email: businessData?.email,
          address: businessData?.address,
          gstin: businessData?.gstin,
          website: businessData?.website,
        },
        receiptNumbering: {
          prefix: data.prefix,
          includeYear: data.includeYear,
          includeMonth: data.includeMonth,
          startingNumber: 1,
          padding: data.padding,
          nextNumber: 1,
        },
        onboardingComplete: true,
      });

      // 2. Enable/disable student fields based on selection
      const allFields = await schemaRepository.getStudentFields();
      const alwaysOn = new Set(['student_name', 'student_id', 'student_status']);
      for (const field of allFields) {
        if (alwaysOn.has(field.id)) continue;
        const shouldEnable = enabledFieldIds.includes(field.id);
        if (field.enabled !== shouldEnable) {
          await schemaRepository.updateStudentField(field.id, { enabled: shouldEnable });
        }
      }

      // 3. Create the academic year if provided
      if (data.academicYear.trim()) {
        const existing = await academicYearRepository.listAll();
        if (!existing.find(ay => ay.name === data.academicYear.trim())) {
          await academicYearRepository.create(data.academicYear.trim());
        }
      }

      setStep(3);
    } catch (err) {
      console.error('Onboarding save error:', err);
      // Still advance — user can fix in settings
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleEnter = () => {
    navigate('/app/dashboard', { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--color-dust)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(252,251,250,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Logo size={28} variant="full" dark={false} />
        <p style={{ fontSize: 13, color: 'var(--color-slate)' }}>
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      {/* Wizard card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px)',
      }}>
        <div style={{
          width: '100%', maxWidth: 600,
          background: 'var(--color-white)',
          borderRadius: 28,
          padding: 'clamp(24px, 5vw, 40px)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-dust)',
        }}>
          <StepBar current={step} />

          {saving && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '32px 0',
            }}>
              <Spinner size={28} />
              <p style={{ fontSize: 15, color: 'var(--color-slate)' }}>Saving your settings…</p>
            </div>
          )}

          {!saving && (
            <>
              {step === 0 && <StepBusiness onNext={handleBusinessNext} />}
              {step === 1 && <StepFields onNext={handleFieldsNext} onBack={() => setStep(0)} />}
              {step === 2 && <StepReceipt onNext={handleReceiptNext} onBack={() => setStep(1)} />}
              {step === 3 && (
                <StepDone
                  businessName={businessData?.businessName ?? ''}
                  onEnter={handleEnter}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

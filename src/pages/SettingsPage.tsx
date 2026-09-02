import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useDB';
import { FieldBuilder } from '../features/settings/FieldBuilder';
import { PageHeader, SectionCard, FormRow, Spinner, Toggle } from '../components/ui/index';
import type { AppSettings, PaymentMode } from '../types';

// ── Tab system ────────────────────────────────────────────────────────────────

type Tab = 'business' | 'fields' | 'receipt' | 'payments' | 'whatsapp';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'business',  label: 'Business',       emoji: '🏢' },
  { id: 'fields',    label: 'Member Fields',  emoji: '📋' },
  { id: 'receipt',   label: 'Receipt',        emoji: '🧾' },
  { id: 'payments',  label: 'Payment Modes',  emoji: '💳' },
  { id: 'whatsapp',  label: 'WhatsApp',       emoji: '💬' },
];

// ── Business tab ──────────────────────────────────────────────────────────────

function BusinessTab({ settings, onPatch }: { settings: AppSettings; onPatch: (p: Partial<AppSettings>) => Promise<void> }) {
  const b = settings.business;
  const [form, setForm] = useState({ ...b });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm({ ...b }); }, [settings]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onPatch({ business: { ...form } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const inputS: React.CSSProperties = {
    width: '100%', background: 'var(--color-white)',
    border: '1px solid rgba(20,20,19,0.22)', borderRadius: 10,
    padding: '10px 14px', fontFamily: 'var(--font-sans)',
    fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Business Profile" subtitle="This information appears on your receipts">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <FormRow label="Business / Academy Name" required>
            <input style={inputS} value={form.businessName ?? ''} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Sharma Classes" />
          </FormRow>
          <FormRow label="Phone">
            <input style={inputS} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
          </FormRow>
          <FormRow label="Email">
            <input style={inputS} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="contact@yourbusiness.com" />
          </FormRow>
          <FormRow label="Website">
            <input style={inputS} value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://yourbusiness.com" />
          </FormRow>
          <FormRow label="GSTIN">
            <input style={inputS} value={form.gstin ?? ''} onChange={e => set('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
          </FormRow>
          <FormRow label="Other Identifier" hint="PAN, shop registration, etc.">
            <input style={inputS} value={form.otherIdentifier ?? ''} onChange={e => set('otherIdentifier', e.target.value)} placeholder="e.g. PAN: ABCDE1234F" />
          </FormRow>
        </div>
        <FormRow label="Address" hint="Appears on receipts">
          <textarea
            style={{ ...inputS, resize: 'vertical', lineHeight: 1.5 }}
            rows={2}
            value={form.address ?? ''}
            onChange={e => set('address', e.target.value)}
            placeholder="Full business address"
          />
        </FormRow>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', gap: 8 }}>
          {saving ? <><Spinner size={16} /> Saving…</> : 'Save Business Profile'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

// ── Receipt tab ───────────────────────────────────────────────────────────────

function ReceiptTab({ settings, onPatch }: { settings: AppSettings; onPatch: (p: Partial<AppSettings>) => Promise<void> }) {
  const rn = settings.receiptNumbering;
  const [prefix, setPrefix] = useState(rn.prefix);
  const [includeYear, setIncludeYear] = useState(rn.includeYear);
  const [includeMonth, setIncludeMonth] = useState(rn.includeMonth);
  const [padding, setPadding] = useState(rn.padding);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefix(rn.prefix);
    setIncludeYear(rn.includeYear);
    setIncludeMonth(rn.includeMonth);
    setPadding(rn.padding);
  }, [settings]);

  const preview = [
    prefix,
    includeYear  ? new Date().getFullYear().toString() : null,
    includeMonth ? String(new Date().getMonth() + 1).padStart(2, '0') : null,
    '0001'.slice(0, padding).padStart(padding, '0'),
  ].filter(Boolean).join('-');

  const handleSave = async () => {
    setSaving(true);
    try {
      await onPatch({ receiptNumbering: { ...rn, prefix, includeYear, includeMonth, padding } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const inputS: React.CSSProperties = {
    width: '100%', background: 'var(--color-white)',
    border: '1px solid rgba(20,20,19,0.22)', borderRadius: 10,
    padding: '10px 14px', fontFamily: 'var(--font-sans)',
    fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Receipt Numbering" subtitle={`Preview: ${preview}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <FormRow label="Prefix" required>
            <input style={inputS} value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="FEE" maxLength={10} />
          </FormRow>
          <FormRow label="Number padding" hint="Digits in the serial (e.g. 4 → 0001)">
            <select style={{ ...inputS, cursor: 'pointer' }} value={padding} onChange={e => setPadding(Number(e.target.value))}>
              {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} digits ({String(1).padStart(n, '0')})</option>)}
            </select>
          </FormRow>
          <FormRow label="Include year">
            <Toggle checked={includeYear} onChange={setIncludeYear} label={includeYear ? 'Yes' : 'No'} />
          </FormRow>
          <FormRow label="Include month">
            <Toggle checked={includeMonth} onChange={setIncludeMonth} label={includeMonth ? 'Yes' : 'No'} />
          </FormRow>
        </div>
        <div style={{ marginTop: 16, background: 'var(--color-canvas)', borderRadius: 10, padding: '12px 16px', display: 'inline-block' }}>
          <p style={{ fontSize: 12, color: 'var(--color-slate)', marginBottom: 4 }}>Receipt number preview</p>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-ink)' }}>{preview}</p>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', gap: 8 }}>
          {saving ? <><Spinner size={16} /> Saving…</> : 'Save Receipt Settings'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

// ── Payment modes tab ─────────────────────────────────────────────────────────

function PaymentModesTab({ settings, onPatch }: { settings: AppSettings; onPatch: (p: Partial<AppSettings>) => Promise<void> }) {
  const [modes, setModes] = useState<PaymentMode[]>(settings.paymentModes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => { setModes(settings.paymentModes); }, [settings]);

  const toggle = (id: string, enabled: boolean) =>
    setModes(m => m.map(p => p.id === id ? { ...p, enabled } : p));

  const addMode = () => {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    setModes(m => [...m, { id, label: newLabel.trim(), enabled: true, order: m.length }]);
    setNewLabel('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onPatch({ paymentModes: modes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Payment Modes" subtitle="Enable the modes you accept">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-dust)', borderRadius: 12, overflow: 'hidden' }}>
          {modes.map(mode => (
            <div key={mode.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--color-dust)',
              background: mode.enabled ? 'var(--color-white)' : 'var(--color-canvas)',
            }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)' }}>{mode.label}</span>
              <Toggle checked={mode.enabled} onChange={v => toggle(mode.id, v)} size="sm" />
            </div>
          ))}
          {/* Add new */}
          <div style={{ display: 'flex', gap: 8, padding: 12, background: 'var(--color-canvas)' }}>
            <input
              style={{ flex: 1, background: 'var(--color-white)', border: '1px solid rgba(20,20,19,0.22)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none' }}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMode(); } }}
              placeholder="Add new payment mode…"
            />
            <button
              onClick={addMode}
              style={{ background: 'var(--color-ink)', color: 'var(--color-canvas)', border: 'none', borderRadius: 8, padding: '0 16px', cursor: 'pointer', fontSize: 18, fontWeight: 300 }}
            >+</button>
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', gap: 8 }}>
          {saving ? <><Spinner size={16} /> Saving…</> : 'Save Payment Modes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

// ── WhatsApp tab ──────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `Hi {{name}},

This is a reminder that your fee of ₹{{amount}} for {{period}} is due on {{due_date}}.

Kindly make the payment at your earliest convenience.

Thank you,
{{business_name}}`;

const PLACEHOLDERS = [
  { key: '{{name}}',          desc: 'Member name' },
  { key: '{{amount}}',        desc: 'Amount due' },
  { key: '{{period}}',        desc: 'Period (e.g. September 2026)' },
  { key: '{{due_date}}',      desc: 'Due date' },
  { key: '{{business_name}}', desc: 'Your business name' },
];

function WhatsAppTab() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('fl_wa_template', template);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  useEffect(() => {
    const stored = localStorage.getItem('fl_wa_template');
    if (stored) setTemplate(stored);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard
        title="WhatsApp Reminder Template"
        subtitle="When you send a reminder, this message is pre-filled with the member's details"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {PLACEHOLDERS.map(p => (
              <button
                key={p.key}
                onClick={() => setTemplate(t => t + p.key)}
                title={p.desc}
                style={{
                  background: 'var(--color-bone)', border: '1px solid var(--color-dust)',
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--color-ink)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {p.key}
              </button>
            ))}
          </div>
          <textarea
            style={{
              width: '100%', minHeight: 200,
              background: 'var(--color-white)',
              border: '1px solid rgba(20,20,19,0.22)', borderRadius: 12,
              padding: '12px 14px', fontFamily: 'var(--font-sans)',
              fontSize: 14, lineHeight: 1.7, color: 'var(--color-ink)',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
            value={template}
            onChange={e => setTemplate(e.target.value)}
          />
          <p style={{ fontSize: 12, color: 'var(--color-slate)', lineHeight: 1.6 }}>
            Click a placeholder above to insert it. When you tap "Send WhatsApp reminder" on a member's profile,
            FeeLedger will replace these placeholders with real values and open WhatsApp with the message pre-filled.
            <strong> You always send it manually</strong> — FeeLedger never sends messages on your behalf.
          </p>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={handleSave} style={{ padding: '10px 24px' }}>
          Save Template
        </button>
        {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const { data: settings, loading, patch } = useSettings();

  if (loading || !settings) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Customise FeeLedger for your business"
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap',
        background: 'var(--color-white)',
        border: '1px solid var(--color-dust)',
        borderRadius: 16, padding: 6, marginBottom: 28,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1 1 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 14px',
              border: 'none', borderRadius: 12,
              background: activeTab === tab.id ? 'var(--color-ink)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-canvas)' : 'var(--color-slate)',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'business' && <BusinessTab settings={settings} onPatch={patch} />}
      {activeTab === 'fields'   && <FieldBuilder />}
      {activeTab === 'receipt'  && <ReceiptTab   settings={settings} onPatch={patch} />}
      {activeTab === 'payments' && <PaymentModesTab settings={settings} onPatch={patch} />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
    </div>
  );
}

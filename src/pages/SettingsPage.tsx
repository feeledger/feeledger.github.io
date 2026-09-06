import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useSettings } from '../hooks/useDB';
import { useSync } from '../services/SyncContext';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { FieldBuilder } from '../features/settings/FieldBuilder';
import { PageHeader, SectionCard, FormRow, Spinner, Toggle } from '../components/ui/index';
import type { AppSettings, PaymentMode } from '../types';

// ── Tab system ────────────────────────────────────────────────────────────────

type Tab = 'business' | 'fields' | 'receipt' | 'payments' | 'whatsapp' | 'tax' | 'sync' | 'account';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'business',  label: 'Business',       emoji: '🏢' },
  { id: 'fields',    label: 'Member Fields',  emoji: '📋' },
  { id: 'receipt',   label: 'Receipt',        emoji: '🧾' },
  { id: 'payments',  label: 'Payment Modes',  emoji: '💳' },
  { id: 'whatsapp',  label: 'WhatsApp',       emoji: '💬' },
  { id: 'tax',       label: 'Tax',            emoji: '🧮' },
  { id: 'sync',      label: 'Sync & Data',    emoji: '☁️' },
  { id: 'account',   label: 'Account',        emoji: '👤' },
];

// ── Business tab ──────────────────────────────────────────────────────────────

function BusinessTab({ settings, onPatch }: { settings: AppSettings; onPatch: (p: Partial<AppSettings>) => Promise<void> }) {
  const b = settings.business;
  const [form, setForm] = useState({ ...b });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync form when settings prop changes (controlled reset on external update)
  useEffect(() => { setForm({ ...b }); }, [b]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onPatch({ business: { ...form } });
      // Note: onPatch caller handles enqueuePush via settings change
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rn.prefix, rn.includeYear, rn.includeMonth, rn.padding]);

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
      // Note: onPatch caller handles enqueuePush via settings change
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

  useEffect(() => { setModes(settings.paymentModes); }, [settings.paymentModes]);

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
      // Note: onPatch caller handles enqueuePush via settings change
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


// ── Sync tab ──────────────────────────────────────────────────────────────────

function SyncTab() {
  const { syncState, push, pull, pendingCount, hasPendingChanges } = useSync();
  const [pushing, setPushing]     = useState(false);
  const [pulling, setPulling]     = useState(false);
  const [msg, setMsg]             = useState('');
  const [msgType, setMsgType]     = useState<'ok'|'err'>('ok');

  const showMsg = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      await push();
      showMsg('All data saved to your Google Drive.', 'ok');
    } catch {
      showMsg('Sync failed. Check your internet connection.', 'err');
    } finally { setPushing(false); }
  };

  const handlePull = async () => {
    if (!confirm('This will restore data from Google Drive into this device. Local changes not yet synced will be overwritten. Continue?')) return;
    setPulling(true);
    try {
      await pull();
      showMsg('Data restored from your Google Drive.', 'ok');
    } catch {
      showMsg('Restore failed. Check your internet connection.', 'err');
    } finally { setPulling(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Drive Sync Status" subtitle="Your data is stored in your Google Drive">
        <div style={{ marginBottom: 16 }}>
          <SyncStatusBar />
        </div>

        {hasPendingChanges && syncState !== 'syncing' && (
          <div style={{ background: 'rgba(243,115,56,0.08)', border: '1px solid rgba(243,115,56,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--color-signal)', fontWeight: 500 }}>
              {pendingCount > 0 ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} waiting to sync.` : 'Last sync had an error — tap Sync now to retry.'}
            </p>
          </div>
        )}

        {msg && (
          <div style={{ background: msgType === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msgType === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: msgType === 'ok' ? '#15803d' : '#b91c1c' }}>{msg}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handlePush}
            disabled={pushing || syncState === 'syncing'}
            style={{ padding: '10px 22px', fontSize: 14, gap: 8 }}>
            {pushing ? <><Spinner size={14} /> Saving…</> : '☁️ Save to Drive now'}
          </button>
          <button className="btn-secondary" onClick={handlePull}
            disabled={pulling || syncState === 'syncing'}
            style={{ padding: '10px 22px', fontSize: 14, gap: 8 }}>
            {pulling ? <><Spinner size={14} /> Restoring…</> : '⬇ Restore from Drive'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Data Location" subtitle="Where your FeeLedger data lives in Google Drive">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { icon: '📁', label: 'Root folder',  path: 'My Drive / FeeLedger /' },
            { icon: '🗃️', label: 'Data files',   path: 'FeeLedger / Data /' },
            { icon: '🧾', label: 'Receipt PDFs', path: 'FeeLedger / Receipts / YYYY /' },
            { icon: '📤', label: 'Exports',       path: 'FeeLedger / Exports /' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-dust)' : 'none' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 2 }}>{item.label}</p>
                <p style={{ fontSize: 12, color: 'var(--color-slate)', fontFamily: 'monospace' }}>{item.path}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--color-slate)', lineHeight: 1.65 }}>
          To permanently delete your data, delete the <strong>FeeLedger</strong> folder from your Google Drive.
          FeeLedger only accesses files it created — it cannot read any other Drive files.
        </p>
      </SectionCard>

      <SectionCard title="Sync Behaviour" subtitle="How FeeLedger keeps your data safe">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '⚡', text: 'Syncs immediately after each payment is recorded' },
            { icon: '⏱️', text: 'Auto-syncs every 5 minutes while the app is open' },
            { icon: '👁️', text: 'Syncs when you switch back to the app after 2+ minutes away' },
            { icon: '📶', text: 'Works offline — changes are saved locally and sync when back online' },
            { icon: '🔄', text: 'Retries automatically with increasing delays if sync fails (up to 3 times)' },
            { icon: '🖥️', text: 'Restores your data from Drive when you sign in on a new device' },
            { icon: '🛡️', text: 'Each data file includes a version stamp to detect schema changes' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <p style={{ fontSize: 14, color: 'var(--color-charcoal)', lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Conflict Handling" subtitle="What happens if you use two devices">
        <p style={{ fontSize: 14, color: 'var(--color-charcoal)', lineHeight: 1.7, marginBottom: 12 }}>
          FeeLedger uses a <strong>last-write-wins</strong> strategy.
          Each sync writes a full snapshot of your data to Drive.
          If you use two devices and make changes on both while offline,
          whichever device syncs last will overwrite the other.
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-charcoal)', lineHeight: 1.7 }}>
          <strong>Best practice:</strong> always tap "Save to Drive now" before switching devices,
          and "Restore from Drive" when opening on a second device after a gap.
          For a single-device workflow, the automatic sync is sufficient.
        </p>
      </SectionCard>
    </div>
  );
}


// ── Tax Tab ───────────────────────────────────────────────────────────────────

function TaxTab({ settings, onPatch }: { settings: AppSettings; onPatch: (p: Partial<AppSettings>) => Promise<void> }) {
  const defaultTax = settings.taxSettings ?? { enabled: false, rates: [], amountIsInclusive: false };
  const [tax, setTax] = useState(defaultTax);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRateName, setNewRateName] = useState('');
  const [newRateValue, setNewRateValue] = useState('');

  React.useEffect(() => {
    setTax(settings.taxSettings ?? { enabled: false, rates: [], amountIsInclusive: false });
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onPatch({ taxSettings: tax });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const addRate = () => {
    const v = parseFloat(newRateValue);
    if (!newRateName.trim() || isNaN(v) || v <= 0) return;
    const newRate: import('../types').TaxRate = {
      id: `tax_${Date.now()}`,
      name: newRateName.trim(),
      rate: v,
      enabled: true,
    };
    setTax(t => ({ ...t, rates: [...t.rates, newRate] }));
    setNewRateName('');
    setNewRateValue('');
  };

  const removeRate = (id: string) => setTax(t => ({ ...t, rates: t.rates.filter(r => r.id !== id) }));

  const IS: React.CSSProperties = {
    background: 'var(--color-white)', border: '1px solid rgba(20,20,19,0.22)',
    borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-sans)',
    fontSize: 14, color: 'var(--color-ink)', outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Tax / GST Settings" subtitle="Configure tax rates for your invoices">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <FormRow label="Enable Tax on Invoices">
            <Toggle checked={tax.enabled} onChange={v => setTax(t => ({ ...t, enabled: v }))}
              label={tax.enabled ? 'Enabled' : 'Disabled'} />
          </FormRow>

          {tax.enabled && (
            <>
              <FormRow label="Amount Entry" hint="How the amount is entered by default">
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { label: 'Exclusive of tax', value: false },
                    { label: 'Inclusive of tax', value: true },
                  ].map(opt => (
                    <button key={String(opt.value)} type="button"
                      onClick={() => setTax(t => ({ ...t, amountIsInclusive: opt.value }))}
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 10,
                        border: `1.5px solid ${tax.amountIsInclusive === opt.value ? 'var(--color-ink)' : 'var(--color-dust)'}`,
                        background: tax.amountIsInclusive === opt.value ? 'var(--color-ink)' : 'var(--color-white)',
                        color: tax.amountIsInclusive === opt.value ? 'var(--color-canvas)' : 'var(--color-ink)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormRow>

              <FormRow label="Tax Rates" hint="Add the tax rates you use. Users can pick from these when recording a payment.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--color-dust)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                  {tax.rates.length === 0 && (
                    <p style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-dust)' }}>No tax rates added yet.</p>
                  )}
                  {tax.rates.map((rate, i) => (
                    <div key={rate.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: i < tax.rates.length - 1 ? '1px solid var(--color-dust)' : 'none',
                      background: 'var(--color-white)',
                    }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{rate.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{rate.rate}%</p>
                      </div>
                      <button onClick={() => removeRate(rate.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--color-dust)', padding: '4px 8px' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...IS, flex: 2 }} value={newRateName} onChange={e => setNewRateName(e.target.value)}
                    placeholder="Name (e.g. GST, IGST)" />
                  <input style={{ ...IS, flex: 1 }} type="number" value={newRateValue} onChange={e => setNewRateValue(e.target.value)}
                    placeholder="%" min="0" max="100" />
                  <button onClick={addRate} className="btn-primary" style={{ padding: '0 16px', fontSize: 14, whiteSpace: 'nowrap' }}>
                    + Add
                  </button>
                </div>
              </FormRow>

              {tax.rates.length > 0 && (
                <FormRow label="Default Tax Rate">
                  <select style={{ ...IS, width: '100%', cursor: 'pointer' }}
                    value={tax.defaultRateId ?? ''}
                    onChange={e => setTax(t => ({ ...t, defaultRateId: e.target.value || undefined }))}>
                    <option value="">— No default —</option>
                    {tax.rates.map(r => <option key={r.id} value={r.id}>{r.name} ({r.rate}%)</option>)}
                  </select>
                </FormRow>
              )}
            </>
          )}
        </div>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', gap: 8 }}>
          {saving ? <><Spinner size={16} /> Saving…</> : 'Save Tax Settings'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

// ── Account Tab ────────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, signOut, accessToken } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState('');

  const handleDeleteAll = async () => {
    if (confirm !== 'DELETE') return;
    setDeleting(true);
    try {
      // Delete the FeeLedger root folder from Drive
      if (accessToken) {
        const { driveMetaRepository } = await import('../db/repositories/syncRepository');
        const { driveClient } = await import('../services/google/driveClient');
        const meta = await driveMetaRepository.get();
        if (meta.applicationRootFolderId) {
          await driveClient.deleteFile(accessToken, meta.applicationRootFolderId);
        }
      }
      // Clear local IndexedDB
      const { getDB } = await import('../db/indexeddb/database');
      const db = getDB();
      await Promise.all([
        db.students.clear(), db.batches.clear(), db.subjects.clear(),
        db.academicYears.clear(), db.payments.clear(), db.receipts.clear(),
        db.studentFields.clear(), db.paymentFields.clear(),
        db.settings.clear(), db.syncMeta.clear(), db.syncQueue.clear(), db.driveMeta.clear(),
      ]);
      // Clear localStorage
      localStorage.removeItem('fl_user');
      localStorage.removeItem('fl_token');
      localStorage.removeItem('fl_pwa_dismissed');
      localStorage.removeItem('fl_wa_template');

      signOut();
      navigate('/', { replace: true });
    } catch {
      setMsg('Failed to delete data. Please try again or delete the FeeLedger folder from Google Drive manually.');
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard title="Your Account" subtitle="Signed in via Google">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          {user?.photoUrl && (
            <img src={user.photoUrl} alt={user.displayName ?? 'User'} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)' }}>{user?.displayName ?? 'User'}</p>
            <p style={{ fontSize: 13, color: 'var(--color-slate)' }}>{user?.email}</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => { signOut(); navigate('/', { replace: true }); }}
          style={{ marginTop: 16, fontSize: 14, padding: '9px 20px' }}>
          Sign out
        </button>
      </SectionCard>

      <SectionCard title="Delete All Data" subtitle="Permanently remove your data from Google Drive and sign out">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 14, color: 'var(--color-charcoal)', lineHeight: 1.7 }}>
            This will permanently delete the <strong>FeeLedger</strong> folder from your Google Drive,
            removing all your members, payments, receipts, and settings.
            This action cannot be undone.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-slate)', lineHeight: 1.6 }}>
            Note: This removes your data from Drive and signs you out of FeeLedger.
            To revoke FeeLedger's Google account access entirely, visit{' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--color-link)' }}>
              myaccount.google.com/permissions
            </a>{' '}
            and remove FeeLedger.
          </p>

          {!showConfirm ? (
            <button onClick={() => setShowConfirm(true)}
              style={{ display: 'inline-flex', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14, color: '#b91c1c', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              Delete all my data…
            </button>
          ) : (
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 12 }}>
                Type DELETE to confirm permanent deletion:
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ flex: 1, minWidth: 140, background: 'var(--color-white)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none' }}
                />
                <button onClick={handleDeleteAll} disabled={confirm !== 'DELETE' || deleting}
                  style={{ background: confirm === 'DELETE' ? '#b91c1c' : 'var(--color-dust)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: confirm === 'DELETE' ? 'pointer' : 'not-allowed', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  {deleting ? 'Deleting…' : 'Delete Everything'}
                </button>
                <button onClick={() => { setShowConfirm(false); setConfirm(''); }}
                  style={{ background: 'none', border: '1px solid var(--color-dust)', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--color-slate)' }}>
                  Cancel
                </button>
              </div>
              {msg && <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 10 }}>{msg}</p>}
            </div>
          )}
        </div>
      </SectionCard>
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
      {activeTab === 'tax'     && <TaxTab settings={settings} onPatch={patch} />}
      {activeTab === 'sync'     && <SyncTab />}
      {activeTab === 'account'  && <AccountTab />}
    </div>
  );
}

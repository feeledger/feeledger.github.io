import React, { useEffect, useRef } from 'react';

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(20,20,19,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={ref}
        style={{
          background: 'var(--color-white)',
          borderRadius: 24,
          width: '100%',
          maxWidth: width,
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-dust)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-bone)', border: 'none',
              borderRadius: '50%', width: 32, height: 32,
              cursor: 'pointer', fontSize: 16, color: 'var(--color-slate)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-dust)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const d = size === 'sm' ? 12 : 16;

  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); !disabled && onChange(!checked); } }}
        style={{
          width: w, height: h, borderRadius: h,
          backgroundColor: checked ? 'var(--color-ink)' : 'var(--color-dust)',
          position: 'relative', transition: 'background-color 0.2s ease',
          flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{
          position: 'absolute',
          top: (h - d) / 2, left: checked ? w - d - (h - d) / 2 : (h - d) / 2,
          width: d, height: d, borderRadius: '50%',
          backgroundColor: 'white',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      {label && (
        <span style={{ fontSize: 14, color: 'var(--color-ink)', fontWeight: 400 }}>
          {label}
        </span>
      )}
    </label>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors: Record<string, { bg: string; color: string }> = {
    default: { bg: 'var(--color-bone)',           color: 'var(--color-slate)' },
    success: { bg: 'rgba(34,197,94,0.12)',        color: '#15803d' },
    warning: { bg: 'rgba(243,115,56,0.12)',       color: 'var(--color-signal)' },
    error:   { bg: 'rgba(239,68,68,0.12)',        color: '#b91c1c' },
    info:    { bg: 'rgba(56,96,190,0.1)',         color: 'var(--color-link)' },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      backgroundColor: c.bg, color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  emoji?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji = '📭', title, body, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12,
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>{emoji}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>{title}</p>
      {body && <p style={{ fontSize: 14, color: 'var(--color-slate)', maxWidth: 320, lineHeight: 1.6 }}>{body}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ── FormRow ───────────────────────────────────────────────────────────────────

interface FormRowProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormRow({ label, required, hint, error, children }: FormRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 13, fontWeight: 600,
        color: error ? '#b91c1c' : 'var(--color-ink)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-signal)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: 12, color: 'var(--color-slate)' }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: 12, color: '#b91c1c' }}>{error}</p>
      )}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <>
      <div style={{
        width: size, height: size,
        border: `2px solid var(--color-dust)`,
        borderTopColor: 'var(--color-ink)',
        borderRadius: '50%',
        animation: 'fl-spin 0.7s linear infinite',
        flexShrink: 0,
      }} />
      <style>{`@keyframes fl-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: 16,
      marginBottom: 32, flexWrap: 'wrap',
    }}>
      <div>
        {eyebrow && <p className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</p>}
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--color-slate)', marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionCard({ title, subtitle, children, action }: SectionCardProps) {
  return (
    <div style={{
      background: 'var(--color-white)',
      border: '1px solid var(--color-dust)',
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-dust)',
        }}>
          <div>
            {title && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{title}</p>}
            {subtitle && <p style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

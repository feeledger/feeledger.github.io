import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Logo } from '../components/Logo';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const STATS = [
  { value: 'Free forever',      label: 'Open source' },
  { value: 'Your Google Drive', label: 'Data storage' },
  { value: 'None',              label: 'Backend servers' },
  { value: 'Fully customisable',label: 'Member fields' },
];

const FEATURES = [
  { emoji: '🧑‍🎓', eyebrow: 'Members',         title: 'Know your members',        body: 'Flexible profiles with the fields you choose — phone, WhatsApp, membership expiry, parent contacts, and any custom field.' },
  { emoji: '💸',   eyebrow: 'Payments',        title: 'Record fees in seconds',   body: 'Search a member, enter the amount, pick a mode, save. Receipt generated automatically.' },
  { emoji: '🧾',   eyebrow: 'Receipts',        title: 'Professional PDF receipts',body: 'Generated locally in your browser. Saved to your Drive. Shareable via WhatsApp instantly.' },
  { emoji: '📲',   eyebrow: 'Reminders',       title: 'WhatsApp reminders',       body: 'One tap to send a pre-filled reminder with the member name and outstanding dues to their WhatsApp.' },
  { emoji: '🗂️',  eyebrow: 'Batches & groups',title: 'Organise your members',    body: 'Group members into batches, classes, or any custom group. Filter payments and reports by group.' },
  { emoji: '⚙️',  eyebrow: 'Settings',         title: 'Built for your workflow',  body: 'Custom fields, fee frequency (monthly/quarterly/yearly), due dates, tax rates, GSTIN, your logo — all configurable.' },
];

const PRIVACY_ITEMS = [
  'Data stored only in your Google Drive',
  'No FeeLedger servers receive your data',
  'PDF receipts generated in your browser',
  'Minimum Drive permission — only files FeeLedger creates',
  'Open-source code — inspect everything on GitHub',
  'No analytics or tracking by default',
];

export function LandingPage() {
  const { signIn, isAuthenticated, isLoading, gisReady } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignIn = () => {
    setSigningIn(true);
    signIn();
    setTimeout(() => setSigningIn(false), 8000);
  };

  const btnLabel = signingIn
    ? 'Opening Google…'
    : (!gisReady && !!import.meta.env.VITE_GOOGLE_CLIENT_ID)
    ? 'Loading…'
    : 'Continue with Google';

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)', overflowX: 'hidden' }}>

      {/* ══ Liquid glass nav ══ */}
      <nav className="nav-pill" role="navigation" aria-label="Site navigation">

        {/* Left: logo */}
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Logo size={32} variant="full" dark={false} />
        </a>

        {/* Centre: desktop links */}
        <div
          className="nav-links-desktop"
          style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1, justifyContent: 'center' }}
        >
          <a href="#features" className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Features</a>
          <a href="#privacy"  className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Privacy</a>
          <Link to="/privacy" className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Policy</Link>
          <a href="https://github.com/feeledger/feeledger.github.io" target="_blank" rel="noopener noreferrer"
             className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>GitHub ↗</a>
        </div>

        {/* Right: CTA + hamburger (always visible together on mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            className="btn-primary"
            onClick={handleSignIn}
            disabled={signingIn || isLoading}
            aria-label="Sign in with Google"
            style={{ padding: '9px 16px', gap: 8 }}
          >
            <GoogleIcon size={17} />
            <span className="nav-cta-label">Sign in</span>
          </button>

          {/* Hamburger — only on mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              display: 'none',
              alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              background: 'rgba(20,20,19,0.06)',
              border: 'none', borderRadius: '50%',
              cursor: 'pointer', fontSize: 18,
              color: 'var(--color-ink)',
              flexShrink: 0,
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 72, left: 16, right: 16, zIndex: 99,
          background: 'rgba(252,251,250,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24, padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid rgba(255,255,255,0.6)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {[
            { label: 'Features',   href: '#features',  internal: false },
            { label: 'Privacy',    href: '#privacy',   internal: false },
            { label: 'Policy',     href: '/privacy',   internal: true  },
            { label: 'GitHub ↗',   href: 'https://github.com/feeledger/feeledger.github.io', internal: false },
          ].map(item => (
            item.internal
              ? <Link key={item.label} to={item.href} onClick={() => setMenuOpen(false)}
                  className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>{item.label}</Link>
              : <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                  className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{item.label}</a>
          ))}
          <button className="btn-google" onClick={() => { setMenuOpen(false); handleSignIn(); }}
            disabled={signingIn || isLoading} style={{ marginTop: 4 }}>
            <GoogleIcon /> {btnLabel}
          </button>
        </div>
      )}

      {/* ══ Hero ══ */}
      <section style={{
        paddingTop: 'calc(14px + 58px + 56px)',
        paddingBottom: 72,
        paddingLeft: 'clamp(16px, 4vw, 48px)',
        paddingRight: 'clamp(16px, 4vw, 48px)',
        maxWidth: 1200, margin: '0 auto', position: 'relative',
      }}>
        {/* Ghost watermark — clipped so it never overflows left edge */}
        <div style={{
          position: 'absolute',
          top: 'calc(14px + 58px + 8px)',
          left: 0, right: 0,
          overflow: 'hidden',
          pointerEvents: 'none', userSelect: 'none',
          zIndex: 0,
        }}>
          <p className="ghost-headline" style={{
            fontSize: 'clamp(52px, 13vw, 128px)',
            fontWeight: 700, letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
            paddingLeft: 'clamp(16px, 4vw, 48px)',
            lineHeight: 1,
          }}>
            FeeLedger
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 40, alignItems: 'center', position: 'relative', zIndex: 1,
        }}>
          {/* Left */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 20 }}>Fee management</p>
            <h1 className="text-hero" style={{ marginBottom: 20, maxWidth: 520 }}>
              Collect fees.<br />
              Know your students.<br />
              Own your data.
            </h1>
            <p className="text-body" style={{ color: 'var(--color-slate)', maxWidth: 420, marginBottom: 36 }}>
              FeeLedger is a free, open-source fee management app for tutors, coaching
              centres, and small businesses. Your data stays in your Google Drive —
              always yours, never ours.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-google" onClick={handleSignIn} disabled={signingIn || isLoading}>
                <GoogleIcon /> {btnLabel}
              </button>
              <a href="#features" className="btn-secondary" style={{ borderRadius: 'var(--radius-btn)' }}>
                See how it works
              </a>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-dust)', fontWeight: 400 }}>
              No password. No credit card. Your data lives in your Google Drive.
            </p>
          </div>

          {/* Right: receipt preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: 'var(--color-ink)',
              borderRadius: 'var(--radius-hero)',
              padding: 'clamp(24px, 5vw, 40px)',
              maxWidth: 380, width: '100%',
              boxShadow: 'var(--shadow-card)',
              position: 'relative', overflow: 'hidden',
            }}>
              <svg viewBox="0 0 340 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }} aria-hidden="true">
                <path d="M-20 180 Q170 -20 360 120" stroke="var(--color-signal-light)" strokeWidth="1.5" fill="none"/>
                <path d="M-20 220 Q200 40 380 160" stroke="var(--color-signal-light)" strokeWidth="0.8" fill="none"/>
              </svg>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'var(--color-signal-light)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
                  Receipt — FEE-2026-09-0001
                </p>
                <div style={{ marginBottom: 18 }}>
                  <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 3 }}>Member</p>
                  <p style={{ color: 'var(--color-white)', fontWeight: 600, fontSize: 18 }}>Rahul Kumar</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 3 }}>Batch</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500, fontSize: 15 }}>Class 12 CBSE</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 3 }}>Mode</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500, fontSize: 15 }}>UPI</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <p style={{ color: 'var(--color-dust)', fontSize: 12 }}>Amount Paid</p>
                  <p style={{ color: 'var(--color-canvas)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>₹4,500</p>
                </div>
                <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    <p style={{ color: 'var(--color-white)', fontSize: 13, fontWeight: 500 }}>Saved to Drive</p>
                  </div>
                  <p style={{ color: 'var(--color-dust)', fontSize: 12 }}>Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Stats — clean cards ══ */}
      <section style={{ padding: '0 clamp(16px, 4vw, 48px) 0', maxWidth: 1200, margin: '0 auto 0' }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12,
          justifyContent: 'center', padding: '32px 0',
          borderTop: '1px solid var(--color-dust)',
          borderBottom: '1px solid var(--color-dust)',
        }}>
          {STATS.map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', color: 'var(--color-ink)', marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--color-slate)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Features — cards ══ */}
      <section id="features" className="section" style={{ paddingLeft: 'clamp(16px, 4vw, 48px)', paddingRight: 'clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>What it does</p>
            <h2 className="text-section" style={{ maxWidth: 440 }}>Everything a tutor needs. Nothing more.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 28, lineHeight: 1 }}>{f.emoji}</div>
                <div>
                  <p className="eyebrow" style={{ marginBottom: 8, display: 'flex' }}>{f.eyebrow}</p>
                  <h3 className="text-card-title" style={{ marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-slate)', lineHeight: 1.6 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ Privacy ══ */}
      <section id="privacy" className="section" style={{
        paddingLeft: 'clamp(16px, 4vw, 48px)', paddingRight: 'clamp(16px, 4vw, 48px)',
        backgroundColor: 'var(--color-lifted)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 48, alignItems: 'start',
        }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Data ownership</p>
            <h2 className="text-section" style={{ marginBottom: 20 }}>Your data is yours. Stored in your Drive.</h2>
            <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>
              FeeLedger stores everything — member records, payments, receipts — in a folder
              called <strong>FeeLedger</strong> inside your own Google Drive. We never see it,
              never store it, and never sell it.
            </p>
            <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 24 }}>
              The app runs entirely in your browser. The only server involved is Google's,
              which you already trust with your email.
            </p>
            <Link to="/privacy" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 600, color: 'var(--color-ink)',
              textDecoration: 'none', borderBottom: '1px solid var(--color-dust)',
              paddingBottom: 2,
            }}>
              Read our Privacy Policy →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PRIVACY_ITEMS.map(item => (
              <div key={item} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: 'var(--color-white)', borderRadius: 14,
                padding: '14px 16px', border: '1px solid var(--color-dust)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>✅</span>
                <p style={{ fontSize: 14, color: 'var(--color-charcoal)', lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="section" style={{ paddingLeft: 'clamp(16px, 4vw, 48px)', paddingRight: 'clamp(16px, 4vw, 48px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 className="text-section" style={{ marginBottom: 14 }}>Start managing fees today.</h2>
          <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 36 }}>
            Free. Open-source. No account to create — just your Google account.
          </p>
          <button className="btn-google" onClick={handleSignIn} disabled={signingIn || isLoading}
            style={{ fontSize: 17, padding: '14px 32px' }}>
            <GoogleIcon /> {btnLabel}
          </button>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer className="footer" style={{ paddingTop: 56, paddingBottom: 40, paddingLeft: 'clamp(16px, 4vw, 48px)', paddingRight: 'clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 className="text-section" style={{ color: 'var(--color-white)', marginBottom: 40, maxWidth: 440 }}>
            Built for small businesses who care about their members.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 28, marginBottom: 40 }}>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>Product</p>
              {[
                { label: 'Features',       href: '#features',  internal: false },
                { label: 'Privacy Policy', href: '/privacy',   internal: true  },
                { label: 'Open source',    href: 'https://github.com/feeledger/feeledger.github.io', internal: false },
              ].map(l => (
                <p key={l.label} style={{ marginBottom: 8 }}>
                  {l.internal
                    ? <Link to={l.href} className="text-footer-link" style={{ color: 'var(--color-white)', textDecoration: 'none' }}>{l.label}</Link>
                    : <a href={l.href} className="text-footer-link" style={{ color: 'var(--color-white)', textDecoration: 'none' }}
                         target={l.href.startsWith('http') ? '_blank' : undefined}
                         rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{l.label}</a>
                  }
                </p>
              ))}
            </div>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>Contribute</p>
              {[
                { label: 'GitHub ↗',        href: 'https://github.com/feeledger/feeledger.github.io' },
                { label: 'Report issue ↗',  href: 'https://github.com/feeledger/feeledger.github.io/issues' },
              ].map(l => (
                <p key={l.label} style={{ marginBottom: 8 }}>
                  <a href={l.href} className="text-footer-link" target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--color-white)', textDecoration: 'none' }}>{l.label}</a>
                </p>
              ))}
            </div>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>Data</p>
              {['Stored in your Google Drive', 'Never on our servers', 'GSTIN & tax support built in'].map(i => (
                <p key={i} className="text-footer-link" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{i}</p>
              ))}
            </div>
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <Logo size={28} variant="full" dark={true} />
            <p className="text-footer-link" style={{ color: 'var(--color-slate)' }}>
              Open-source · MIT Licence · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function FeatureCard({ emoji, title, body, eyebrow }: {
  emoji: string; title: string; body: string; eyebrow: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        backgroundColor: 'var(--color-white)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, flexShrink: 0,
      }}>
        {emoji}
      </div>
      <div>
        <p className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</p>
        <h3 className="text-card-title" style={{ marginBottom: 8 }}>{title}</h3>
        <p className="text-body" style={{ color: 'var(--color-slate)', maxWidth: 280 }}>{body}</p>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { signIn, isAuthenticated, isLoading, gisReady } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignIn = () => {
    setSigningIn(true);
    signIn();
    // Reset spinner after 8s in case popup is dismissed
    setTimeout(() => setSigningIn(false), 8000);
  };

  const btnLabel = signingIn
    ? 'Opening Google…'
    : !gisReady && import.meta.env.VITE_GOOGLE_CLIENT_ID
    ? 'Loading…'
    : 'Continue with Google';

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)' }}>

      {/* ── Floating nav pill ── */}
      <nav className="nav-pill" role="navigation" aria-label="Site navigation">
        <a href="/" style={{ textDecoration: 'none' }}>
          <Logo size={32} variant="full" dark={false} />
        </a>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1, justifyContent: 'center' }}>
          <a href="#features"  className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Features</a>
          <a href="#privacy"   className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Privacy</a>
          <a href="https://github.com/feeledger/feeledger.github.io" target="_blank" rel="noopener noreferrer"
             className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Open source</a>
        </div>

        <button
          className="btn-primary"
          onClick={handleSignIn}
          disabled={signingIn || isLoading}
          style={{ gap: 10, flexShrink: 0 }}
          aria-label="Sign in with Google"
        >
          <GoogleIcon size={18} />
          <span className="sign-in-label">Sign in</span>
        </button>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Open menu"
          style={{
            display: 'none',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: 4,
            fontSize: 22, color: 'var(--color-ink)',
            marginLeft: 8,
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 80, left: 24, right: 24, zIndex: 99,
          backgroundColor: 'var(--color-white)',
          borderRadius: 20, padding: 24,
          boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <a href="#features" onClick={() => setMenuOpen(false)} className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Features</a>
          <a href="#privacy"  onClick={() => setMenuOpen(false)} className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Privacy</a>
          <a href="https://github.com/feeledger/feeledger.github.io" target="_blank" rel="noopener noreferrer" className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>Open source ↗</a>
          <button className="btn-google" onClick={handleSignIn} disabled={signingIn || isLoading} style={{ marginTop: 8 }}>
            <GoogleIcon /> {btnLabel}
          </button>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{
        paddingTop: 'calc(24px + 72px + 64px)',
        paddingBottom: 80,
        paddingLeft: 24, paddingRight: 24,
        maxWidth: 1200, margin: '0 auto',
        position: 'relative',
      }}>
        {/* Ghost watermark */}
        <p className="ghost-headline" aria-hidden="true" style={{
          position: 'absolute',
          top: 'calc(24px + 72px + 16px)',
          left: -10,
          fontSize: 'clamp(56px, 9vw, 120px)',
          fontWeight: 700, letterSpacing: '-0.04em',
          whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none',
          overflow: 'hidden', maxWidth: '100%',
        }}>
          FeeLedger
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 48, alignItems: 'center', position: 'relative', zIndex: 1,
        }}>
          {/* Left: headline */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 24 }}>Fee management</p>
            <h1 className="text-hero" style={{ marginBottom: 24, maxWidth: 520 }}>
              Collect fees.<br />
              Know your students.<br />
              Own your data.
            </h1>
            <p className="text-body" style={{ color: 'var(--color-slate)', maxWidth: 440, marginBottom: 40 }}>
              FeeLedger is a free, open-source fee management app for tutors, coaching
              centres, and small businesses. Your data stays in your Google Drive —
              always yours, never ours.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                className="btn-google"
                onClick={handleSignIn}
                disabled={signingIn || isLoading}
              >
                <GoogleIcon /> {btnLabel}
              </button>
              <a href="#features" className="btn-secondary" style={{ borderRadius: 'var(--radius-btn)' }}>
                See how it works
              </a>
            </div>

            <p style={{ marginTop: 20, fontSize: 13, color: 'var(--color-dust)', fontWeight: 450 }}>
              No password. No credit card. Your data lives in your Google Drive.
            </p>
          </div>

          {/* Right: receipt preview card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: 'var(--color-ink)',
              borderRadius: 'var(--radius-hero)',
              padding: 40, maxWidth: 380, width: '100%',
              boxShadow: 'var(--shadow-card)',
              position: 'relative', overflow: 'hidden',
            }}>
              <svg viewBox="0 0 340 200" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12,
              }} aria-hidden="true">
                <path d="M-20 180 Q170 -20 360 120" stroke="var(--color-signal-light)" strokeWidth="1.5" fill="none"/>
                <path d="M-20 220 Q200 40 380 160" stroke="var(--color-signal-light)" strokeWidth="0.8" fill="none"/>
              </svg>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'var(--color-signal-light)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
                  Receipt — FEE-2026-09-0001
                </p>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 4 }}>Member</p>
                  <p style={{ color: 'var(--color-white)', fontWeight: 600, fontSize: 18 }}>Rahul Kumar</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 4 }}>Batch</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500 }}>Class 12 CBSE</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 12, marginBottom: 4 }}>Mode</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500 }}>UPI</p>
                  </div>
                </div>
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}>
                  <p style={{ color: 'var(--color-dust)', fontSize: 12 }}>Amount Paid</p>
                  <p style={{ color: 'var(--color-canvas)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>₹4,500</p>
                </div>
                <div style={{
                  marginTop: 16,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
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

      {/* ── Stats bar ── */}
      <div style={{
        background: 'var(--color-lifted)',
        borderTop: '1px solid var(--color-dust)',
        borderBottom: '1px solid var(--color-dust)',
        padding: '24px',
        display: 'flex', justifyContent: 'center',
        gap: 'clamp(20px, 5vw, 56px)', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Open source', value: 'Free forever' },
          { label: 'Data storage', value: 'Your Google Drive' },
          { label: 'Backend servers', value: 'None' },
          { label: 'Member fields', value: 'Fully customisable' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 'clamp(15px,2.5vw,18px)', letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>{s.value}</p>
            <p style={{ fontSize: 13, color: 'var(--color-slate)', fontWeight: 450 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section id="features" className="section" style={{ paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>What it does</p>
            <h2 className="text-section" style={{ maxWidth: 480 }}>Everything a tutor needs. Nothing more.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
            <FeatureCard emoji="🧑‍🎓" eyebrow="Members" title="Know your members"
              body="Flexible profiles with the fields you need — phone, WhatsApp, membership expiry, parent contacts, and any custom field." />
            <FeatureCard emoji="💸" eyebrow="Payments" title="Record fees in seconds"
              body="Search a member, enter the amount, pick a mode, and save. Receipt generated automatically." />
            <FeatureCard emoji="🧾" eyebrow="Receipts" title="Professional PDF receipts"
              body="Generated locally in your browser. Saved to your Drive. Shareable via WhatsApp or email instantly." />
            <FeatureCard emoji="📲" eyebrow="Reminders" title="WhatsApp reminders"
              body="One tap to send a pre-filled reminder with the member's name and outstanding dues to their WhatsApp." />
            <FeatureCard emoji="🗂️" eyebrow="Batches & groups" title="Organise your members"
              body="Group members into batches, classes, or any custom group. Filter payments and reports by group." />
            <FeatureCard emoji="⚙️" eyebrow="Settings" title="Built for your workflow"
              body="Custom fields, fee frequency (monthly/quarterly/yearly), due dates, tax rates, GSTIN, your logo — all configurable." />
          </div>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section id="privacy" className="section" style={{ paddingLeft: 24, paddingRight: 24, backgroundColor: 'var(--color-lifted)' }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 56, alignItems: 'center',
        }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Data ownership</p>
            <h2 className="text-section" style={{ marginBottom: 24 }}>Your data is yours. Stored in your Drive.</h2>
            <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 16 }}>
              FeeLedger stores everything — member records, payments, receipts — in a folder
              called <strong>FeeLedger</strong> inside your own Google Drive. We never see it,
              never store it, and never sell it.
            </p>
            <p className="text-body" style={{ color: 'var(--color-slate)' }}>
              The app runs entirely in your browser. The only server involved is Google's,
              which you already trust with your email.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Data stored only in your Google Drive',
              'No FeeLedger servers receive your data',
              'PDF receipts generated in your browser',
              'Minimum Drive permission — only files FeeLedger creates',
              'Open-source code — inspect everything on GitHub',
              'No analytics or tracking by default',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>✅</span>
                <p className="text-body" style={{ color: 'var(--color-charcoal)' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section" style={{ paddingLeft: 24, paddingRight: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 className="text-section" style={{ marginBottom: 16 }}>Start managing fees today.</h2>
          <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 40 }}>
            Free. Open-source. No account to create — just your Google account.
          </p>
          <button className="btn-google" onClick={handleSignIn} disabled={signingIn || isLoading}
            style={{ fontSize: 17, padding: '14px 36px' }}>
            <GoogleIcon /> {btnLabel}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer" style={{ paddingTop: 56, paddingBottom: 40, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 className="text-section" style={{ color: 'var(--color-white)', marginBottom: 40, maxWidth: 480 }}>
            Built for small businesses who care about their members.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 28, marginBottom: 40 }}>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>Product</p>
              {['Features', 'Privacy', 'Open source'].map(l => (
                <p key={l} style={{ marginBottom: 8 }}>
                  <a href={`#${l.toLowerCase().replace(' ', '-')}`} className="text-footer-link"
                     style={{ color: 'var(--color-white)', textDecoration: 'none' }}>{l}</a>
                </p>
              ))}
            </div>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 14 }}>Contribute</p>
              {[
                { label: 'GitHub ↗', href: 'https://github.com/feeledger/feeledger.github.io' },
                { label: 'Report an issue ↗', href: 'https://github.com/feeledger/feeledger.github.io/issues' },
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
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 20,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <Logo size={28} variant="full" dark={true} />
            <p className="text-footer-link" style={{ color: 'var(--color-slate)' }}>
              Open-source · MIT Licence · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 767px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn  { display: block !important; }
          .sign-in-label    { display: none; }
        }
        @media (min-width: 768px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}

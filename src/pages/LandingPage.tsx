import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// Rupee / ledger icon
function LedgerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-ink)"/>
      <path d="M8 10h16M8 16h10M8 22h12" stroke="var(--color-canvas)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 14c0 2.21-1.79 4-4 4s-4-1.79-4-4" stroke="var(--color-signal-light)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Feature orbit card
function FeatureCard({
  emoji,
  title,
  body,
  eyebrow,
}: {
  emoji: string;
  title: string;
  body: string;
  eyebrow: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'var(--color-white)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}
      >
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
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Render Google's own button inside our styled container if GIS available
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !googleBtnRef.current) return;
    // We render our own button and call signIn — GIS callback handles the rest
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      signIn();
    } finally {
      // State resets when navigation happens
      setTimeout(() => setSigningIn(false), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)' }}>
      {/* ── Floating nav pill ── */}
      <nav className="nav-pill" aria-label="Site navigation">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LedgerIcon />
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '-0.03em',
              color: 'var(--color-ink)',
            }}
          >
            FeeLedger
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 32 }}
          className="nav-links-desktop"
        >
          <a href="#features" className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>
            Features
          </a>
          <a href="#privacy" className="text-nav" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>
            Privacy
          </a>
          <a
            href="https://github.com/feeledger/feeledger"
            className="text-nav"
            style={{ color: 'var(--color-ink)', textDecoration: 'none' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source
          </a>
        </div>

        <button
          className="btn-primary"
          onClick={handleSignIn}
          disabled={signingIn || isLoading}
          style={{ marginLeft: 24, gap: 10 }}
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
          {signingIn ? 'Signing in…' : 'Sign in'}
        </button>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: 'calc(24px + 72px + 96px)',
          paddingBottom: 96,
          paddingLeft: 24,
          paddingRight: 24,
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Ghost watermark */}
        <p
          className="ghost-headline"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 'calc(24px + 72px + 48px)',
            left: -20,
            fontSize: 'clamp(72px, 10vw, 128px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            maxWidth: '100%',
          }}
        >
          FeeLedger
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 48,
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left: headline */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 24 }}>
              Fee management
            </p>
            <h1
              className="text-hero"
              style={{ marginBottom: 24, maxWidth: 560 }}
            >
              Collect fees.<br />
              Know your students.<br />
              Own your data.
            </h1>
            <p
              className="text-body"
              style={{ color: 'var(--color-slate)', maxWidth: 440, marginBottom: 40 }}
            >
              FeeLedger is a free, open-source fee management app for tutors and coaching
              centres. Your data stays in your Google Drive — always yours, never ours.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                className="btn-google"
                onClick={handleSignIn}
                disabled={signingIn || isLoading}
                aria-label="Continue with Google"
              >
                <GoogleIcon />
                {signingIn ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <a
                href="#features"
                className="btn-secondary"
                style={{ borderRadius: 'var(--radius-btn)' }}
              >
                See how it works
              </a>
            </div>

            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                color: 'var(--color-dust)',
                fontWeight: 450,
              }}
            >
              No password. No credit card. Your data lives in your Google Drive.
            </p>
          </div>

          {/* Right: hero card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                background: 'var(--color-ink)',
                borderRadius: 'var(--radius-hero)',
                padding: 40,
                maxWidth: 380,
                width: '100%',
                boxShadow: 'var(--shadow-card)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative arc inside card */}
              <svg
                viewBox="0 0 340 200"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
                aria-hidden="true"
              >
                <path d="M-20 180 Q170 -20 360 120" stroke="var(--color-signal-light)" strokeWidth="1.5" fill="none"/>
                <path d="M-20 220 Q200 40 380 160" stroke="var(--color-signal-light)" strokeWidth="0.8" fill="none"/>
              </svg>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ color: 'var(--color-signal-light)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 }}>
                  Receipt — FEE-2026-09-0001
                </p>
                <div style={{ marginBottom: 24 }}>
                  <p style={{ color: 'var(--color-dust)', fontSize: 13, marginBottom: 4 }}>Student</p>
                  <p style={{ color: 'var(--color-white)', fontWeight: 500, fontSize: 18 }}>Rahul Kumar</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 13, marginBottom: 4 }}>Batch</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500 }}>Class 12 CBSE</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--color-dust)', fontSize: 13, marginBottom: 4 }}>Mode</p>
                    <p style={{ color: 'var(--color-white)', fontWeight: 500 }}>UPI</p>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    paddingTop: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <p style={{ color: 'var(--color-dust)', fontSize: 13 }}>Amount Paid</p>
                  <p style={{ color: 'var(--color-canvas)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    ₹4,500
                  </p>
                </div>
                <div
                  style={{
                    marginTop: 20,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
      <div
        style={{
          background: 'var(--color-lifted)',
          borderTop: '1px solid var(--color-dust)',
          borderBottom: '1px solid var(--color-dust)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Open source', value: 'Free forever' },
          { label: 'Data storage', value: 'Your Google Drive' },
          { label: 'Backend servers', value: 'None' },
          { label: 'Student fields', value: 'Fully customisable' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-slate)', fontWeight: 450 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Features ── */}
      <section id="features" className="section" style={{ paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>What it does</p>
            <h2 className="text-section" style={{ maxWidth: 480 }}>
              Everything a tutor needs. Nothing more.
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 48,
            }}
          >
            <FeatureCard
              emoji="🧑‍🎓"
              eyebrow="Students"
              title="Know your students"
              body="Flexible student profiles with the fields you need — from parent contacts to batch membership to custom notes."
            />
            <FeatureCard
              emoji="💸"
              eyebrow="Payments"
              title="Record fees in seconds"
              body="Search a student, enter the amount, pick a mode, and save. Receipt generated automatically."
            />
            <FeatureCard
              emoji="🧾"
              eyebrow="Receipts"
              title="Professional PDF receipts"
              body="Generated locally in your browser. Saved to your Drive. Shareable via WhatsApp or email instantly."
            />
            <FeatureCard
              emoji="📊"
              eyebrow="Dashboard"
              title="Collection at a glance"
              body="Monthly totals, payment mode breakdown, batch-wise collection — all calculated live from your records."
            />
            <FeatureCard
              emoji="🗂️"
              eyebrow="Batches"
              title="Organise into batches"
              body="Group students into academic year batches. Track membership history. Filter reports by batch."
            />
            <FeatureCard
              emoji="🔧"
              eyebrow="Configuration"
              title="Built for your workflow"
              body="Customise student fields, receipt layouts, payment modes, and receipt numbering to match how you work."
            />
          </div>
        </div>
      </section>

      {/* ── Privacy section ── */}
      <section
        id="privacy"
        className="section"
        style={{
          paddingLeft: 24,
          paddingRight: 24,
          backgroundColor: 'var(--color-lifted)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Data ownership</p>
            <h2 className="text-section" style={{ marginBottom: 24 }}>
              Your data is yours. Stored in your Drive.
            </h2>
            <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 16 }}>
              FeeLedger stores everything — student records, payments, receipts — in a folder
              called <strong>FeeLedger</strong> inside your own Google Drive. We never see it,
              we never store it, and we never sell it.
            </p>
            <p className="text-body" style={{ color: 'var(--color-slate)' }}>
              The app runs entirely in your browser. The only server involved is Google's, which
              you're already trusting with your email.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '✅', text: 'Data stored only in your Google Drive' },
              { icon: '✅', text: 'No FeeLedger servers receive your data' },
              { icon: '✅', text: 'PDF receipts generated in your browser' },
              { icon: '✅', text: 'Minimum Drive permission — only files created by FeeLedger' },
              { icon: '✅', text: 'Open-source code — inspect everything' },
              { icon: '✅', text: 'No analytics or tracking by default' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, lineHeight: 1.4, flexShrink: 0 }}>{item.icon}</span>
                <p className="text-body" style={{ color: 'var(--color-charcoal)' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section
        className="section"
        style={{
          paddingLeft: 24,
          paddingRight: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 className="text-section" style={{ marginBottom: 16 }}>
            Start managing fees today.
          </h2>
          <p className="text-body" style={{ color: 'var(--color-slate)', marginBottom: 40 }}>
            Free. Open-source. No account to create — just your Google account.
          </p>
          <button
            className="btn-google"
            onClick={handleSignIn}
            disabled={signingIn || isLoading}
            style={{ fontSize: 18, padding: '16px 40px' }}
          >
            <GoogleIcon />
            {signingIn ? 'Opening Google…' : 'Get started with Google'}
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="footer"
        style={{
          paddingTop: 64,
          paddingBottom: 48,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <h2
            className="text-section"
            style={{
              color: 'var(--color-white)',
              marginBottom: 48,
              maxWidth: 480,
            }}
          >
            Built for tutors who care about their students.
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 32,
              marginBottom: 48,
            }}
          >
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 16 }}>
                Product
              </p>
              {['Features', 'Privacy', 'Open source'].map(link => (
                <p key={link} style={{ marginBottom: 8 }}>
                  <a
                    href={`#${link.toLowerCase().replace(' ', '-')}`}
                    className="text-footer-link"
                    style={{ color: 'var(--color-white)', textDecoration: 'none' }}
                  >
                    {link}
                  </a>
                </p>
              ))}
            </div>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 16 }}>
                Contribute
              </p>
              {[
                { label: 'GitHub ↗', href: 'https://github.com/feeledger/feeledger' },
                { label: 'Report an issue ↗', href: 'https://github.com/feeledger/feeledger/issues' },
              ].map(link => (
                <p key={link.label} style={{ marginBottom: 8 }}>
                  <a
                    href={link.href}
                    className="text-footer-link"
                    style={{ color: 'var(--color-white)', textDecoration: 'none' }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </p>
              ))}
            </div>
            <div>
              <p className="text-footer-header" style={{ color: 'var(--color-slate)', marginBottom: 16 }}>
                Data
              </p>
              {['Stored in your Google Drive', 'Never on our servers', 'GSTIN support built in'].map(item => (
                <p key={item} className="text-footer-link" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.12)',
              paddingTop: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LedgerIcon />
              <span style={{ color: 'var(--color-white)', fontWeight: 600, fontSize: 16 }}>FeeLedger</span>
            </div>
            <p className="text-footer-link" style={{ color: 'var(--color-slate)' }}>
              Open-source fee management · MIT License · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 767px) {
          .nav-links-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}

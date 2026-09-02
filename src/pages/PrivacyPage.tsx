import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const LAST_UPDATED = 'September 2026';

export function PrivacyPage() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)' }}>

      {/* Nav */}
      <nav className="nav-pill" role="navigation" aria-label="Site navigation">
        <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Logo size={32} variant="full" dark={false} />
        </Link>
        <div style={{ flex: 1 }} />
        <Link to="/" className="btn-secondary" style={{ fontSize: 14, padding: '8px 18px' }}>
          ← Back to home
        </Link>
      </nav>

      {/* Content */}
      <main style={{
        paddingTop: 'calc(14px + 58px + 56px)',
        paddingBottom: 96,
        paddingLeft: 'clamp(16px, 6vw, 64px)',
        paddingRight: 'clamp(16px, 6vw, 64px)',
        maxWidth: 760,
        margin: '0 auto',
      }}>
        <p className="eyebrow" style={{ marginBottom: 16 }}>Legal</p>
        <h1 className="text-section" style={{ marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: 'var(--color-slate)', marginBottom: 48 }}>
          Last updated: {LAST_UPDATED}
        </p>

        <Section title="Overview">
          <p>
            FeeLedger is a free, open-source web application. We are committed to protecting
            the privacy of every person who uses it. This policy explains what data FeeLedger
            handles, where it is stored, and what we do — and do not do — with it.
          </p>
          <p>
            The short version: <strong>your data never leaves your own Google Drive. We have
            no servers, no databases, and no way to see your data.</strong>
          </p>
        </Section>

        <Section title="Who we are">
          <p>
            FeeLedger is an open-source project hosted at{' '}
            <a href="https://github.com/feeledger/feeledger.github.io" target="_blank"
               rel="noopener noreferrer" style={{ color: 'var(--color-link)' }}>
              github.com/feeledger/feeledger.github.io
            </a>
            . It is served as a static website via GitHub Pages. There is no company,
            no subscription service, and no commercial entity behind this application.
          </p>
        </Section>

        <Section title="What data FeeLedger handles">
          <p>FeeLedger handles the following categories of data on your behalf:</p>
          <ul>
            <li><strong>Business profile</strong> — your business name, logo, address, GSTIN, tax rates, and contact details that you enter in Settings.</li>
            <li><strong>Member records</strong> — names, phone numbers, WhatsApp numbers, email addresses, dates, batch assignments, fee schedules, and any custom fields you configure.</li>
            <li><strong>Payment records</strong> — amounts, dates, payment modes, purposes, and notes.</li>
            <li><strong>Receipts</strong> — generated PDF receipts tied to payment records.</li>
            <li><strong>App configuration</strong> — field definitions, receipt templates, payment modes, receipt numbering settings, and academic year / batch configuration.</li>
          </ul>
        </Section>

        <Section title="Where your data is stored">
          <p>
            All data is stored in <strong>two places, both under your exclusive control</strong>:
          </p>
          <ol>
            <li>
              <strong>Your browser's IndexedDB</strong> — a local database on your device.
              This is used as a fast local cache so the app works quickly without a network
              request for every action. This data is local to your device and browser.
            </li>
            <li>
              <strong>Your Google Drive</strong> — inside a folder called{' '}
              <code style={{ background: 'var(--color-bone)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>FeeLedger</code>{' '}
              in your own Drive account. This is the persistent, backed-up copy of your data.
              FeeLedger uses the <code style={{ background: 'var(--color-bone)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>drive.file</code> scope,
              which means it can only access files and folders that it created — it cannot
              read any other files in your Drive.
            </li>
          </ol>
          <p>
            <strong>FeeLedger has no servers, no databases, and no cloud infrastructure of
            its own.</strong> No copy of your data is ever sent to or stored by the FeeLedger
            project or its contributors.
          </p>
        </Section>

        <Section title="Google account and permissions">
          <p>FeeLedger requests the following Google permissions:</p>
          <ul>
            <li><strong>Sign in with Google (OpenID Connect)</strong> — to identify you and personalise your session. We read your name, email address, and profile photo from Google. We do not store these on any server.</li>
            <li><strong>Google Drive — drive.file scope</strong> — to read and write only the files and folders that FeeLedger itself creates inside your Drive. We cannot access any other files.</li>
          </ul>
          <p>
            We do not request access to Gmail, Google Contacts, Google Calendar, or any
            other Google product.
          </p>
        </Section>

        <Section title="PDF receipts">
          <p>
            PDF receipts are generated entirely within your browser using local JavaScript
            libraries. The receipt data is never sent to any external service for rendering.
            The resulting PDF file is saved directly to the{' '}
            <code style={{ background: 'var(--color-bone)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>FeeLedger/Receipts/</code>{' '}
            folder in your Google Drive.
          </p>
        </Section>

        <Section title="WhatsApp reminders">
          <p>
            The WhatsApp reminder feature constructs a pre-filled message using your
            configured template and the member's details, then opens the official WhatsApp
            web interface (<code style={{ background: 'var(--color-bone)', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>wa.me</code>) with
            the message pre-populated. FeeLedger does not send any message on your behalf —
            you review and send it yourself. No message content or phone number is sent to
            any FeeLedger server.
          </p>
        </Section>

        <Section title="Analytics and tracking">
          <p>
            FeeLedger does not use Google Analytics, Mixpanel, Facebook Pixel, or any
            other analytics or tracking service. No behavioural data, usage data, or
            telemetry is collected about how you use the application.
          </p>
          <p>
            GitHub Pages (which hosts this site) may collect standard web server access
            logs (IP address, browser, pages visited) as part of their infrastructure.
            This is governed by{' '}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
               target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-link)' }}>
              GitHub's Privacy Statement
            </a>.
          </p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            FeeLedger uses <strong>sessionStorage</strong> (cleared when you close the tab)
            to hold your sign-in session during active use. It uses <strong>IndexedDB</strong>
            for local data caching. It does not use advertising cookies, third-party cookies,
            or persistent tracking cookies of any kind.
          </p>
        </Section>

        <Section title="Data deletion">
          <p>
            Because your data is in your own Google Drive, you are always in control of it.
            To delete your data:
          </p>
          <ol>
            <li>Open your Google Drive.</li>
            <li>Find the <strong>FeeLedger</strong> folder.</li>
            <li>Delete it. All your app data is gone.</li>
          </ol>
          <p>
            To clear the local browser cache, clear your browser's site data for
            feeledger.github.io in your browser settings.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            FeeLedger is designed for use by adults (tutors, business operators) who manage
            records of their students or members. It is not directed at children under 13.
            We do not knowingly collect data from children.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes, the updated version will be posted at this URL with a
            revised "Last updated" date. Because the application has no backend, we cannot
            notify you directly — please check this page periodically if you are concerned
            about policy changes.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this privacy policy can be raised by opening an issue on the
            project's GitHub repository:{' '}
            <a href="https://github.com/feeledger/feeledger.github.io/issues"
               target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-link)' }}>
              github.com/feeledger/feeledger.github.io/issues
            </a>
          </p>
        </Section>

        <div style={{
          marginTop: 56,
          padding: '24px',
          background: 'var(--color-lifted)',
          borderRadius: 20,
          border: '1px solid var(--color-dust)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--color-slate)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--color-ink)' }}>Plain English summary:</strong>{' '}
            Your data is in your Google Drive. We can't see it. We have no servers.
            The app is open source — you can read every line of code on GitHub.
            We don't track you. We don't advertise. We don't sell anything.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer" style={{ padding: 'clamp(32px, 5vw, 48px) clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Logo size={24} variant="full" dark={true} />
          <p className="text-footer-link" style={{ color: 'var(--color-slate)' }}>
            MIT Licence · Open source · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em',
        color: 'var(--color-ink)', marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '1px solid var(--color-dust)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
      <style>{`
        section p, section li {
          font-size: 15px;
          color: var(--color-charcoal);
          line-height: 1.75;
        }
        section ul, section ol {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </section>
  );
}

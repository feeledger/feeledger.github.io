import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'fl_pwa_dismissed';

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) return; // suppress for 2 weeks after dismissal
    }

    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Delay showing the prompt slightly so it doesn't appear immediately on page load
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const result = await installEvent.userChoice;
      if (result.outcome === 'accepted') {
        setShow(false);
        setInstallEvent(null);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show || !installEvent) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        background: 'var(--color-ink)',
        borderRadius: 20,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        maxWidth: 'calc(100vw - 32px)',
        width: 400,
        animation: 'slideUp 0.3s ease',
      }}
      role="dialog"
      aria-label="Install FeeLedger"
    >
      <img
        src="/logo-64.png"
        alt="FeeLedger"
        width={40}
        height={40}
        style={{ borderRadius: 10, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--color-canvas)', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
          Install FeeLedger
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.4 }}>
          Add to home screen for quick access, even offline.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: 10,
            padding: '7px 12px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13, fontFamily: 'var(--font-sans)',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            background: 'var(--color-canvas)',
            border: 'none', borderRadius: 10,
            padding: '7px 14px', cursor: 'pointer',
            color: 'var(--color-ink)',
            fontSize: 13, fontWeight: 700,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {installing ? 'Installing…' : 'Install'}
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

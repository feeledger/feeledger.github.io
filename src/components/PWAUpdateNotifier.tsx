import { useState, useEffect } from 'react';

export function PWAUpdateNotifier() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // Listen for vite-plugin-pwa's update event
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available — prompt user to refresh
              setShowUpdate(true);
            }
          });
        });
      });

      // Also listen for controller change (when skipWaiting fires)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New SW took control — reload only if we already flagged an update
        if (showUpdate) window.location.reload();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showUpdate) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 500,
      background: 'var(--color-ink)',
      borderRadius: 14,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      maxWidth: 'calc(100vw - 32px)',
      animation: 'slideDown 0.3s ease',
    }}>
      <p style={{ color: 'var(--color-canvas)', fontSize: 13, fontWeight: 500 }}>
        ✨ A new version of FeeLedger is ready.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'var(--color-canvas)', border: 'none',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          color: 'var(--color-ink)', fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-sans)', flexShrink: 0,
        }}
      >
        Refresh
      </button>
      <button
        onClick={() => setShowUpdate(false)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1,
          padding: 0, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-12px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}

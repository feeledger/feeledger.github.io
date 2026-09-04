import { useSync, type SyncState } from '../services/SyncContext';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATE_CONFIG: Record<SyncState, {
  dot: string;
  label: string;
  action?: boolean;
  pulse?: boolean;
}> = {
  idle:     { dot: 'var(--color-dust)',         label: 'Drive connected' },
  syncing:  { dot: 'var(--color-signal-light)',  label: 'Syncing…',          pulse: true },
  synced:   { dot: '#22c55e',                   label: 'Synced' },
  error:    { dot: '#ef4444',                   label: 'Sync error',         action: true },
  offline:  { dot: 'var(--color-slate)',         label: 'Offline' },
  no_drive: { dot: 'var(--color-dust)',          label: 'Connect Drive',      action: true },
};

interface SyncStatusBarProps {
  sidebar?: boolean;
}

export function SyncStatusBar({ sidebar = false }: SyncStatusBarProps) {
  const { syncState, lastSyncedAt, errorMessage, pendingCount, syncNow } = useSync();
  const config = STATE_CONFIG[syncState];

  const pendingLabel = pendingCount > 0 && syncState !== 'synced'
    ? `${pendingCount} pending`
    : null;

  if (sidebar) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: syncState === 'error'
            ? 'rgba(239,68,68,0.12)'
            : 'rgba(255,255,255,0.05)',
          cursor: config.action ? 'pointer' : 'default',
          transition: 'background 0.15s ease',
        }}
        onClick={config.action ? syncNow : undefined}
        title={errorMessage ?? (lastSyncedAt ? `Last synced: ${formatRelativeTime(lastSyncedAt)}` : 'Not synced yet')}
      >
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: config.dot, flexShrink: 0,
          animation: config.pulse ? 'fl-pulse 1s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          color: syncState === 'error' ? '#fca5a5' : 'rgba(255,255,255,0.5)',
          fontSize: 12, fontWeight: 450,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1,
        }}>
          {config.label}
          {syncState === 'synced' && lastSyncedAt ? ` · ${formatRelativeTime(lastSyncedAt)}` : ''}
          {pendingLabel ? ` · ${pendingLabel}` : ''}
        </span>
        {config.action && (
          <span style={{ color: syncState === 'error' ? '#fca5a5' : 'rgba(255,255,255,0.4)', fontSize: 13 }}>↺</span>
        )}
        <style>{`
          @keyframes fl-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.25; }
          }
        `}</style>
      </div>
    );
  }

  // Full banner variant (for Settings → Sync & Data)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderRadius: 12,
      background: syncState === 'error'
        ? 'rgba(239,68,68,0.06)'
        : syncState === 'offline'
        ? 'rgba(105,105,105,0.06)'
        : 'var(--color-canvas)',
      border: `1px solid ${
        syncState === 'error'   ? 'rgba(239,68,68,0.2)'   :
        syncState === 'offline' ? 'rgba(105,105,105,0.2)' :
        'var(--color-dust)'
      }`,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        backgroundColor: config.dot, flexShrink: 0,
        animation: config.pulse ? 'fl-pulse 1s ease-in-out infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
          {config.label}
          {pendingLabel && (
            <span style={{ fontWeight: 400, color: 'var(--color-slate)', marginLeft: 6 }}>
              · {pendingLabel}
            </span>
          )}
        </p>
        {errorMessage && (
          <p style={{ fontSize: 12, color: '#b91c1c', margin: '2px 0 0' }}>{errorMessage}</p>
        )}
        {!errorMessage && lastSyncedAt && (
          <p style={{ fontSize: 12, color: 'var(--color-slate)', margin: '2px 0 0' }}>
            Last synced {formatRelativeTime(lastSyncedAt)}
          </p>
        )}
        {syncState === 'offline' && (
          <p style={{ fontSize: 12, color: 'var(--color-slate)', margin: '2px 0 0' }}>
            Changes will sync when you're back online.
          </p>
        )}
      </div>
      {(config.action || syncState === 'idle' || syncState === 'synced') && (
        <button
          onClick={syncNow}
          disabled={syncState === 'syncing'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-link)',
            fontFamily: 'var(--font-sans)', fontWeight: 600,
            flexShrink: 0, padding: '4px 8px',
          }}
        >
          {syncState === 'syncing' ? 'Syncing…' : 'Sync now'}
        </button>
      )}
      <style>{`
        @keyframes fl-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

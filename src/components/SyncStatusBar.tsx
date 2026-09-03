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
  dot: string; label: string; action?: boolean;
}> = {
  idle:     { dot: 'var(--color-dust)',    label: 'Drive connected' },
  syncing:  { dot: 'var(--color-signal-light)', label: 'Syncing…' },
  synced:   { dot: '#22c55e',              label: 'Synced' },
  error:    { dot: '#ef4444',              label: 'Sync error', action: true },
  offline:  { dot: 'var(--color-slate)',   label: 'Offline' },
  no_drive: { dot: 'var(--color-dust)',    label: 'Connect Drive', action: true },
};

interface SyncStatusBarProps {
  /** If true, renders as a compact row for the sidebar */
  sidebar?: boolean;
}

export function SyncStatusBar({ sidebar = false }: SyncStatusBarProps) {
  const { syncState, lastSyncedAt, syncNow } = useSync();
  const config = STATE_CONFIG[syncState];

  if (sidebar) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderRadius: 'var(--radius-btn)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          cursor: config.action ? 'pointer' : 'default',
        }}
        onClick={config.action ? syncNow : undefined}
        title={lastSyncedAt ? `Last synced: ${formatRelativeTime(lastSyncedAt)}` : undefined}
      >
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: config.dot, flexShrink: 0,
          animation: syncState === 'syncing' ? 'fl-pulse 1s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 450,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {config.label}
          {syncState === 'synced' && lastSyncedAt ? ` · ${formatRelativeTime(lastSyncedAt)}` : ''}
        </span>
        {config.action && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>↺</span>
        )}
        <style>{`
          @keyframes fl-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // Full banner (for settings/dashboard)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      borderRadius: 12,
      background: syncState === 'error'
        ? 'rgba(239,68,68,0.08)'
        : 'var(--color-canvas)',
      border: `1px solid ${syncState === 'error' ? 'rgba(239,68,68,0.2)' : 'var(--color-dust)'}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: config.dot, flexShrink: 0,
        animation: syncState === 'syncing' ? 'fl-pulse 1s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500 }}>
        {config.label}
      </span>
      {lastSyncedAt && syncState !== 'error' && (
        <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>
          · Last synced {formatRelativeTime(lastSyncedAt)}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {(config.action || syncState === 'idle' || syncState === 'synced') && (
        <button
          onClick={syncNow}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--color-link)', fontFamily: 'var(--font-sans)',
            fontWeight: 600,
          }}
        >
          Sync now
        </button>
      )}
      <style>{`
        @keyframes fl-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

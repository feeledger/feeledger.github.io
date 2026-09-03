import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { pushAllToDrive, pullAllFromDrive } from './drive/driveSync';
import { driveMetaRepository } from '../db/repositories/syncRepository';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'no_drive';

interface SyncContextValue {
  syncState: SyncState;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ── Auto-sync interval ────────────────────────────────────────────────────────

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ── Provider ──────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, hasDriveAccess, isAuthenticated } = useAuth();
  const [syncState, setSyncState]       = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncingRef                      = useRef(false);

  // Load last sync time from IndexedDB on mount
  useEffect(() => {
    driveMetaRepository.get().then(meta => {
      if (meta.lastRemoteSyncAt) setLastSyncedAt(meta.lastRemoteSyncAt);
    });
  }, []);

  // Detect online/offline
  useEffect(() => {
    const handleOffline = () => setSyncState('offline');
    const handleOnline  = () => {
      setSyncState(prev => prev === 'offline' ? 'idle' : prev);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    if (!navigator.onLine) setSyncState('offline');
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  // ── Core sync helpers ────────────────────────────────────────────────────────

  const withSyncGuard = useCallback(async (fn: (token: string) => Promise<void>) => {
    if (syncingRef.current) return;
    if (!accessToken || !hasDriveAccess) {
      setSyncState('no_drive');
      return;
    }
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }

    syncingRef.current = true;
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      await fn(accessToken);
      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setSyncState('synced');
      // Reset to idle after 3s so the UI doesn't stay "synced" forever
      setTimeout(() => setSyncState(prev => prev === 'synced' ? 'idle' : prev), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMessage(msg);
      setSyncState('error');
      console.error('[FeeLedger] Sync error:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [accessToken, hasDriveAccess]);

  // ── Push (local → Drive) ─────────────────────────────────────────────────────

  const push = useCallback(() =>
    withSyncGuard(token => pushAllToDrive(token)),
    [withSyncGuard]
  );

  // ── Pull (Drive → local) ─────────────────────────────────────────────────────

  const pull = useCallback(() =>
    withSyncGuard(async token => {
      await pullAllFromDrive(token);
    }),
    [withSyncGuard]
  );

  // ── Sync now (push) ──────────────────────────────────────────────────────────

  const syncNow = useCallback(() => push(), [push]);

  // ── Initial pull on sign-in ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !hasDriveAccess || !accessToken) return;
    // On first auth, pull from Drive to restore any existing data
    pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasDriveAccess]);

  // ── Auto-push every 5 minutes ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !hasDriveAccess) return;
    const interval = setInterval(() => {
      if (navigator.onLine && accessToken) push();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, hasDriveAccess, accessToken, push]);

  // ── Push on page unload (best effort) ────────────────────────────────────────

  useEffect(() => {
    const handleUnload = () => {
      if (!accessToken || !hasDriveAccess || !navigator.onLine) return;
      // Use sendBeacon not available for authenticated Drive API.
      // Best effort: push if not already syncing.
      if (!syncingRef.current) push();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [accessToken, hasDriveAccess, push]);

  return (
    <SyncContext.Provider value={{ syncState, lastSyncedAt, errorMessage, push, pull, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

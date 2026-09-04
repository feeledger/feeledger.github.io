import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { pushAllToDrive, pullAllFromDrive } from './drive/driveSync';
import { driveMetaRepository, syncRepository } from '../db/repositories/syncRepository';
import { SYNC_RETRY_MAX, SYNC_RETRY_BASE_DELAY_MS } from '../config/index';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'no_drive';

interface SyncContextValue {
  syncState: SyncState;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  pendingCount: number;
  hasPendingChanges: boolean;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  syncNow: () => Promise<void>;
  enqueuePush: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_SYNC_INTERVAL_MS   = 5 * 60 * 1000;  // 5 min auto-push
const DEBOUNCE_MS             = 3_000;           // coalesce rapid changes
const MAX_RETRY_DELAY_MS      = 30_000;          // cap exponential backoff

// ── Exponential backoff ───────────────────────────────────────────────────────

function retryDelay(attempt: number): number {
  const delay = SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, hasDriveAccess, isAuthenticated } = useAuth();

  const [syncState, setSyncState]       = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const syncingRef      = useRef(false);
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineQueueRef = useRef<boolean>(false); // flag: changes queued while offline

  // ── Load last sync time on mount ─────────────────────────────────────────────

  useEffect(() => {
    driveMetaRepository.get().then(meta => {
      if (meta.lastRemoteSyncAt) setLastSyncedAt(meta.lastRemoteSyncAt);
    });
  }, []);

  // ── Online / offline detection ────────────────────────────────────────────────

  useEffect(() => {
    const handleOffline = () => {
      setSyncState('offline');
    };
    const handleOnline = () => {
      setSyncState(prev => prev === 'offline' ? 'idle' : prev);
      // If changes were queued while offline, push now
      if (offlineQueueRef.current) {
        offlineQueueRef.current = false;
        // Small delay to let network stabilise
        setTimeout(() => doPush(), 1500);
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    if (!navigator.onLine) setSyncState('offline');
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update pending count periodically ────────────────────────────────────────

  useEffect(() => {
    const refresh = () => {
      syncRepository.getPendingCount().then(setPendingCount).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Core push with retry ──────────────────────────────────────────────────────

  const doPush = useCallback(async () => {
    if (syncingRef.current) return;
    if (!accessToken || !hasDriveAccess) {
      setSyncState('no_drive');
      return;
    }
    if (!navigator.onLine) {
      setSyncState('offline');
      offlineQueueRef.current = true;
      return;
    }

    syncingRef.current = true;
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      await pushAllToDrive(accessToken);
      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setSyncState('synced');
      setRetryAttempt(0);
      setPendingCount(0);
      // Reset to idle after 3s
      setTimeout(() => setSyncState(prev => prev === 'synced' ? 'idle' : prev), 3000);

      // Clear stale failed queue items
      await syncRepository.clearCompleted();

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMessage(msg);
      setSyncState('error');
      console.error('[FeeLedger] Sync push error:', err);

      // Schedule retry with exponential backoff
      const attempt = retryAttempt;
      if (attempt < SYNC_RETRY_MAX) {
        const delay = retryDelay(attempt);
        setRetryAttempt(a => a + 1);
        retryTimerRef.current = setTimeout(() => {
          if (navigator.onLine) doPush();
        }, delay);
      }
    } finally {
      syncingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasDriveAccess, retryAttempt]);

  // ── Public push — debounced to coalesce rapid saves ───────────────────────────

  const push = useCallback(async () => {
    await doPush();
  }, [doPush]);

  // ── Enqueue push (debounced) — called after each local write ──────────────────

  const enqueuePush = useCallback(() => {
    // If offline, flag for later
    if (!navigator.onLine) {
      offlineQueueRef.current = true;
      setPendingCount(c => c + 1);
      return;
    }
    // Debounce: cancel previous timer, schedule new push
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPendingCount(c => c + 1);
    debounceRef.current = setTimeout(() => {
      doPush();
    }, DEBOUNCE_MS);
  }, [doPush]);

  // ── Pull (Drive → local) ──────────────────────────────────────────────────────

  const pull = useCallback(async () => {
    if (syncingRef.current) return;
    if (!accessToken || !hasDriveAccess) { setSyncState('no_drive'); return; }
    if (!navigator.onLine)               { setSyncState('offline');  return; }

    syncingRef.current = true;
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      const { restored } = await pullAllFromDrive(accessToken);
      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setSyncState('synced');
      setRetryAttempt(0);
      if (restored) setPendingCount(0);
      setTimeout(() => setSyncState(prev => prev === 'synced' ? 'idle' : prev), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setErrorMessage(msg);
      setSyncState('error');
      console.error('[FeeLedger] Sync pull error:', err);
    } finally {
      syncingRef.current = false;
    }
  }, [accessToken, hasDriveAccess]);

  // ── Sync now — explicit user action ──────────────────────────────────────────

  const syncNow = useCallback(() => push(), [push]);

  // ── Initial pull on sign-in ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !hasDriveAccess || !accessToken) return;
    pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasDriveAccess]);

  // ── Auto-push every 5 minutes ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !hasDriveAccess) return;
    const interval = setInterval(() => {
      if (navigator.onLine && accessToken && !syncingRef.current) doPush();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, hasDriveAccess, accessToken, doPush]);

  // ── Page visibility: push when tab becomes visible after being hidden ─────────

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && accessToken && hasDriveAccess) {
        const sinceSync = lastSyncedAt
          ? Date.now() - new Date(lastSyncedAt).getTime()
          : Infinity;
        // Push if more than 2 minutes since last sync
        if (sinceSync > 2 * 60 * 1000) doPush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [accessToken, hasDriveAccess, lastSyncedAt, doPush]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current)   clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const hasPendingChanges = pendingCount > 0 || syncState === 'error';

  return (
    <SyncContext.Provider value={{
      syncState, lastSyncedAt, errorMessage,
      pendingCount, hasPendingChanges,
      push, pull, syncNow, enqueuePush,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

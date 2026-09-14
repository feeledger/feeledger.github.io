import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { pushAllToDrive, pullAllFromDrive } from './drive/driveSync';
import { DriveAPIError } from './google/driveClient';
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
  /**
   * True once the app has attempted (successfully or not) its first Drive
   * check for the current sign-in. Screens that decide "does this account
   * already have data in Drive?" (e.g. onboarding routing) should wait for
   * this before deciding, so a new device doesn't jump to onboarding before
   * we've had a chance to check whether the account is already set up.
   */
  initialSyncAttempted: boolean;
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
// If Drive access can't be resolved (no popup shown, no callback fired) within
// this window, stop blocking dependent UI (e.g. onboarding routing) on it.
const INITIAL_SYNC_TIMEOUT_MS = 8_000;

// ── Exponential backoff ───────────────────────────────────────────────────────

function retryDelay(attempt: number): number {
  const delay = SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasDriveAccess, ensureFreshToken, requestDriveAccess } = useAuth();

  const [syncState, setSyncState]       = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [initialSyncAttempted, setInitialSyncAttempted] = useState(false);

  const syncingRef      = useRef(false);
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineQueueRef = useRef<boolean>(false);
  const initialSyncStartedRef = useRef(false);

  // ── Load last sync time on mount ─────────────────────────────────────────────

  useEffect(() => {
    driveMetaRepository.get().then(meta => {
      if (meta.lastRemoteSyncAt) setLastSyncedAt(meta.lastRemoteSyncAt);
    });
  }, []);

  // ── Online / offline detection ────────────────────────────────────────────────

  useEffect(() => {
    const handleOffline = () => setSyncState('offline');
    const handleOnline = () => {
      setSyncState(prev => prev === 'offline' ? 'idle' : prev);
      if (offlineQueueRef.current) {
        offlineQueueRef.current = false;
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
    if (!hasDriveAccess) { setSyncState('no_drive'); return; }
    if (!navigator.onLine) {
      setSyncState('offline');
      offlineQueueRef.current = true;
      return;
    }

    const token = await ensureFreshToken();
    if (!token) { setSyncState('no_drive'); return; }

    syncingRef.current = true;
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      try {
        await pushAllToDrive(token);
      } catch (err) {
        // Token expired mid-flight (rare, but the buffer isn't a hard guarantee
        // under clock drift/slow requests) — refresh once and retry exactly once.
        if (err instanceof DriveAPIError && err.code === 401) {
          const freshToken = await requestDriveAccess().then(ok => ok ? ensureFreshToken() : null);
          if (!freshToken) throw err;
          await pushAllToDrive(freshToken);
        } else {
          throw err;
        }
      }

      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setSyncState('synced');
      setRetryAttempt(0);
      setPendingCount(0);
      setTimeout(() => setSyncState(prev => prev === 'synced' ? 'idle' : prev), 3000);

      await syncRepository.clearCompleted();

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setErrorMessage(msg);
      setSyncState('error');
      console.error('[FeeLedger] Sync push error:', err);

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
  }, [hasDriveAccess, retryAttempt, ensureFreshToken, requestDriveAccess]);

  // ── Public push — debounced to coalesce rapid saves ───────────────────────────

  const push = useCallback(async () => {
    await doPush();
  }, [doPush]);

  // ── Enqueue push (debounced) — called after each local write ──────────────────

  const enqueuePush = useCallback(() => {
    if (!navigator.onLine) {
      offlineQueueRef.current = true;
      setPendingCount(c => c + 1);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPendingCount(c => c + 1);
    debounceRef.current = setTimeout(() => {
      doPush();
    }, DEBOUNCE_MS);
  }, [doPush]);

  // ── Pull (Drive → local) ──────────────────────────────────────────────────────

  const pull = useCallback(async () => {
    if (syncingRef.current) return;
    if (!hasDriveAccess) { setSyncState('no_drive'); markInitialSyncDone(); return; }
    if (!navigator.onLine) { setSyncState('offline'); markInitialSyncDone(); return; }

    const token = await ensureFreshToken();
    if (!token) { setSyncState('no_drive'); markInitialSyncDone(); return; }

    syncingRef.current = true;
    setSyncState('syncing');
    setErrorMessage(null);

    try {
      let result: { restored: boolean };
      try {
        result = await pullAllFromDrive(token);
      } catch (err) {
        if (err instanceof DriveAPIError && err.code === 401) {
          const freshToken = await requestDriveAccess().then(ok => ok ? ensureFreshToken() : null);
          if (!freshToken) throw err;
          result = await pullAllFromDrive(freshToken);
        } else {
          throw err;
        }
      }

      const ts = new Date().toISOString();
      setLastSyncedAt(ts);
      setSyncState('synced');
      setRetryAttempt(0);
      if (result.restored) {
        setPendingCount(0);
        window.dispatchEvent(new CustomEvent('fl:drive-restored'));
      }
      setTimeout(() => setSyncState(prev => prev === 'synced' ? 'idle' : prev), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setErrorMessage(msg);
      setSyncState('error');
      console.error('[FeeLedger] Sync pull error:', err);
    } finally {
      syncingRef.current = false;
      markInitialSyncDone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDriveAccess, ensureFreshToken, requestDriveAccess]);

  // ── Initial-sync gate helpers ─────────────────────────────────────────────────

  const markInitialSyncDone = useCallback(() => {
    setInitialSyncAttempted(true);
  }, []);

  // ── Sync now — explicit user action ──────────────────────────────────────────

  const syncNow = useCallback(() => push(), [push]);

  // ── On sign-in: ensure Drive access, then pull once before anything else ─────
  // This is what lets an already-onboarded account on a NEW device skip
  // onboarding — we check Drive for existing data before any routing
  // decision is made elsewhere in the app (see ProtectedRoute).

  useEffect(() => {
    if (!isAuthenticated) return;
    if (initialSyncStartedRef.current) return;
    initialSyncStartedRef.current = true;

    // Hard timeout so a silently-failing/blocked auth popup never leaves
    // dependent screens (onboarding routing) stuck on a loading state forever.
    const timeout = setTimeout(markInitialSyncDone, INITIAL_SYNC_TIMEOUT_MS);

    pull().finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Auto-push every 5 minutes ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !hasDriveAccess) return;
    const interval = setInterval(() => {
      if (navigator.onLine && !syncingRef.current) doPush();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, hasDriveAccess, doPush]);

  // ── Page visibility: push when tab becomes visible after being hidden ─────────

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && hasDriveAccess) {
        const sinceSync = lastSyncedAt
          ? Date.now() - new Date(lastSyncedAt).getTime()
          : Infinity;
        if (sinceSync > 2 * 60 * 1000) doPush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hasDriveAccess, lastSyncedAt, doPush]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current)   clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ── Push after onboarding completes or expired batches are processed ─────────

  useEffect(() => {
    const handler = () => enqueuePush();
    window.addEventListener('fl:onboarding-complete', handler);
    window.addEventListener('fl:batch-lifecycle-processed', handler);
    return () => {
      window.removeEventListener('fl:onboarding-complete', handler);
      window.removeEventListener('fl:batch-lifecycle-processed', handler);
    };
  }, [enqueuePush]);

  const hasPendingChanges = pendingCount > 0 || syncState === 'error';

  return (
    <SyncContext.Provider value={{
      syncState, lastSyncedAt, errorMessage,
      pendingCount, hasPendingChanges, initialSyncAttempted,
      push, pull, syncNow, enqueuePush,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

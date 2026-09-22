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
  initialSyncAttempted: boolean;
  push: () => Promise<void>;
  pull: () => Promise<{ restored: boolean } | undefined>;
  syncNow: () => Promise<void>;
  enqueuePush: () => void;
  /**
   * Explicit, user-initiated "Connect Google Drive" action. Forces a visible
   * consent dialog (never silently no-ops), then immediately checks Drive
   * for existing data and, if none is found, pushes current local data so
   * the FeeLedger folder is created in Drive right away.
   */
  connectDrive: () => Promise<boolean>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ── Constants ─────────────────────────────────────────────────────────────────

const AUTO_SYNC_INTERVAL_MS   = 5 * 60 * 1000;
const DEBOUNCE_MS             = 3_000;
const MAX_RETRY_DELAY_MS      = 30_000;
const INITIAL_SYNC_TIMEOUT_MS = 8_000;

function retryDelay(attempt: number): number {
  const delay = SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ensureFreshToken, connectDriveInteractive } = useAuth();

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

  useEffect(() => {
    driveMetaRepository.get().then(meta => {
      if (meta.lastRemoteSyncAt) setLastSyncedAt(meta.lastRemoteSyncAt);
    });
  }, []);

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

  useEffect(() => {
    const refresh = () => {
      syncRepository.getPendingCount().then(setPendingCount).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Core push ──────────────────────────────────────────────────────────────
  // Always asks ensureFreshToken() for a usable token — never pre-gates on a
  // `hasDriveAccess` flag. A previous version gated this check BEFORE ever
  // calling ensureFreshToken(), which meant Drive access could never be
  // acquired in the first place for users who signed in via One Tap (the
  // default path) — the entire sync pipeline was silently a no-op. Do not
  // reintroduce a pre-check like that here.

  const doPush = useCallback(async () => {
    if (syncingRef.current) return;
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
        if (err instanceof DriveAPIError && err.code === 401) {
          const freshToken = await ensureFreshToken();
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
      console.error('[FeeLedger] Sync push error:', err);

      if (err instanceof DriveAPIError && err.code === 401) {
        // The token was refused even after ensureFreshToken()'s own retry —
        // Drive access needs a real reconnect (a tap), not another silent
        // background retry that will just fail the same way. "no_drive"
        // already renders the friendly "Connect Drive" button, wired to the
        // redirect-capable connectDriveInteractive() for standalone PWAs.
        setErrorMessage(null);
        setSyncState('no_drive');
      } else {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setErrorMessage(msg);
        setSyncState('error');

        const attempt = retryAttempt;
        if (attempt < SYNC_RETRY_MAX) {
          const delay = retryDelay(attempt);
          setRetryAttempt(a => a + 1);
          retryTimerRef.current = setTimeout(() => {
            if (navigator.onLine) doPush();
          }, delay);
        }
      }
    } finally {
      syncingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAttempt, ensureFreshToken]);

  const push = useCallback(async () => {
    await doPush();
  }, [doPush]);

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

  // ── Pull ───────────────────────────────────────────────────────────────────
  // Same principle: never pre-gate on hasDriveAccess.

  const markInitialSyncDone = useCallback(() => {
    setInitialSyncAttempted(true);
  }, []);

  const pull = useCallback(async () => {
    if (syncingRef.current) return;
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
          const freshToken = await ensureFreshToken();
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
      return result;
    } catch (err) {
      console.error('[FeeLedger] Sync pull error:', err);

      if (err instanceof DriveAPIError && err.code === 401) {
        setErrorMessage(null);
        setSyncState('no_drive');
      } else {
        const msg = err instanceof Error ? err.message : 'Restore failed';
        setErrorMessage(msg);
        setSyncState('error');
      }
      return { restored: false };
    } finally {
      syncingRef.current = false;
      markInitialSyncDone();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureFreshToken, markInitialSyncDone]);

  // ── Connect Drive — explicit user action ──────────────────────────────────

  const connectDrive = useCallback(async (): Promise<boolean> => {
    const granted = await connectDriveInteractive();
    if (!granted) {
      setSyncState('no_drive');
      return false;
    }
    const result = await pull();
    if (!result?.restored) {
      await push();
    }
    return true;
  }, [connectDriveInteractive, pull, push]);

  const syncNow = useCallback(() => push(), [push]);

  // ── On sign-in: best-effort silent initial pull ───────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
    if (initialSyncStartedRef.current) return;
    initialSyncStartedRef.current = true;

    const timeout = setTimeout(markInitialSyncDone, INITIAL_SYNC_TIMEOUT_MS);
    pull().finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Auto-push every 5 minutes ─────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (navigator.onLine && !syncingRef.current) doPush();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, doPush]);

  // ── Page visibility ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const sinceSync = lastSyncedAt
          ? Date.now() - new Date(lastSyncedAt).getTime()
          : Infinity;
        if (sinceSync > 2 * 60 * 1000) doPush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [lastSyncedAt, doPush]);

  useEffect(() => {
    return () => {
      if (debounceRef.current)   clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

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
      push, pull, syncNow, enqueuePush, connectDrive,
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

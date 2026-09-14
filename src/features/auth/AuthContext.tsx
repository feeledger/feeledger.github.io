import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';
import type { AppUser } from '../../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  /** Epoch ms when accessToken expires. null if no token or unknown. */
  tokenExpiresAt: number | null;
  hasDriveAccess: boolean;
  gisReady: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: () => void;
  signOut: () => void;
  requestDriveAccess: () => Promise<boolean>;
  /**
   * Returns a Drive access token guaranteed to be valid for at least a
   * couple more minutes, refreshing it silently first if the current one
   * is missing, expired, or about to expire. Returns null if no token
   * could be obtained (caller should treat this as "no Drive access").
   */
  ensureFreshToken: () => Promise<string | null>;
}

// ── GIS window types ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: (cb?: (n: GisNotification) => void) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
        oauth2: {
          initTokenClient: (config: object) => TokenClient;
        };
      };
    };
  }
}

interface GisNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getDismissedReason: () => string;
}

interface TokenClient {
  requestAccessToken: (cfg?: { prompt?: string }) => void;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number; // seconds, typically 3599
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJwt(token: string): Record<string, unknown> {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

function buildUser(credential: string): AppUser {
  const p = parseJwt(credential);
  const now = new Date().toISOString();
  return {
    id: (p.sub as string) ?? crypto.randomUUID(),
    googleSubjectId: p.sub as string | undefined,
    email: p.email as string | undefined,
    displayName: p.name as string | undefined,
    photoUrl: p.picture as string | undefined,
    createdAt: now,
    updatedAt: now,
  };
}

// Use localStorage so session persists across tab closes and PWA restarts.
// The identity (who's signed in) persists indefinitely — but the Drive
// access TOKEN itself expires (~1hr from Google) and is refreshed silently
// as needed; it is never trusted purely because it exists in storage.
const SESSION_USER_KEY   = 'fl_user';
const SESSION_TOKEN_KEY  = 'fl_token';
const TOKEN_EXPIRES_KEY  = 'fl_token_expires_at';
const STORAGE = localStorage;

// Refresh proactively if less than this many ms remain on the token.
const REFRESH_BUFFER_MS = 3 * 60 * 1000; // 3 minutes
const DEFAULT_TOKEN_LIFETIME_S = 3600;

function isTokenValid(expiresAt: number | null): boolean {
  return !!expiresAt && Date.now() < expiresAt - REFRESH_BUFFER_MS;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    tokenExpiresAt: null,
    hasDriveAccess: false,
    gisReady: false,
  });

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  // Tracks an in-flight silent refresh so concurrent callers share one promise
  // instead of firing multiple simultaneous token requests.
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  // ── Restore session on mount ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = STORAGE.getItem(SESSION_USER_KEY);
      const tok = STORAGE.getItem(SESSION_TOKEN_KEY);
      const expiresRaw = STORAGE.getItem(TOKEN_EXPIRES_KEY);
      const expiresAt = expiresRaw ? Number(expiresRaw) : null;

      if (raw) {
        const user = JSON.parse(raw) as AppUser;
        const tokenStillValid = isTokenValid(expiresAt);
        setState(s => ({
          ...s,
          user,
          isAuthenticated: true,
          isLoading: false,
          // Only trust a persisted token if it hasn't actually expired.
          // An expired/near-expired token is treated as "no Drive access yet"
          // so the app silently refreshes it before the first Drive call,
          // instead of attempting a request that will 401.
          accessToken: tokenStillValid ? tok : null,
          tokenExpiresAt: tokenStillValid ? expiresAt : null,
          hasDriveAccess: tokenStillValid && !!tok,
        }));
        return;
      }
    } catch { /* ignore */ }
    setState(s => ({ ...s, isLoading: false }));
  }, []);

  // ── Wait for GIS script then initialise ─────────────────────────────────

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    const user = buildUser(response.credential);
    STORAGE.setItem(SESSION_USER_KEY, JSON.stringify(user));
    setState(s => ({ ...s, user, isAuthenticated: true, isLoading: false }));
  }, []);

  useEffect(() => {
    if (!clientId) {
      setState(s => ({ ...s, gisReady: false }));
      return;
    }

    let attempts = 0;
    const maxAttempts = 40; // 10 seconds

    const tryInit = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });

        setState(s => ({ ...s, gisReady: true }));
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryInit, 250);
      }
    };

    tryInit();
  }, [clientId, handleCredential]);

  // ── Sign in ──────────────────────────────────────────────────────────────

  const signIn = useCallback(() => {
    if (!clientId || !state.gisReady) {
      const mock: AppUser = {
        id: 'dev_user_01',
        email: 'dev@feeledger.app',
        displayName: 'Dev User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      STORAGE.setItem(SESSION_USER_KEY, JSON.stringify(mock));
      setState(s => ({ ...s, user: mock, isAuthenticated: true, isLoading: false }));
      return;
    }

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        requestDriveAndIdentify();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, state.gisReady]);

  // Fallback: use the OAuth2 token flow to get both identity + Drive token
  const requestDriveAndIdentify = useCallback(() => {
    if (!clientId || !window.google) return;

    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.file',
      ].join(' '),
      callback: async (resp: GoogleTokenResponse) => {
        if (resp.error || !resp.access_token) return;

        const expiresAt = Date.now() + (resp.expires_in ?? DEFAULT_TOKEN_LIFETIME_S) * 1000;

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          const info = await res.json() as {
            sub: string; email: string; name: string; picture: string;
          };
          const now = new Date().toISOString();
          const user: AppUser = {
            id: info.sub,
            googleSubjectId: info.sub,
            email: info.email,
            displayName: info.name,
            photoUrl: info.picture,
            createdAt: now,
            updatedAt: now,
          };
          STORAGE.setItem(SESSION_USER_KEY, JSON.stringify(user));
          STORAGE.setItem(SESSION_TOKEN_KEY, resp.access_token);
          STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
          setState(s => ({
            ...s,
            user,
            isAuthenticated: true,
            isLoading: false,
            accessToken: resp.access_token,
            tokenExpiresAt: expiresAt,
            hasDriveAccess: true,
          }));
        } catch {
          STORAGE.setItem(SESSION_TOKEN_KEY, resp.access_token);
          STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
          setState(s => ({
            ...s,
            accessToken: resp.access_token,
            tokenExpiresAt: expiresAt,
            hasDriveAccess: true,
          }));
        }
      },
    });

    tc.requestAccessToken({ prompt: 'select_account' });
  }, [clientId]);

  // ── Request Drive access (interactive-capable — used on first grant) ─────

  const requestDriveAccess = useCallback((): Promise<boolean> => {
    if (!clientId || !window.google) {
      const mockToken = 'dev_token_mock';
      const expiresAt = Date.now() + DEFAULT_TOKEN_LIFETIME_S * 1000;
      STORAGE.setItem(SESSION_TOKEN_KEY, mockToken);
      STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
      setState(s => ({ ...s, accessToken: mockToken, tokenExpiresAt: expiresAt, hasDriveAccess: true }));
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const tc = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp: GoogleTokenResponse) => {
          if (resp.error || !resp.access_token) {
            resolve(false);
            return;
          }
          const expiresAt = Date.now() + (resp.expires_in ?? DEFAULT_TOKEN_LIFETIME_S) * 1000;
          STORAGE.setItem(SESSION_TOKEN_KEY, resp.access_token);
          STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
          setState(s => ({
            ...s,
            accessToken: resp.access_token,
            tokenExpiresAt: expiresAt,
            hasDriveAccess: true,
          }));
          resolve(true);
        },
      });
      // Empty prompt = attempt silently first; Google shows UI only if
      // this app+scope has never been consented to in this browser before.
      tc.requestAccessToken({ prompt: '' });
    });
  }, [clientId]);

  // ── Ensure a fresh token — the function nearly everything should call ────

  const ensureFreshToken = useCallback((): Promise<string | null> => {
    // Read the LATEST state via a functional update trick isn't available outside
    // setState, so we re-read from storage as the source of truth here, since
    // this can be called from contexts where `state` might be a stale closure.
    const tok = STORAGE.getItem(SESSION_TOKEN_KEY);
    const expiresRaw = STORAGE.getItem(TOKEN_EXPIRES_KEY);
    const expiresAt = expiresRaw ? Number(expiresRaw) : null;

    if (tok && isTokenValid(expiresAt)) {
      return Promise.resolve(tok);
    }

    // Share one in-flight refresh across concurrent callers
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const refreshPromise = requestDriveAccess()
      .then(granted => (granted ? STORAGE.getItem(SESSION_TOKEN_KEY) : null))
      .finally(() => { refreshInFlightRef.current = null; });

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [requestDriveAccess]);

  // ── Sign out ─────────────────────────────────────────────────────────────

  const signOut = useCallback(() => {
    STORAGE.removeItem(SESSION_USER_KEY);
    STORAGE.removeItem(SESSION_TOKEN_KEY);
    STORAGE.removeItem(TOKEN_EXPIRES_KEY);

    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.cancel();
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      accessToken: null,
      tokenExpiresAt: null,
      hasDriveAccess: false,
      gisReady: state.gisReady,
    });
  }, [clientId, state.gisReady]);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, requestDriveAccess, ensureFreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

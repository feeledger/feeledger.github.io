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
   * Same as requestDriveAccess, but forces Google to show a visible consent
   * dialog every time (prompt: 'consent'), rather than attempting a silent
   * grant first. Use this for direct, explicit user actions like a "Connect
   * Drive" button click, where we want a guaranteed, visible outcome instead
   * of a request that might silently no-op.
   */
  connectDriveInteractive: () => Promise<boolean>;
  /**
   * Standalone-PWA only: if the token has expired and we have a prior
   * session to silently restore, starts a redirect-based reconnect and
   * returns true (caller should stop — the page is about to unload).
   * Returns false if there's nothing to do (token still valid, not
   * standalone, no prior session, or already tried once this tab session).
   * Intended only for "app opened/resumed" moments — see the function's
   * own comment for why it's not wired into every token check.
   */
  attemptSilentReconnect: () => boolean;
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

// ── Standalone-PWA reauth (redirect-based) ───────────────────────────────
//
// `requestDriveAndIdentify`, `requestDriveAccess` and `connectDriveInteractive`
// (below) all use Google's popup-based OAuth2 token client. That works fine
// in a normal browser tab, but when FeeLedger is installed and launched as a
// standalone PWA on Android, the popup it opens loses its `window.opener`
// link back to this page, so the token callback never fires — this is what
// caused "Sync now" to do nothing, and silent background refreshes to fail
// after the ~1hr access token expired. There's no refresh token available in
// a backend-less app, so once the token expires, some kind of fresh round
// trip to Google is unavoidable — we just do it via a full-page redirect
// instead of a popup when running standalone, since redirects aren't subject
// to the same opener restrictions.

const OAUTH_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_REDIRECT_STATE = 'feeledger_auth';
// Set right before an *automatic* (non-tap) silent reconnect redirect, so we
// only ever attempt one per tab session — if it comes back with an error
// (session truly gone / revoked), we don't redirect-loop, we just fall back
// to the manual "Connect Drive" button.
const AUTO_REAUTH_GUARD_KEY = 'fl_auto_reauth_attempted';
const OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

function isStandalonePWA(): boolean {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    // iOS "Add to Home Screen" flag — harmless to also check here.
    return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * Navigate the whole page to Google's OAuth authorize endpoint and come
 * straight back to the app with the token in the URL fragment. Used only in
 * standalone-PWA mode, and only from a real user tap (so the navigation
 * feels expected rather than surprising).
 */
function beginRedirectAuth(clientId: string, promptMode?: 'none' | 'consent', loginHint?: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/`,
    response_type: 'token',
    scope: OAUTH_SCOPES,
    include_granted_scopes: 'true',
    state: OAUTH_REDIRECT_STATE,
  });
  if (promptMode) params.set('prompt', promptMode);
  if (loginHint) params.set('login_hint', loginHint);
  window.location.assign(`${OAUTH_AUTH_ENDPOINT}?${params.toString()}`);
}

/** Resolves to `fallback` if `promise` hasn't settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(fallback); }
    }, ms);
    promise.then(
      (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(fallback); } },
    );
  });
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

  // Applies a token obtained via the standalone-PWA redirect flow: persists
  // it, fetches the identity, and marks the session authenticated with
  // Drive access. Shared by the redirect-return handler below.
  const applyTokenResponse = useCallback(async (accessToken: string, expiresAt: number) => {
    STORAGE.setItem(SESSION_TOKEN_KEY, accessToken);
    STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const info = await res.json() as { sub: string; email: string; name: string; picture: string };
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
      sessionStorage.removeItem(AUTO_REAUTH_GUARD_KEY);
      setState(s => ({
        ...s, user, isAuthenticated: true, isLoading: false,
        accessToken, tokenExpiresAt: expiresAt, hasDriveAccess: true,
      }));
    } catch {
      // Identity fetch failed but the Drive token itself is good — keep
      // whichever user record is already in storage (if any) and proceed.
      sessionStorage.removeItem(AUTO_REAUTH_GUARD_KEY);
      setState(s => ({
        ...s, isAuthenticated: true, isLoading: false,
        accessToken, tokenExpiresAt: expiresAt, hasDriveAccess: true,
      }));
    }
  }, []);

  // ── Restore session on mount ─────────────────────────────────────────────

  useEffect(() => {
    // Returning from a standalone-PWA redirect reauth (see beginRedirectAuth
    // above)? The token comes back in the URL fragment rather than a popup
    // callback.
    const hash = window.location.hash;
    if (hash.includes(`state=${OAUTH_REDIRECT_STATE}`)) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      // Strip the fragment immediately so a later refresh can't reprocess it.
      history.replaceState(null, '', window.location.pathname + window.location.search);

      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (accessToken) {
        const expiresAt = Date.now() + (expiresIn ? Number(expiresIn) : DEFAULT_TOKEN_LIFETIME_S) * 1000;
        applyTokenResponse(accessToken, expiresAt);
        return;
      }
      // Otherwise params.get('error') is set (e.g. access_denied) — fall
      // through to the normal storage-restore path below.
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const signInAsMockDevUser = () => {
      const mock: AppUser = {
        id: 'dev_user_01',
        email: 'dev@feeledger.app',
        displayName: 'Dev User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      STORAGE.setItem(SESSION_USER_KEY, JSON.stringify(mock));
      setState(s => ({ ...s, user: mock, isAuthenticated: true, isLoading: false }));
    };

    if (!clientId) {
      signInAsMockDevUser();
      return;
    }

    // Google's One Tap / popup flows don't reliably work from an installed
    // PWA's standalone window on Android (see the standalone-PWA reauth
    // section above) — go straight to a full-page redirect instead.
    if (isStandalonePWA()) {
      beginRedirectAuth(clientId);
      return;
    }

    if (!state.gisReady) {
      signInAsMockDevUser();
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

    if (isStandalonePWA()) {
      // A popup-based silent refresh can't complete from a standalone PWA
      // window (see note above) — don't attempt it from this non-gesture
      // context. Callers fall back to the "no_drive" / "Connect Drive"
      // state, whose action button calls connectDriveInteractive(), which
      // uses a redirect and works from a real tap.
      return Promise.resolve(false);
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

  // ── Connect Drive — explicit user action, guarantees a visible outcome ───

  const connectDriveInteractive = useCallback((): Promise<boolean> => {
    if (!clientId || !window.google) {
      const mockToken = 'dev_token_mock';
      const expiresAt = Date.now() + DEFAULT_TOKEN_LIFETIME_S * 1000;
      STORAGE.setItem(SESSION_TOKEN_KEY, mockToken);
      STORAGE.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
      setState(s => ({ ...s, accessToken: mockToken, tokenExpiresAt: expiresAt, hasDriveAccess: true }));
      return Promise.resolve(true);
    }

    if (isStandalonePWA()) {
      return new Promise((resolve) => {
        try {
          // Deliberately no `prompt: 'consent'` here (unlike the popup path
          // below) — for a returning, already-consented user this lets
          // Google skip straight back with a fresh token instead of forcing
          // the full permission screen every time the app needs to
          // reconnect. First-time users still see the normal picker/consent
          // screen since nothing has been granted yet.
          beginRedirectAuth(clientId, undefined, state.user?.email);
        } catch {
          resolve(false);
          return;
        }
        // We should already be navigating away — this only fires if that
        // somehow didn't happen, so the caller isn't left stuck forever.
        setTimeout(() => resolve(false), 8000);
      });
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
      // Explicit user action (a real click) — force a visible consent
      // dialog every time, so the outcome is never ambiguous.
      tc.requestAccessToken({ prompt: 'consent' });
    });
  }, [clientId, state.user]);

  // ── Attempt one automatic, silent reconnect (standalone "app opened" case) ─
  //
  // Called right when the app is opened or resumed from the background,
  // before it tries to sync. If the token expired while the standalone PWA
  // was backgrounded, this proactively starts the redirect-based reauth
  // instead of waiting for the user to notice and tap "Connect Drive"
  // themselves. Deliberately NOT wired into ensureFreshToken/requestDriveAccess
  // (called from the 5-min background timer too) — redirecting the whole app
  // away mid-interaction would be jarring; only "app open" moments do this.
  // Runs at most once per tab session (AUTO_REAUTH_GUARD_KEY) so a session
  // that's truly gone (revoked, signed out elsewhere) falls back to the
  // manual button instead of redirect-looping. Returns true if a redirect
  // was started (caller should stop, since the page is about to unload).

  const attemptSilentReconnect = useCallback((): boolean => {
    if (!clientId || !isStandalonePWA()) return false;
    if (sessionStorage.getItem(AUTO_REAUTH_GUARD_KEY)) return false;

    const tok = STORAGE.getItem(SESSION_TOKEN_KEY);
    const expiresRaw = STORAGE.getItem(TOKEN_EXPIRES_KEY);
    const expiresAt = expiresRaw ? Number(expiresRaw) : null;
    if (tok && isTokenValid(expiresAt)) return false; // nothing to do

    const storedUserRaw = STORAGE.getItem(SESSION_USER_KEY);
    if (!storedUserRaw) return false; // never signed in — nothing to silently restore

    let email: string | undefined;
    try { email = (JSON.parse(storedUserRaw) as AppUser).email; } catch { /* ignore */ }

    sessionStorage.setItem(AUTO_REAUTH_GUARD_KEY, '1');
    beginRedirectAuth(clientId, 'none', email);
    return true;
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

    // Bound the wait: if a popup silently fails to open/complete (blocked,
    // or an opener-less standalone-PWA window), don't let this hang forever
    // and wedge every future call behind the same stuck promise.
    const refreshPromise = withTimeout(requestDriveAccess(), 15000, false)
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
      value={{
        ...state, signIn, signOut, requestDriveAccess,
        connectDriveInteractive, attemptSilentReconnect, ensureFreshToken,
      }}
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

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
  hasDriveAccess: boolean;
  gisReady: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: () => void;
  signOut: () => void;
  requestDriveAccess: () => Promise<boolean>;
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

const SESSION_USER_KEY  = 'fl_user';
const SESSION_TOKEN_KEY = 'fl_token';

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    hasDriveAccess: false,
    gisReady: false,
  });

  const tokenClientRef = useRef<TokenClient | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // ── Restore session on mount ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_USER_KEY);
      const tok = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (raw) {
        const user = JSON.parse(raw) as AppUser;
        setState(s => ({
          ...s,
          user,
          isAuthenticated: true,
          isLoading: false,
          accessToken: tok,
          hasDriveAccess: !!tok,
        }));
        return;
      }
    } catch { /* ignore */ }
    setState(s => ({ ...s, isLoading: false }));
  }, []);

  // ── Wait for GIS script then initialise ─────────────────────────────────

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    const user = buildUser(response.credential);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    setState(s => ({ ...s, user, isAuthenticated: true, isLoading: false }));
  }, []);

  useEffect(() => {
    if (!clientId) {
      // No client ID configured — dev/preview mode, GIS not needed
      setState(s => ({ ...s, gisReady: false }));
      return;
    }

    // GIS script may load before or after React mounts. Poll until ready.
    let attempts = 0;
    const maxAttempts = 40; // 10 seconds

    const tryInit = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
          auto_select: false,          // don't auto-sign-in silently
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
        });

        // Pre-init the token client for Drive
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: '', // will be set at request time
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
      // Dev mode — inject a mock user so you can test the app without GIS
      const mock: AppUser = {
        id: 'dev_user_01',
        email: 'dev@feeledger.app',
        displayName: 'Dev User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(mock));
      setState(s => ({ ...s, user: mock, isAuthenticated: true, isLoading: false }));
      return;
    }

    // Show the Google One Tap / popup
    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was blocked (browser settings, or user previously dismissed).
        // Fall back to the token-client popup which always works.
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

        // Fetch identity from Google's userinfo endpoint
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
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
          sessionStorage.setItem(SESSION_TOKEN_KEY, resp.access_token);
          setState(s => ({
            ...s,
            user,
            isAuthenticated: true,
            isLoading: false,
            accessToken: resp.access_token,
            hasDriveAccess: true,
          }));
        } catch {
          // identity fetch failed — at minimum store token
          sessionStorage.setItem(SESSION_TOKEN_KEY, resp.access_token);
          setState(s => ({
            ...s,
            accessToken: resp.access_token,
            hasDriveAccess: true,
          }));
        }
      },
    });

    tc.requestAccessToken({ prompt: 'select_account' });
  }, [clientId]);

  // ── Request Drive access separately (called after sign-in if needed) ─────

  const requestDriveAccess = useCallback((): Promise<boolean> => {
    if (!clientId || !window.google) {
      // Dev mode
      const mockToken = 'dev_token_mock';
      sessionStorage.setItem(SESSION_TOKEN_KEY, mockToken);
      setState(s => ({ ...s, accessToken: mockToken, hasDriveAccess: true }));
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
          sessionStorage.setItem(SESSION_TOKEN_KEY, resp.access_token);
          setState(s => ({
            ...s,
            accessToken: resp.access_token,
            hasDriveAccess: true,
          }));
          resolve(true);
        },
      });
      tc.requestAccessToken({ prompt: '' }); // no extra prompt if already consented
    });
  }, [clientId]);

  // ── Sign out ─────────────────────────────────────────────────────────────

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);

    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.cancel();
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      accessToken: null,
      hasDriveAccess: false,
      gisReady: state.gisReady,
    });
  }, [clientId, state.gisReady]);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, requestDriveAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

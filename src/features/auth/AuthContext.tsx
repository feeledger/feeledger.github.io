import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AppUser } from '../../types';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  hasDriveAccess: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: () => void;
  signOut: () => void;
  requestDriveAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Google Identity Services types (loaded via script tag)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: object) => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, done: () => void) => void;
        };
        oauth2: {
          initTokenClient: (config: object) => {
            requestAccessToken: (config?: object) => void;
          };
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleTokenResponse {
  access_token: string;
  error?: string;
}

function parseJwt(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function buildUserFromCredential(credential: string): AppUser {
  const payload = parseJwt(credential);
  const now = new Date().toISOString();
  return {
    id: (payload.sub as string) || crypto.randomUUID(),
    googleSubjectId: payload.sub as string | undefined,
    email: payload.email as string | undefined,
    displayName: payload.name as string | undefined,
    photoUrl: payload.picture as string | undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
    hasDriveAccess: false,
  });

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('fl_user');
      const storedToken = sessionStorage.getItem('fl_token');
      if (stored) {
        const user = JSON.parse(stored) as AppUser;
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          accessToken: storedToken,
          hasDriveAccess: !!storedToken,
        });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const handleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
    const user = buildUserFromCredential(response.credential);
    sessionStorage.setItem('fl_user', JSON.stringify(user));
    setState(s => ({
      ...s,
      user,
      isAuthenticated: true,
    }));
  }, []);

  // Initialize Google Identity Services on mount
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: true,
      cancel_on_tap_outside: false,
    });

    // Attempt silent sign-in if not already authenticated
    if (!state.isAuthenticated) {
      window.google.accounts.id.prompt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCredentialResponse]);

  const signIn = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) {
      // Dev mode: create a mock user
      const mockUser: AppUser = {
        id: 'dev_user_01',
        email: 'dev@feeledger.app',
        displayName: 'Dev User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('fl_user', JSON.stringify(mockUser));
      setState(s => ({ ...s, user: mockUser, isAuthenticated: true }));
      return;
    }
    window.google.accounts.id.prompt();
  }, []);

  const signOut = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    sessionStorage.removeItem('fl_user');
    sessionStorage.removeItem('fl_token');

    if (clientId && window.google && state.user?.email) {
      window.google.accounts.id.disableAutoSelect();
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      accessToken: null,
      hasDriveAccess: false,
    });
  }, [state.user?.email]);

  const requestDriveAccess = useCallback((): Promise<boolean> => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId || !window.google) {
      // Dev mode: mock token
      const mockToken = 'dev_access_token_mock';
      sessionStorage.setItem('fl_token', mockToken);
      setState(s => ({ ...s, accessToken: mockToken, hasDriveAccess: true }));
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse: GoogleTokenResponse) => {
          if (tokenResponse.error) {
            resolve(false);
            return;
          }
          sessionStorage.setItem('fl_token', tokenResponse.access_token);
          setState(s => ({
            ...s,
            accessToken: tokenResponse.access_token,
            hasDriveAccess: true,
          }));
          resolve(true);
        },
      });
      tokenClient.requestAccessToken();
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, requestDriveAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

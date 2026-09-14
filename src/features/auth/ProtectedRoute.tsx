import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useSync } from '../../services/SyncContext';
import { settingsRepository } from '../../db/repositories/settingsRepository';

type OnboardingState = 'checking' | 'needed' | 'done';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { initialSyncAttempted } = useSync();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState<OnboardingState>('checking');

  const checkOnboarding = useCallback(() => {
    if (!isAuthenticated) return;
    settingsRepository.isOnboardingComplete().then(complete => {
      setOnboarding(complete ? 'done' : 'needed');
    });
  }, [isAuthenticated]);

  // Wait for the initial Drive check to finish before deciding onboarding
  // status — otherwise an already-onboarded account on a new device would
  // be routed to onboarding before we've had a chance to pull its existing
  // settings from Drive. Once the initial sync attempt completes (whether
  // it restored data, found nothing, or Drive access isn't available),
  // read local IndexedDB, which by then reflects whatever Drive had.
  useEffect(() => {
    if (!initialSyncAttempted) return;
    checkOnboarding();
  }, [initialSyncAttempted, checkOnboarding, location.pathname]);

  // Also re-check if Drive data arrives/updates later in the session
  // (e.g. a manual "Restore from Drive" in Settings).
  useEffect(() => {
    const handler = () => setTimeout(checkOnboarding, 300);
    window.addEventListener('fl:drive-restored', handler);
    return () => window.removeEventListener('fl:drive-restored', handler);
  }, [checkOnboarding]);

  if (isLoading) return <LoadingScreen message="Loading FeeLedger…" />;
  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
  if (!initialSyncAttempted) return <LoadingScreen message="Checking your account…" />;
  if (onboarding === 'checking') return <LoadingScreen message="Setting up…" />;

  // Only redirect to onboarding if we're NOT already on an onboarding route
  if (onboarding === 'needed' && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is done but user somehow landed on /onboarding, send to dashboard
  if (onboarding === 'done' && location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--color-canvas)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '2px solid var(--color-dust)',
        borderTopColor: 'var(--color-ink)',
        borderRadius: '50%',
        animation: 'fl-spin 0.7s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: 'var(--color-slate)', fontFamily: 'var(--font-sans)' }}>
        {message}
      </p>
      <style>{`@keyframes fl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import React from 'react';

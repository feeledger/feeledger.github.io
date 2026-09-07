import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { settingsRepository } from '../../db/repositories/settingsRepository';

type OnboardingState = 'checking' | 'needed' | 'done';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState<OnboardingState>('checking');
  // Track how many times we've checked — avoids stale-state redirect loop
  const checkCountRef = useRef(0);

  const checkOnboarding = useCallback(() => {
    if (!isAuthenticated) return;
    checkCountRef.current += 1;
    settingsRepository.isOnboardingComplete().then(complete => {
      setOnboarding(complete ? 'done' : 'needed');
    });
  }, [isAuthenticated]);

  // Re-check every time the location changes so that after the wizard saves
  // and navigates to /app/dashboard, we re-read IndexedDB and get 'done'
  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding, location.pathname]);

  // Re-check after Drive restore
  useEffect(() => {
    const handler = () => setTimeout(checkOnboarding, 500);
    window.addEventListener('fl:drive-restored', handler);
    return () => window.removeEventListener('fl:drive-restored', handler);
  }, [checkOnboarding]);

  if (isLoading) return <LoadingScreen message="Loading FeeLedger…" />;
  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
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

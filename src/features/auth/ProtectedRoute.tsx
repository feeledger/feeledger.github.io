import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { settingsRepository } from '../../db/repositories/settingsRepository';

type OnboardingState = 'checking' | 'needed' | 'done';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState<OnboardingState>('checking');

  const checkOnboarding = useCallback(() => {
    if (!isAuthenticated) return;
    settingsRepository.isOnboardingComplete().then(complete => {
      setOnboarding(complete ? 'done' : 'needed');
    });
  }, [isAuthenticated]);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  // Re-check after Drive restore — data may have arrived from another device
  useEffect(() => {
    const handler = () => {
      // Small delay to let IndexedDB writes settle
      setTimeout(checkOnboarding, 500);
    };
    window.addEventListener('fl:drive-restored', handler);
    return () => window.removeEventListener('fl:drive-restored', handler);
  }, [checkOnboarding]);

  if (isLoading) return <LoadingScreen message="Loading FeeLedger…" />;
  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
  if (onboarding === 'checking') return <LoadingScreen message="Setting up…" />;

  if (onboarding === 'needed' && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
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

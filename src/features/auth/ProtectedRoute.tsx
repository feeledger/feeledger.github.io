import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { settingsRepository } from '../../db/repositories/settingsRepository';

type OnboardingState = 'checking' | 'needed' | 'done';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState<OnboardingState>('checking');

  useEffect(() => {
    if (!isAuthenticated) return;
    settingsRepository.isOnboardingComplete().then(complete => {
      setOnboarding(complete ? 'done' : 'needed');
    });
  }, [isAuthenticated]);

  // Loading auth
  if (isLoading) {
    return <LoadingScreen message="Loading FeeLedger…" />;
  }

  // Not signed in
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Checking onboarding status
  if (onboarding === 'checking') {
    return <LoadingScreen message="Setting up…" />;
  }

  // First time user — send to onboarding (but not if already there)
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

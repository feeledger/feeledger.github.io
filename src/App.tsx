import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { SyncProvider } from './services/SyncContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { AppShell } from './layouts/AppShell';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { BatchesPage } from './pages/BatchesPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter basename="/">
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Onboarding — protected but outside the AppShell */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />

          {/* Protected app with sidebar */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <SyncProvider>
                  <AppShell />
                </SyncProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students"  element={<StudentsPage />} />
            <Route path="batches"   element={<BatchesPage />} />
            <Route path="subjects"  element={<SubjectsPage />} />
            <Route path="payments"  element={<PaymentsPage />} />
            <Route path="receipts"  element={<ReceiptsPage />} />
            <Route path="reports"   element={<ReportsPage />} />
            <Route path="settings"  element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

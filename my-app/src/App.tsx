import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import EditDebt from './pages/EditDebt';
import AddCommitment from './pages/AddCommitment';
import AddCall from './pages/AddCall';
import EditCall from './pages/EditCall';
import DeleteCall from './pages/DeleteCall';
import DeleteCommitment from './pages/DeleteCommitment';
import CompleteCommitment from './pages/CompleteCommitment';
import DeleteDebt from './pages/DeleteDebt';
import CompleteDebt from './pages/CompleteDebt';
import CompleteAsset from './pages/CompleteAsset';
import EditFixedExpense from './pages/EditFixedExpense';
import EditAsset from './pages/EditAsset';
import EditIncome from './pages/EditIncome';
import Profile from './pages/Profile';
import Preferences from './pages/Preferences';
import TermsAndConditions from './pages/TermsAndConditions';
import Contact from './pages/Contact';
import AIChat from './pages/AIChat';
import InstallApp from './pages/InstallApp';
import MobileOnlyGate from './components/MobileOnlyGate';
import GoogleAnalyticsRouteTracker from './components/GoogleAnalyticsRouteTracker';
import { Toaster } from './utils/notifications';
import './App.css';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-debt/:id"
        element={
          <ProtectedRoute>
            <EditDebt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-debt/:debtId"
        element={
          <ProtectedRoute>
            <DeleteDebt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complete-debt/:debtId"
        element={
          <ProtectedRoute>
            <CompleteDebt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-commitment/:debtId"
        element={
          <ProtectedRoute>
            <AddCommitment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-commitment/:debtId/:commitmentId"
        element={
          <ProtectedRoute>
            <AddCommitment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-commitment/:debtId/:commitmentId"
        element={
          <ProtectedRoute>
            <DeleteCommitment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complete-commitment/:debtId/:commitmentId"
        element={
          <ProtectedRoute>
            <CompleteCommitment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-call/:debtId"
        element={
          <ProtectedRoute>
            <AddCall />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-call/:debtId/:callId"
        element={
          <ProtectedRoute>
            <EditCall />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-call/:debtId/:callId"
        element={
          <ProtectedRoute>
            <DeleteCall />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-fixed-expense/:id"
        element={
          <ProtectedRoute>
            <EditFixedExpense />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-asset/:id"
        element={
          <ProtectedRoute>
            <EditAsset />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complete-asset/:assetId"
        element={
          <ProtectedRoute>
            <CompleteAsset />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-income/:id"
        element={
          <ProtectedRoute>
            <EditIncome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences"
        element={
          <ProtectedRoute>
            <Preferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <ProtectedRoute>
            <AIChat />
          </ProtectedRoute>
        }
      />
      <Route path="/subscription" element={<Navigate to="/dashboard" replace />} />
      <Route path="/subscribe" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/terms"
        element={
          <ProtectedRoute>
            <TermsAndConditions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contact"
        element={
          <ProtectedRoute>
            <Contact />
          </ProtectedRoute>
        }
      />
      <Route
        path="/install-app"
        element={
          <ProtectedRoute>
            <InstallApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={<Landing />}
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <MobileOnlyGate>
          <Router>
            <GoogleAnalyticsRouteTracker />
            <AppRoutes />
            <Toaster
              position="top-center"
              gutter={12}
              toastOptions={{
                className: 'app-toast',
                style: {
                  background: 'var(--dark-section)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-tertiary, rgba(255,255,255,0.08))',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                },
                success: {
                  iconTheme: { primary: 'var(--primary)', secondary: 'var(--text-primary)' },
                },
                error: {
                  iconTheme: { primary: 'var(--error)', secondary: 'var(--text-primary)' },
                },
                duration: 4000,
              }}
            />
          </Router>
          </MobileOnlyGate>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

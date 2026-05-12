import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MobileOnlyGate from './components/MobileOnlyGate';
import GoogleAnalyticsRouteTracker from './components/GoogleAnalyticsRouteTracker';
import { Toaster } from './utils/notifications';
import i18n from './i18n';
import './App.css';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Plan = lazy(() => import('./pages/Plan'));
const Prospects = lazy(() => import('./pages/Prospects'));
const AddProspect = lazy(() => import('./pages/AddProspect'));
const AddDebt = lazy(() => import('./pages/AddDebt'));
const AddFixedExpense = lazy(() => import('./pages/AddFixedExpense'));
const AddAsset = lazy(() => import('./pages/AddAsset'));
const AddIncome = lazy(() => import('./pages/AddIncome'));
const EditDebt = lazy(() => import('./pages/EditDebt'));
const DeleteDebt = lazy(() => import('./pages/DeleteDebt'));
const DeleteAsset = lazy(() => import('./pages/DeleteAsset'));
const DeleteFixedExpense = lazy(() => import('./pages/DeleteFixedExpense'));
const DeleteIncome = lazy(() => import('./pages/DeleteIncome'));
const CompleteDebt = lazy(() => import('./pages/CompleteDebt'));
const CompleteAsset = lazy(() => import('./pages/CompleteAsset'));
const EditFixedExpense = lazy(() => import('./pages/EditFixedExpense'));
const EditAsset = lazy(() => import('./pages/EditAsset'));
const EditIncome = lazy(() => import('./pages/EditIncome'));
const Profile = lazy(() => import('./pages/Profile'));
const Preferences = lazy(() => import('./pages/Preferences'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const Contact = lazy(() => import('./pages/Contact'));
const AIChat = lazy(() => import('./pages/AIChat'));
const InstallApp = lazy(() => import('./pages/InstallApp'));

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
        path="/prospects"
        element={<ProtectedRoute><Prospects /></ProtectedRoute>}
      />
      <Route
        path="/add-prospect"
        element={<ProtectedRoute><AddProspect /></ProtectedRoute>}
      />
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <Plan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-debt"
        element={
          <ProtectedRoute>
            <AddDebt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-fixed-expense"
        element={
          <ProtectedRoute>
            <AddFixedExpense />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-asset"
        element={
          <ProtectedRoute>
            <AddAsset />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-income"
        element={
          <ProtectedRoute>
            <AddIncome />
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
        path="/delete-asset/:assetId"
        element={
          <ProtectedRoute>
            <DeleteAsset />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-fixed-expense/:id"
        element={
          <ProtectedRoute>
            <DeleteFixedExpense />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delete-income/:id"
        element={
          <ProtectedRoute>
            <DeleteIncome />
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
            <Suspense fallback={<div className="app-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{(i18n.t as (key: string) => string)('common.loading')}</div>}>
              <AppRoutes />
            </Suspense>
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

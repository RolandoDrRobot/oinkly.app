import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AddDebt from './pages/AddDebt';
import EditDebt from './pages/EditDebt';
import AddCommitment from './pages/AddCommitment';
import AddCall from './pages/AddCall';
import EditCall from './pages/EditCall';
import DeleteCall from './pages/DeleteCall';
import DeleteCommitment from './pages/DeleteCommitment';
import CompleteCommitment from './pages/CompleteCommitment';
import DeleteDebt from './pages/DeleteDebt';
import CompleteDebt from './pages/CompleteDebt';
import AddFixedExpense from './pages/AddFixedExpense';
import EditFixedExpense from './pages/EditFixedExpense';
import AddAsset from './pages/AddAsset';
import EditAsset from './pages/EditAsset';
import AddIncome from './pages/AddIncome';
import EditIncome from './pages/EditIncome';
import Profile from './pages/Profile';
import Preferences from './pages/Preferences';
import TermsAndConditions from './pages/TermsAndConditions';
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
        path="/add-debt"
        element={
          <ProtectedRoute>
            <AddDebt />
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
        path="/add-fixed-expense"
        element={
          <ProtectedRoute>
            <AddFixedExpense />
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
        path="/add-asset"
        element={
          <ProtectedRoute>
            <AddAsset />
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
        path="/add-income"
        element={
          <ProtectedRoute>
            <AddIncome />
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
        path="/terms"
        element={
          <ProtectedRoute>
            <TermsAndConditions />
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
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

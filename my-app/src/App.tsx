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
import DeleteCommitment from './pages/DeleteCommitment';
import CompleteCommitment from './pages/CompleteCommitment';
import DeleteDebt from './pages/DeleteDebt';
import Profile from './pages/Profile';
import Preferences from './pages/Preferences';
import TermsAndConditions from './pages/TermsAndConditions';
import './App.css';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Landing />}
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
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AddDebt from './pages/AddDebt';
import EditDebt from './pages/EditDebt';
import Profile from './pages/Profile';
import Preferences from './pages/Preferences';
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

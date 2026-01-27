import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.info('[ProtectedRoute] Render check:', {
    isAuthenticated,
    loading,
  });

  // Show loading state while checking authentication
  if (loading) {
    console.info('[ProtectedRoute] Loading state, showing loader');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--color-text-primary)'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    console.info('[ProtectedRoute] Not authenticated, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.info('[ProtectedRoute] Authenticated, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state: floating logo (same as landing first screen)
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-logo-wrapper">
          <img
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt=""
            className="auth-loading-logo"
          />
        </div>
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

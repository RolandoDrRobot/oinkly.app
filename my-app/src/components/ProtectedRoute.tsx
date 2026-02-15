import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { isLoading: subscriptionLoading } = useSubscription();

  const showLoading = loading || (isAuthenticated && subscriptionLoading);

  // Show loading state until auth and subscription are resolved (avoids AI assistant flash)
  if (showLoading) {
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

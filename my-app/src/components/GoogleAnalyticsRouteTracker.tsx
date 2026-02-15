import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * Sends a Google Analytics page_view on every route change (SPA).
 * Must be rendered inside Router.
 */
const GoogleAnalyticsRouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;
    trackPageView(path, document.title);
  }, [location.pathname, location.search]);

  return null;
};

export default GoogleAnalyticsRouteTracker;

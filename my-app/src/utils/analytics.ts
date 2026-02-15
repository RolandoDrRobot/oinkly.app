/**
 * Google Analytics (gtag) helpers.
 * Script is loaded in public/index.html; this module sends page views and custom events.
 */

export const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-8RTP2EJ69Z';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function getGtag(): typeof window.gtag | null {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return null;
  return window.gtag;
}

/** Send a page view for the current URL (use on route change in SPAs). */
export function trackPageView(path: string, title?: string): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    ...(title && { page_title: title }),
  });
}

/** Send a custom event. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', eventName, params);
}

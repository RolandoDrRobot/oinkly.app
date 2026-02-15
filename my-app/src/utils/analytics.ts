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

/** Send a custom event. Params often include event_category for GA4. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', eventName, params);
}

// --- Strategy events (see docs/GOOGLE_ANALYTICS_STRATEGY.md) ---

export const analytics = {
  landingView: (step?: number) =>
    trackEvent('landing_view', { event_category: 'acquisition', ...(step != null && { step }) }),
  signInStart: () => trackEvent('sign_in_start', { event_category: 'acquisition' }),
  signInSuccess: (method: 'google' | 'email' | 'session_restore') =>
    trackEvent('sign_in_success', { event_category: 'acquisition', method }),
  signInError: (errorMessage?: string) =>
    trackEvent('sign_in_error', { event_category: 'acquisition', ...(errorMessage && { error_message: errorMessage.slice(0, 100) }) }),
  onboardingComplete: () => trackEvent('onboarding_complete', { event_category: 'activation' }),
  viewPlans: (source?: string) =>
    trackEvent('view_plans', { event_category: 'subscription', ...(source && { source }) }),
  viewSubscribe: (plan?: string) =>
    trackEvent('view_subscribe', { event_category: 'subscription', ...(plan && { plan }) }),
  startCheckout: (plan: string, value?: number, currency?: string) =>
    trackEvent('start_checkout', { event_category: 'subscription', plan, ...(value != null && { value }), ...(currency && { currency }) }),
  purchase: (plan: string, value?: number, currency?: string) =>
    trackEvent('purchase', { event_category: 'subscription', plan, ...(value != null && { value }), ...(currency && { currency }) }),
  aiAssistantLockedClick: (source: string) =>
    trackEvent('ai_assistant_locked_click', { event_category: 'subscription', source }),
  aiAssistantUsed: (actionType: string) =>
    trackEvent('ai_assistant_used', { event_category: 'engagement', action_type: actionType }),
  aiVoiceError: (errorType: string) =>
    trackEvent('ai_voice_error', { event_category: 'error', error_type: errorType }),
  firstDebtCreated: () => trackEvent('first_debt_created', { event_category: 'activation' }),
  firstCallRecorded: () => trackEvent('first_call_recorded', { event_category: 'activation' }),
  addDebt: () => trackEvent('add_debt', { event_category: 'feature' }),
  editDebt: () => trackEvent('edit_debt', { event_category: 'feature' }),
  addCommitment: () => trackEvent('add_commitment', { event_category: 'feature' }),
  recordCall: () => trackEvent('record_call', { event_category: 'feature' }),
  completeDebt: () => trackEvent('complete_debt', { event_category: 'feature' }),
  addFixedExpense: () => trackEvent('add_fixed_expense', { event_category: 'feature' }),
  addAsset: () => trackEvent('add_asset', { event_category: 'feature' }),
  addIncome: () => trackEvent('add_income', { event_category: 'feature' }),
  error: (errorType: string, screen?: string, message?: string) =>
    trackEvent('error', {
      event_category: 'error',
      error_type: errorType,
      ...(screen && { screen }),
      ...(message && { message: message.slice(0, 150) }),
    }),
};

import toast, { Toaster } from 'react-hot-toast';
import i18next from 'i18next';

// Configure toast with Apple-style notifications
export const toastConfig = {
  position: 'top-center' as const,
  duration: 5000,
  style: {
    background: 'var(--primary, #569a3c)',
    color: 'var(--text-primary, #f4e3c5)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: 'none',
    maxWidth: '90%',
    fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
  },
  iconTheme: {
    primary: 'var(--text-primary, #f4e3c5)',
    secondary: 'var(--primary, #569a3c)',
  },
};

// Notification helpers with i18n support
export const notify = {
  // When debt totals are automatically updated
  debtTotalUpdated: (debtName: string, amount: string, currency: string) => {
    const message = i18next.t('notifications.debtTotalUpdated', { debtName, amount, currency });
    toast.success(message, toastConfig);
  },
  
  // When overview totals change automatically
  overviewUpdated: () => {
    const message = i18next.t('notifications.overviewUpdated');
    toast.success(message, toastConfig);
  },
  
  // When debt status (inOrder) changes automatically
  debtStatusChanged: (debtName: string, isInOrder: boolean) => {
    const statusKey = isInOrder ? 'notifications.inOrder' : 'notifications.notInOrder';
    const status = i18next.t(statusKey);
    const message = i18next.t('notifications.debtStatusChanged', { debtName, status });
    toast.success(message, toastConfig);
  },
  
  // When commitment affects debt status
  commitmentAffectsStatus: (debtName: string) => {
    const message = i18next.t('notifications.commitmentAffectsStatus', { debtName });
    toast.success(message, toastConfig);
  },
  
  // When fee is automatically set to 0
  feeAutoReset: (debtName: string, currency: string) => {
    const message = i18next.t('notifications.feeAutoReset', { debtName, currency });
    toast.success(message, toastConfig);
  },
};

export { Toaster };

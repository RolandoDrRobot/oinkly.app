import { Toaster, toast } from 'react-hot-toast';
import i18next from 'i18next';
import { Debt, FixedExpense, Notification, NotificationMeta } from '../types';
import { storage } from './storage';
import { analytics } from './analytics';

// Type assertion helper for i18next.t with interpolation
const t = (key: string, options?: any): string => {
  return (i18next.t as any)(key, options);
};

// Helper function to save notification (optional meta for reminder dedupe)
const saveNotification = (
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'success',
  meta?: NotificationMeta
) => {
  const notification: Notification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
    ...(meta && { meta }),
  };
  storage.saveNotification(notification);
};

// Check if a reminder notification with same meta already exists
const hasReminderNotification = (existing: Notification[], meta: NotificationMeta): boolean => {
  return existing.some(
    (n) =>
      n.meta?.reminderType === meta.reminderType &&
      (meta.reminderType === 'fixed_expense_overdue'
        ? n.meta?.expenseId === meta.expenseId && n.meta?.paymentDate === meta.paymentDate
        : n.meta?.debtId === meta.debtId &&
          (meta.commitmentId ? n.meta?.commitmentId === meta.commitmentId : true) &&
          (meta.paymentDate ? n.meta?.paymentDate === meta.paymentDate : true))
  );
};

// Create reminder notifications for payment due (deduped)
export const ensureReminders = (debts: Debt[]): void => {
  const existing = storage.getNotifications();

  for (const debt of debts) {
    if (debt.closedAt) continue;
    const isPaidOff = (debt.totalLocal || 0) === 0 && (debt.totalDollars || 0) === 0;
    if (isPaidOff) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Payment due reminder: debt has paymentDay within next 3 days or today
    if (debt.paymentDay && debt.paymentDay >= 1 && debt.paymentDay <= 31) {
      const dayOfMonth = today.getDate();
      const diffDays = debt.paymentDay - dayOfMonth;
      if (diffDays >= 0 && diffDays <= 3) {
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(debt.paymentDay).padStart(2, '0')}`;
        const meta: NotificationMeta = {
          reminderType: 'payment_reminder',
          debtId: debt.id,
          paymentDate: monthKey,
        };
        if (!hasReminderNotification(existing, meta)) {
          const message =
            diffDays === 0
              ? t('notifications.paymentDueToday', { debtName: debt.name })
              : diffDays === 1
                ? t('notifications.paymentDueTomorrow', { debtName: debt.name })
                : t('notifications.paymentDueInDays', { debtName: debt.name, days: diffDays });
          saveNotification(message, 'warning', meta);
          existing.push({ meta } as Notification);
        }
      }
    }
  }
};

/** Current month as YYYY-MM */
const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Create reminders for overdue fixed expenses (due day passed, not marked paid this month) */
export const ensureFixedExpenseReminders = (fixedExpenses: FixedExpense[]): void => {
  const existing = storage.getNotifications();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const month = currentMonth();

  for (const expense of fixedExpenses) {
    const dueDay = expense.paymentDay ?? 0;
    if (dueDay < 1 || dueDay > 31) continue;
    const isPaidThisMonth = expense.paidForMonth === month;
    if (isPaidThisMonth) continue;
    if (dayOfMonth < dueDay) continue; // not yet due
    const meta: NotificationMeta = {
      reminderType: 'fixed_expense_overdue',
      expenseId: expense.id,
      expenseName: expense.name,
      paymentDate: month,
    };
    if (!hasReminderNotification(existing, meta)) {
      const message = t('notifications.fixedExpenseOverdue', {
        expenseName: expense.name,
        day: dueDay,
      });
      saveNotification(message, 'error', meta);
      existing.push({ meta } as Notification);
    }
  }
};

// Toast options to match App Toaster (dark theme, same styles as other notifications)
const APP_TOAST_OPTS = {
  duration: 4000,
  className: 'app-toast',
  style: {
    background: 'var(--dark-section)',
    color: 'var(--text-primary)',
    border: '1px solid var(--bg-tertiary, rgba(255,255,255,0.08))',
    borderRadius: '12px',
    padding: '14px 18px',
    fontSize: '14px',
    fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
};

// Standard: save to storage (shows in NotificationsSidebar) + show toast
const saveAndToast = (
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'success',
  options?: { duration?: number; screen?: string; errorType?: string }
) => {
  saveNotification(message, type);
  const duration = options?.duration ?? 4000;
  const opts = { ...APP_TOAST_OPTS, duration };
  if (type === 'success') toast.success(message, opts);
  else if (type === 'error') {
    analytics.error(options?.errorType ?? 'toast', options?.screen, message);
    toast.error(message, opts);
  } else if (type === 'warning') toast(message, { ...opts, icon: '⚠️' });
  else toast(message, { ...opts, icon: 'ℹ️' });
};

// Notification helpers with i18n support – all persist to storage and show in NotificationsSidebar
export const notify = {
  // Save + toast (for user actions that should appear in sidebar and as toast)
  saveAndToast,

  // Suscripción cancelada: guardar en panel + toast como las demás
  subscriptionCanceled: () => {
    saveAndToast(t('notifications.subscriptionCanceled'), 'success');
  },
  // Premium activado: sin notificación (solo navegación)
  subscriptionActivated: () => {},
  // Error al activar Premium
  subscriptionError: (message?: string) => {
    const msg = message ?? t('notifications.subscriptionError');
    saveAndToast(msg, 'error');
  },
  // Llamada editada
  callSaved: () => {
    saveAndToast(t('notifications.callSaved'), 'success');
  },
  // Llamada eliminada
  callDeleted: () => {
    saveAndToast(t('notifications.callDeleted'), 'success');
  },

  // When debt totals are automatically updated
  debtTotalUpdated: (debtName: string, amount: string, currency: string) => {
    const message = t('notifications.debtTotalUpdated', { debtName, amount, currency });
    // Only save to sidebar, don't show toast
    saveNotification(message, 'success');
  },
  
  // When overview totals change automatically
  overviewUpdated: () => {
    const message = t('notifications.overviewUpdated');
    // Only save to sidebar, don't show toast
    saveNotification(message, 'success');
  },
  
  // When debt status (inOrder) changes automatically
  debtStatusChanged: (debtName: string, isInOrder: boolean) => {
    const statusKey = isInOrder ? 'notifications.inOrder' : 'notifications.notInOrder';
    const status = t(statusKey);
    const message = t('notifications.debtStatusChanged', { debtName, status });
    // Only save to sidebar, don't show toast
    saveNotification(message, 'success');
  },
  
  // When commitment affects debt status
  commitmentAffectsStatus: (debtName: string) => {
    const message = t('notifications.commitmentAffectsStatus', { debtName });
    // Only save to sidebar, don't show toast
    saveNotification(message, 'info');
  },
  
  // When fee is automatically set to 0
  feeAutoReset: (debtName: string, currency: string) => {
    const message = t('notifications.feeAutoReset', { debtName, currency });
    // Only save to sidebar, don't show toast
    saveNotification(message, 'info');
  },

  // When an entry is created (debt, income, fixed expense, asset) – e.g. via AI
  entryCreated: (entryType: 'debt' | 'income' | 'fixed_expense' | 'asset', name: string) => {
    const key = `notifications.entryCreated${entryType === 'fixed_expense' ? 'FixedExpense' : entryType.charAt(0).toUpperCase() + entryType.slice(1)}`;
    const message = t(key, { name });
    saveNotification(message, 'success');
  },
};

export { Toaster };

import { Toaster } from 'react-hot-toast';
import i18next from 'i18next';
import { Debt, Notification, NotificationMeta } from '../types';
import { storage } from './storage';

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
      n.meta.debtId === meta.debtId &&
      (meta.commitmentId ? n.meta?.commitmentId === meta.commitmentId : true) &&
      (meta.paymentDate ? n.meta?.paymentDate === meta.paymentDate : true)
  );
};

// Create reminder notifications for payment due, overdue commitments, and call bank (deduped)
export const ensureReminders = (debts: Debt[]): void => {
  const existing = storage.getNotifications();

  for (const debt of debts) {
    if (debt.closedAt) continue;
    const isPaidOff = (debt.totalLocal || 0) === 0 && (debt.totalDollars || 0) === 0;
    if (isPaidOff) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Payment due reminder: debt has paymentDate within next 3 days or today
    if (debt.paymentDate) {
      const payDate = new Date(debt.paymentDate);
      payDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        const meta: NotificationMeta = {
          reminderType: 'payment_reminder',
          debtId: debt.id,
          paymentDate: debt.paymentDate,
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

    // Overdue commitment: one notification per overdue (not completed) commitment
    if (debt.commitments) {
      for (const commitment of debt.commitments) {
        if (commitment.status === 'completed') continue;
        const commitmentDate = new Date(commitment.date);
        commitmentDate.setHours(0, 0, 0, 0);
        if (commitmentDate.getTime() < today.getTime()) {
          const meta: NotificationMeta = {
            reminderType: 'overdue_commitment',
            debtId: debt.id,
            commitmentId: commitment.id,
          };
          if (!hasReminderNotification(existing, meta)) {
            const message = t('notifications.overdueCommitment', {
              debtName: debt.name,
              date: commitment.date.slice(0, 10),
            });
            saveNotification(message, 'error', meta);
            existing.push({ meta } as Notification);
          }
        }
      }
    }

    // Call bank reminder: hasCallTask && !callCompleted
    if (debt.hasCallTask && !debt.callCompleted) {
      const meta: NotificationMeta = { reminderType: 'call_reminder', debtId: debt.id };
      if (!hasReminderNotification(existing, meta)) {
        const message = t('notifications.callBankReminder', {
          debtName: debt.name,
          bankName: debt.bankName,
        });
        saveNotification(message, 'info', meta);
        existing.push({ meta } as Notification);
      }
    }
  }
};

// Notification helpers with i18n support
export const notify = {
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

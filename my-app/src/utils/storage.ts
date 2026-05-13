import { Debt, User, FixedExpense, Asset, Income, Notification, Subscription, Prospect, Note } from '../types';
import type { HydratePayload } from '../lib/supabaseData';
import * as supabaseData from '../lib/supabaseData';

const DEBTS_KEY = 'debts';
const SUBSCRIPTION_PREFIX = 'subscription_';
const FIXED_EXPENSES_KEY = 'fixedExpenses';
const ASSETS_KEY = 'assets';
const INCOMES_KEY = 'incomes';
const USER_KEY = 'user';
const IS_LOGGED_IN_KEY = 'isLoggedIn';
const DEBTS_ORDER_KEY = 'debtsOrder';
const FIXED_EXPENSES_ORDER_KEY = 'fixedExpensesOrder';
const ASSETS_ORDER_KEY = 'assetsOrder';
const INCOMES_ORDER_KEY = 'incomesOrder';
const NOTIFICATIONS_KEY = 'notifications';
const PROSPECTS_KEY = 'prospects';
const NOTES_KEY = 'notes';
const OPENAI_API_KEY = 'openaiApiKey';

export const storage = {
  // User management
  setUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(IS_LOGGED_IN_KEY, 'true');
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  isLoggedIn: (): boolean => {
    return localStorage.getItem(IS_LOGGED_IN_KEY) === 'true';
  },

  logout: () => {
    const user = storage.getUser();
    if (user?.id) localStorage.removeItem(SUBSCRIPTION_PREFIX + user.id);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IS_LOGGED_IN_KEY);
  },

  /** Escribe en localStorage los datos traídos de Supabase (tras login). */
  hydrateToLocalStorage: (data: HydratePayload, userId: string) => {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(data.debts));
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(data.fixedExpenses));
    localStorage.setItem(ASSETS_KEY, JSON.stringify(data.assets));
    localStorage.setItem(INCOMES_KEY, JSON.stringify(data.incomes));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data.notifications));
    localStorage.setItem(SUBSCRIPTION_PREFIX + userId, JSON.stringify(data.subscription || { plan: 'free' }));
    localStorage.setItem(DEBTS_ORDER_KEY, JSON.stringify(data.debtsOrder));
    localStorage.setItem(FIXED_EXPENSES_ORDER_KEY, JSON.stringify(data.fixedExpensesOrder));
    localStorage.setItem(ASSETS_ORDER_KEY, JSON.stringify(data.assetsOrder));
    localStorage.setItem(INCOMES_ORDER_KEY, JSON.stringify(data.incomesOrder));
    if (data.preferences) {
      localStorage.setItem('localCurrency', data.preferences.localCurrency);
      localStorage.setItem('language', data.preferences.language);
      if (data.preferences.themeMode) localStorage.setItem('themeMode', data.preferences.themeMode);
      if (data.preferences.colorScheme != null) localStorage.setItem('colorScheme', data.preferences.colorScheme);
      localStorage.setItem('hideAmounts', String(data.preferences.hideAmounts));
      localStorage.setItem('hasSeenInitialSetup', data.preferences.hasSeenInitialSetup ? '1' : '');
    }
  },

  // Subscription (per user)
  getSubscription: (userId: string): Subscription | null => {
    const raw = localStorage.getItem(SUBSCRIPTION_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  },
  setSubscription: (userId: string, data: Subscription) => {
    localStorage.setItem(SUBSCRIPTION_PREFIX + userId, JSON.stringify(data));
    supabaseData.setSubscription(userId, data).catch((e) => console.warn('[storage] sync subscription', e));
  },

  // Debts management
  getDebts: (): Debt[] => {
    const debtsStr = localStorage.getItem(DEBTS_KEY);
    return debtsStr ? JSON.parse(debtsStr) : [];
  },

  saveDebt: (debt: Debt) => {
    const debts = storage.getDebts();
    const existingIndex = debts.findIndex(d => d.id === debt.id);
    const currentOrder = storage.getDebtsOrder() || debts.map(d => d.id);
    
    if (existingIndex >= 0) {
      debts[existingIndex] = { ...debt, updatedAt: new Date().toISOString() };
    } else {
      debts.push({ ...debt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      // Add new debt to the end of the order
      currentOrder.push(debt.id);
      storage.setDebtsOrder(currentOrder);
    }
    
    localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
    const uid = storage.getUser()?.id;
    const toSync = debts.find(d => d.id === debt.id);
    if (uid && toSync) supabaseData.saveDebt(uid, toSync).catch((e) => console.warn('[storage] sync debt', e));
  },

  deleteDebt: (id: string) => {
    const debts = storage.getDebts();
    const filtered = debts.filter(d => d.id !== id);
    localStorage.setItem(DEBTS_KEY, JSON.stringify(filtered));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.deleteDebt(uid, id).catch((e) => console.warn('[storage] sync deleteDebt', e));
  },

  getDebt: (id: string): Debt | null => {
    const debts = storage.getDebts();
    return debts.find(d => d.id === id) || null;
  },

  // Theme management
  setThemeMode: (mode: 'light' | 'dark') => {
    localStorage.setItem('themeMode', mode);
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setUserPreferences(uid, { themeMode: mode }).catch((e) => console.warn('[storage] sync themeMode', e));
  },

  getThemeMode: (): 'light' | 'dark' | null => {
    return localStorage.getItem('themeMode') as 'light' | 'dark' | null;
  },

  setColorScheme: (scheme: string) => {
    localStorage.setItem('colorScheme', scheme);
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setUserPreferences(uid, { colorScheme: scheme }).catch((e) => console.warn('[storage] sync colorScheme', e));
  },

  getColorScheme: (): string | null => {
    return localStorage.getItem('colorScheme');
  },

  // Local currency management
  setLocalCurrency: (currency: string) => {
    localStorage.setItem('localCurrency', currency);
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setUserPreferences(uid, { localCurrency: currency }).catch((e) => console.warn('[storage] sync localCurrency', e));
  },

  getLocalCurrency: (): string => {
    return localStorage.getItem('localCurrency') || 'USD';
  },

  // Language management
  setLanguage: (language: string) => {
    localStorage.setItem('language', language);
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setUserPreferences(uid, { language }).catch((e) => console.warn('[storage] sync language', e));
  },

  getLanguage: (): string => {
    return localStorage.getItem('language') || 'en';
  },

  // OpenAI / ChatGPT API key (for voice AI; optional, can also use env REACT_APP_OPENAI_API_KEY)
  getOpenAIApiKey: (): string => {
    return localStorage.getItem(OPENAI_API_KEY) || '';
  },
  setOpenAIApiKey: (key: string) => {
    if (key.trim()) localStorage.setItem(OPENAI_API_KEY, key.trim());
    else localStorage.removeItem(OPENAI_API_KEY);
  },

  // Debts order management
  setDebtsOrder: (order: string[]) => {
    localStorage.setItem(DEBTS_ORDER_KEY, JSON.stringify(order));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setListOrder(uid, 'debts', order).catch((e) => console.warn('[storage] sync debtsOrder', e));
  },

  getDebtsOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(DEBTS_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Fixed Expenses management
  getFixedExpenses: (): FixedExpense[] => {
    const expensesStr = localStorage.getItem(FIXED_EXPENSES_KEY);
    return expensesStr ? JSON.parse(expensesStr) : [];
  },

  saveFixedExpense: (expense: FixedExpense) => {
    const expenses = storage.getFixedExpenses();
    const existingIndex = expenses.findIndex(e => e.id === expense.id);
    const currentOrder = storage.getFixedExpensesOrder() || expenses.map(e => e.id);

    if (existingIndex >= 0) {
      expenses[existingIndex] = { ...expense, updatedAt: new Date().toISOString() };
    } else {
      expenses.push({ ...expense, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      currentOrder.push(expense.id);
      storage.setFixedExpensesOrder(currentOrder);
    }

    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(expenses));
    const uid = storage.getUser()?.id;
    const toSync = expenses.find(e => e.id === expense.id);
    if (uid && toSync) supabaseData.saveFixedExpense(uid, toSync).catch((e) => console.warn('[storage] sync fixedExpense', e));
  },

  getFixedExpense: (id: string): FixedExpense | null => {
    const expenses = storage.getFixedExpenses();
    return expenses.find(e => e.id === id) || null;
  },

  updateFixedExpense: (expense: FixedExpense) => {
    storage.saveFixedExpense(expense);
  },

  deleteFixedExpense: (id: string) => {
    const expenses = storage.getFixedExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(filtered));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.deleteFixedExpense(uid, id).catch((e) => console.warn('[storage] sync deleteFixedExpense', e));
  },

  // Assets management
  getAssets: (): Asset[] => {
    const assetsStr = localStorage.getItem(ASSETS_KEY);
    return assetsStr ? JSON.parse(assetsStr) : [];
  },

  saveAsset: (asset: Asset) => {
    const assets = storage.getAssets();
    const existingIndex = assets.findIndex(a => a.id === asset.id);
    
    if (existingIndex >= 0) {
      assets[existingIndex] = { ...asset, updatedAt: new Date().toISOString() };
    } else {
      assets.push({ ...asset, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    const uid = storage.getUser()?.id;
    const toSync = assets.find(a => a.id === asset.id);
    if (uid && toSync) supabaseData.saveAsset(uid, toSync).catch((e) => console.warn('[storage] sync asset', e));
  },

  getAsset: (id: string): Asset | null => {
    const assets = storage.getAssets();
    return assets.find(a => a.id === id) || null;
  },

  updateAsset: (asset: Asset) => {
    storage.saveAsset(asset);
  },

  deleteAsset: (id: string) => {
    const assets = storage.getAssets();
    const filtered = assets.filter(a => a.id !== id);
    localStorage.setItem(ASSETS_KEY, JSON.stringify(filtered));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.deleteAsset(uid, id).catch((e) => console.warn('[storage] sync deleteAsset', e));
  },

  // Incomes management
  getIncomes: (): Income[] => {
    const incomesStr = localStorage.getItem(INCOMES_KEY);
    return incomesStr ? JSON.parse(incomesStr) : [];
  },

  saveIncome: (income: Income) => {
    const incomes = storage.getIncomes();
    const existingIndex = incomes.findIndex(i => i.id === income.id);
    
    if (existingIndex >= 0) {
      incomes[existingIndex] = { ...income, updatedAt: new Date().toISOString() };
    } else {
      incomes.push({ ...income, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    localStorage.setItem(INCOMES_KEY, JSON.stringify(incomes));
    const uid = storage.getUser()?.id;
    const toSync = incomes.find(i => i.id === income.id);
    if (uid && toSync) supabaseData.saveIncome(uid, toSync).catch((e) => console.warn('[storage] sync income', e));
  },

  getIncome: (id: string): Income | null => {
    const incomes = storage.getIncomes();
    return incomes.find(i => i.id === id) || null;
  },

  updateIncome: (income: Income) => {
    storage.saveIncome(income);
  },

  deleteIncome: (id: string) => {
    const incomes = storage.getIncomes();
    const filtered = incomes.filter(i => i.id !== id);
    localStorage.setItem(INCOMES_KEY, JSON.stringify(filtered));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.deleteIncome(uid, id).catch((e) => console.warn('[storage] sync deleteIncome', e));
  },

  // Fixed Expenses order management
  setFixedExpensesOrder: (order: string[]) => {
    localStorage.setItem(FIXED_EXPENSES_ORDER_KEY, JSON.stringify(order));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setListOrder(uid, 'fixed_expenses', order).catch((e) => console.warn('[storage] sync fixedExpensesOrder', e));
  },

  getFixedExpensesOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(FIXED_EXPENSES_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Assets order management
  setAssetsOrder: (order: string[]) => {
    localStorage.setItem(ASSETS_ORDER_KEY, JSON.stringify(order));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setListOrder(uid, 'assets', order).catch((e) => console.warn('[storage] sync assetsOrder', e));
  },

  getAssetsOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(ASSETS_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Incomes order management
  setIncomesOrder: (order: string[]) => {
    localStorage.setItem(INCOMES_ORDER_KEY, JSON.stringify(order));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.setListOrder(uid, 'incomes', order).catch((e) => console.warn('[storage] sync incomesOrder', e));
  },

  getIncomesOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(INCOMES_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Notifications management
  saveNotification: (notification: Notification) => {
    const notifications = storage.getNotifications();
    notifications.unshift(notification); // Add to beginning
    const limitedNotifications = notifications.slice(0, 100);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limitedNotifications));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.saveNotification(uid, notification).catch((e) => console.warn('[storage] sync saveNotification', e));
  },

  getNotifications: (): Notification[] => {
    const notificationsStr = localStorage.getItem(NOTIFICATIONS_KEY);
    return notificationsStr ? JSON.parse(notificationsStr) : [];
  },

  markNotificationAsRead: (notificationId: string) => {
    const notifications = storage.getNotifications();
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.markNotificationAsRead(uid, notificationId).catch((e) => console.warn('[storage] sync markNotificationAsRead', e));
  },

  markAllNotificationsAsRead: () => {
    const notifications = storage.getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.markAllNotificationsAsRead(uid).catch((e) => console.warn('[storage] sync markAllNotificationsAsRead', e));
  },

  deleteNotification: (notificationId: string) => {
    const notifications = storage.getNotifications();
    const updated = notifications.filter(n => n.id !== notificationId);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.deleteNotification(uid, notificationId).catch((e) => console.warn('[storage] sync deleteNotification', e));
  },

  clearAllNotifications: () => {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    const uid = storage.getUser()?.id;
    if (uid) supabaseData.clearAllNotifications(uid).catch((e) => console.warn('[storage] sync clearAllNotifications', e));
  },

  getUnreadNotificationsCount: (): number => {
    const notifications = storage.getNotifications();
    return notifications.filter(n => !n.read).length;
  },

  // Prospects
  getProspects: (): Prospect[] => {
    const raw = localStorage.getItem(PROSPECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  saveProspect: (prospect: Prospect) => {
    const prospects = storage.getProspects();
    const idx = prospects.findIndex(p => p.id === prospect.id);
    if (idx >= 0) {
      prospects[idx] = { ...prospect, updatedAt: new Date().toISOString() };
    } else {
      prospects.push({ ...prospect, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(PROSPECTS_KEY, JSON.stringify(prospects));
  },
  getProspect: (id: string): Prospect | null => {
    return storage.getProspects().find(p => p.id === id) || null;
  },
  deleteProspect: (id: string) => {
    const filtered = storage.getProspects().filter(p => p.id !== id);
    localStorage.setItem(PROSPECTS_KEY, JSON.stringify(filtered));
  },

  // Notes
  getNotes: (): Note[] => {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  saveNote: (note: Note) => {
    const notes = storage.getNotes();
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = { ...note, updatedAt: new Date().toISOString() };
    } else {
      notes.push({ ...note, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },
  deleteNote: (id: string) => {
    const filtered = storage.getNotes().filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
  },
};

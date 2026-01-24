import { Debt, User } from '../types';

const DEBTS_KEY = 'debts';
const USER_KEY = 'user';
const IS_LOGGED_IN_KEY = 'isLoggedIn';

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
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(IS_LOGGED_IN_KEY);
  },

  // Debts management
  getDebts: (): Debt[] => {
    const debtsStr = localStorage.getItem(DEBTS_KEY);
    return debtsStr ? JSON.parse(debtsStr) : [];
  },

  saveDebt: (debt: Debt) => {
    const debts = storage.getDebts();
    const existingIndex = debts.findIndex(d => d.id === debt.id);
    
    if (existingIndex >= 0) {
      debts[existingIndex] = { ...debt, updatedAt: new Date().toISOString() };
    } else {
      debts.push({ ...debt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
  },

  deleteDebt: (id: string) => {
    const debts = storage.getDebts();
    const filtered = debts.filter(d => d.id !== id);
    localStorage.setItem(DEBTS_KEY, JSON.stringify(filtered));
  },

  getDebt: (id: string): Debt | null => {
    const debts = storage.getDebts();
    return debts.find(d => d.id === id) || null;
  },

  // Theme management
  setThemeMode: (mode: 'light' | 'dark') => {
    localStorage.setItem('themeMode', mode);
  },

  getThemeMode: (): 'light' | 'dark' | null => {
    return localStorage.getItem('themeMode') as 'light' | 'dark' | null;
  },

  setColorScheme: (scheme: string) => {
    localStorage.setItem('colorScheme', scheme);
  },

  getColorScheme: (): string | null => {
    return localStorage.getItem('colorScheme');
  },
};

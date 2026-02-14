/**
 * Tests for storage adapter.
 * Replaces localStorage with a backing store and mocks supabaseData.
 */
import type { Debt, User, Subscription } from '../types';

// Backing store used by our localStorage mock; we replace window.localStorage in beforeEach.
const backing: Record<string, string> = {};

function createLocalStorageMock() {
  return {
    getItem(key: string) {
      return backing[key] ?? null;
    },
    setItem(key: string, value: string) {
      backing[key] = value;
    },
    removeItem(key: string) {
      delete backing[key];
    },
    clear() {
      Object.keys(backing).forEach((k) => delete backing[k]);
    },
    key: () => null,
    length: 0,
  };
}

jest.mock('../lib/supabaseData', () => ({
  saveDebt: jest.fn().mockResolvedValue(undefined),
  deleteDebt: jest.fn().mockResolvedValue(undefined),
  saveFixedExpense: jest.fn().mockResolvedValue(undefined),
  deleteFixedExpense: jest.fn().mockResolvedValue(undefined),
  saveAsset: jest.fn().mockResolvedValue(undefined),
  deleteAsset: jest.fn().mockResolvedValue(undefined),
  saveIncome: jest.fn().mockResolvedValue(undefined),
  deleteIncome: jest.fn().mockResolvedValue(undefined),
  saveNotification: jest.fn().mockResolvedValue(undefined),
  markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
  markAllNotificationsAsRead: jest.fn().mockResolvedValue(undefined),
  deleteNotification: jest.fn().mockResolvedValue(undefined),
  clearAllNotifications: jest.fn().mockResolvedValue(undefined),
  setSubscription: jest.fn().mockResolvedValue(undefined),
  setUserPreferences: jest.fn().mockResolvedValue(undefined),
  setListOrder: jest.fn().mockResolvedValue(undefined),
}));

let storage: typeof import('./storage').storage;

beforeEach(() => {
  Object.keys(backing).forEach((k) => delete backing[k]);
  backing['debts'] = '[]';
  backing['fixedExpenses'] = '[]';
  backing['assets'] = '[]';
  backing['incomes'] = '[]';
  backing['notifications'] = '[]';
  backing['localCurrency'] = 'USD';
  backing['language'] = 'en';

  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
    configurable: true,
  });
  jest.resetModules();
  storage = require('./storage').storage;
});

describe('storage', () => {
  describe('user', () => {
    it('setUser writes user and isLoggedIn to localStorage', () => {
      const user: User = { id: 'u1', email: 'a@b.com', name: 'Test' };
      storage.setUser(user);
      expect(backing['user']).toBeDefined();
      expect(JSON.parse(backing['user'])).toEqual(user);
      expect(backing['isLoggedIn']).toBe('true');
    });

    it('logout removes user and isLoggedIn from localStorage', () => {
      backing['user'] = JSON.stringify({ id: 'u1', email: 'a@b.com', name: 'Test' });
      backing['isLoggedIn'] = 'true';
      storage.logout();
      expect(backing['user']).toBeUndefined();
      expect(backing['isLoggedIn']).toBeUndefined();
    });
  });

  describe('debts', () => {
    it('getDebts returns empty array when empty', () => {
      backing['debts'] = '[]';
      expect(storage.getDebts()).toEqual([]);
    });

    it('saveDebt adds new debt and getDebts returns it', () => {
      const debt: Debt = {
        id: 'd1',
        name: 'BBVA',
        type: 'tarjeta',
        localCurrency: 'USD',
        localFee: 0,
        dollarFee: 0,
        totalLocal: 5000,
        totalDollars: 0,
        feeToUpdate: 0,
        feeToUpdateDollars: 0,
        inOrder: true,
        currentPlan: '',
        bankName: '',
        hasCallTask: false,
        callCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.saveDebt(debt);
      const list = storage.getDebts();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('BBVA');
      expect(storage.getDebt('d1')).toEqual(expect.objectContaining({ name: 'BBVA' }));
    });

    it('deleteDebt removes debt', () => {
      backing['debts'] = JSON.stringify([
        { id: 'd1', name: 'X', type: 'tarjeta', localCurrency: 'USD', localFee: 0, dollarFee: 0, totalLocal: 0, totalDollars: 0, feeToUpdate: 0, feeToUpdateDollars: 0, inOrder: true, currentPlan: '', bankName: '', hasCallTask: false, callCompleted: false, createdAt: '', updatedAt: '' },
      ]);
      storage.deleteDebt('d1');
      expect(storage.getDebts()).toHaveLength(0);
      expect(storage.getDebt('d1')).toBeNull();
    });
  });

  describe('preferences', () => {
    it('getLocalCurrency and setLocalCurrency', () => {
      expect(storage.getLocalCurrency()).toBe('USD');
      storage.setLocalCurrency('CRC');
      expect(storage.getLocalCurrency()).toBe('CRC');
    });

    it('getLanguage and setLanguage', () => {
      expect(storage.getLanguage()).toBe('en');
      storage.setLanguage('es');
      expect(storage.getLanguage()).toBe('es');
    });
  });

  describe('subscription', () => {
    it('getSubscription and setSubscription roundtrip', () => {
      storage.setUser({ id: 'u1', email: 'a@b.com', name: 'Test' });
      const sub: Subscription = { plan: 'premium', status: 'active', interval: 'monthly' };
      storage.setSubscription('u1', sub);
      expect(storage.getSubscription('u1')).toEqual(sub);
    });
  });

  describe('hydrateToLocalStorage', () => {
    it('writes all keys to localStorage', () => {
      storage.setUser({ id: 'u1', email: 'a@b.com', name: 'Test' });
      storage.hydrateToLocalStorage(
        {
          debts: [],
          fixedExpenses: [],
          assets: [],
          incomes: [],
          notifications: [],
          subscription: { plan: 'free' },
          preferences: { localCurrency: 'CRC', language: 'es', themeMode: null, colorScheme: null, hideAmounts: false, hasSeenInitialSetup: true },
          debtsOrder: [],
          fixedExpensesOrder: [],
          assetsOrder: [],
          incomesOrder: [],
        },
        'u1'
      );
      expect(backing['debts']).toBe('[]');
      expect(backing['localCurrency']).toBe('CRC');
      expect(backing['language']).toBe('es');
    });
  });
});

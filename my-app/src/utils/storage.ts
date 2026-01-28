import { Debt, User, FixedExpense, Asset, Income } from '../types';

const DEBTS_KEY = 'debts';
const FIXED_EXPENSES_KEY = 'fixedExpenses';
const ASSETS_KEY = 'assets';
const INCOMES_KEY = 'incomes';
const USER_KEY = 'user';
const IS_LOGGED_IN_KEY = 'isLoggedIn';
const DEBTS_ORDER_KEY = 'debtsOrder';
const FIXED_EXPENSES_ORDER_KEY = 'fixedExpensesOrder';
const ASSETS_ORDER_KEY = 'assetsOrder';
const INCOMES_ORDER_KEY = 'incomesOrder';

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

  // Local currency management
  setLocalCurrency: (currency: string) => {
    localStorage.setItem('localCurrency', currency);
  },

  getLocalCurrency: (): string => {
    return localStorage.getItem('localCurrency') || 'USD';
  },

  // Language management
  setLanguage: (language: string) => {
    localStorage.setItem('language', language);
  },

  getLanguage: (): string => {
    return localStorage.getItem('language') || 'en';
  },

  // Debts order management
  setDebtsOrder: (order: string[]) => {
    localStorage.setItem(DEBTS_ORDER_KEY, JSON.stringify(order));
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
    
    if (existingIndex >= 0) {
      expenses[existingIndex] = { ...expense, updatedAt: new Date().toISOString() };
    } else {
      expenses.push({ ...expense, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(expenses));
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
  },

  // Fixed Expenses order management
  setFixedExpensesOrder: (order: string[]) => {
    localStorage.setItem(FIXED_EXPENSES_ORDER_KEY, JSON.stringify(order));
  },

  getFixedExpensesOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(FIXED_EXPENSES_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Assets order management
  setAssetsOrder: (order: string[]) => {
    localStorage.setItem(ASSETS_ORDER_KEY, JSON.stringify(order));
  },

  getAssetsOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(ASSETS_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },

  // Incomes order management
  setIncomesOrder: (order: string[]) => {
    localStorage.setItem(INCOMES_ORDER_KEY, JSON.stringify(order));
  },

  getIncomesOrder: (): string[] | null => {
    const orderStr = localStorage.getItem(INCOMES_ORDER_KEY);
    return orderStr ? JSON.parse(orderStr) : null;
  },
};

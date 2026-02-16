/**
 * Tests for Supabase data layer. Supabase client is mocked; no real API calls.
 */

type MockResult = { data?: any; error?: any };

let consoleWarnSpy: jest.SpyInstance;
beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  consoleWarnSpy?.mockRestore();
});

jest.mock('./supabase', () => {
  const tableCallIndex: Record<string, number> = {};
  const tableResults: Record<string, MockResult[]> = {};
  const fromCalls: string[] = [];
  function createChain(result: MockResult) {
    const chain: any = {};
    ['select', 'eq', 'order', 'in', 'limit', 'upsert', 'delete', 'insert', 'update'].forEach((m) => {
      chain[m] = jest.fn().mockReturnValue(chain);
    });
    chain.single = jest.fn().mockResolvedValue(result);
    chain.then = (resolve: (v: MockResult) => void) => Promise.resolve(result).then(resolve);
    chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
    return chain;
  }
  function getNextResult(table: string): MockResult {
    tableCallIndex[table] = (tableCallIndex[table] || 0) + 1;
    const list = tableResults[table] || [];
    const idx = tableCallIndex[table] - 1;
    return list[idx] ?? { data: null, error: null };
  }
  (global as any).__supabaseMock = {
    tableResults,
    tableCallIndex,
    fromCalls,
    reset: () => {
      Object.keys(tableCallIndex).forEach((k) => delete tableCallIndex[k]);
      Object.keys(tableResults).forEach((k) => delete tableResults[k]);
      fromCalls.length = 0;
    },
  };
  return {
    supabase: {
      from: (table: string) => {
        fromCalls.push(table);
        return createChain(getNextResult(table));
      },
    },
    mapSupabaseUser: jest.fn(),
  };
});

import {
  getDebts,
  saveDebt,
  deleteDebt,
  getFixedExpenses,
  saveFixedExpense,
  deleteFixedExpense,
  getAssets,
  saveAsset,
  deleteAsset,
  getIncomes,
  saveIncome,
  deleteIncome,
  getSubscription,
  setSubscription,
  getUserPreferences,
  setUserPreferences,
  hydrateFromSupabase,
} from './supabaseData';

const userId = 'user-1';

const getMock = () => (global as any).__supabaseMock;

function setTableResult(table: string, result: MockResult) {
  const m = getMock();
  m.tableResults[table] = [result];
  m.tableCallIndex[table] = 0;
}

function setTableResults(table: string, results: MockResult[]) {
  const m = getMock();
  m.tableResults[table] = results;
  m.tableCallIndex[table] = 0;
}

beforeEach(() => {
  jest.clearAllMocks();
  getMock().reset();
});

describe('supabaseData', () => {
  describe('getDebts', () => {
    it('returns empty array when no rows', async () => {
      setTableResult('debts', { data: [], error: null });

      const list = await getDebts(userId);
      expect(list).toEqual([]);
      expect(getMock().fromCalls).toContain('debts');
      // When no debts, commitments/calls are not fetched
    });

    it('returns debts with empty commitments and callHistory', async () => {
      setTableResults('debts', [
        {
          data: [
            {
              id: 'd1',
              user_id: userId,
              name: 'BBVA',
              type: 'tarjeta',
              local_currency: 'MXN',
              local_fee: 5000,
              dollar_fee: 0,
              total_local: 10000,
              total_dollars: 0,
              fee_to_update: 0,
              fee_to_update_dollars: 0,
              in_order: true,
              current_plan: '',
              bank_name: 'BBVA',
              bank_phone: null,
              has_call_task: false,
              call_completed: false,
              payment_date: null,
              cut_date: null,
              interest_rate: null,
              closed_at: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
          error: null,
        },
      ]);

      const list = await getDebts(userId);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('BBVA');
      expect(list[0].localCurrency).toBe('MXN');
      expect(list[0].commitments).toEqual([]);
      expect(list[0].callHistory).toEqual([]);
    });

    it('returns empty array on error', async () => {
      setTableResult('debts', { data: null, error: { message: 'Network error' } });
      const list = await getDebts(userId);
      expect(list).toEqual([]);
    });
  });

  describe('saveDebt', () => {
    it('calls upsert on debts only', async () => {
      setTableResult('debts', { error: null });

      const debt = {
        id: 'd1',
        name: 'Test',
        type: 'prestamo' as const,
        localCurrency: 'USD',
        localFee: 100,
        dollarFee: 0,
        totalLocal: 5000,
        totalDollars: 0,
        feeToUpdate: 0,
        feeToUpdateDollars: 0,
        inOrder: true,
        currentPlan: '',
        bankName: '',
        bankPhone: '',
        hasCallTask: false,
        callCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commitments: [],
        callHistory: [],
      };

      await saveDebt(userId, debt);

      expect(getMock().fromCalls).toContain('debts');
    });
  });

  describe('deleteDebt', () => {
    it('calls delete on debts only', async () => {
      setTableResult('debts', { error: null });

      await deleteDebt(userId, 'd1');

      expect(getMock().fromCalls).toContain('debts');
    });
  });

  describe('getFixedExpenses', () => {
    it('returns empty array when no data', async () => {
      setTableResult('fixed_expenses', { data: [], error: null });
      const list = await getFixedExpenses(userId);
      expect(list).toEqual([]);
    });

    it('returns mapped fixed expenses', async () => {
      setTableResult('fixed_expenses', {
        data: [
          {
            id: 'e1',
            user_id: userId,
            name: 'Rent',
            amount_local: 5000,
            amount_dollars: 0,
            local_currency: 'MXN',
            category: 'housing',
            due_date: null,
            payment_date: null,
            paid_for_month: null,
            notes: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      });
      const list = await getFixedExpenses(userId);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Rent');
      expect(list[0].amountLocal).toBe(5000);
      expect(list[0].category).toBe('housing');
    });
  });

  describe('saveFixedExpense / deleteFixedExpense', () => {
    it('saveFixedExpense calls upsert', async () => {
      setTableResult('fixed_expenses', { error: null });
      await saveFixedExpense(userId, {
        id: 'e1',
        name: 'Rent',
        amountLocal: 5000,
        amountDollars: 0,
        localCurrency: 'MXN',
        createdAt: '',
        updatedAt: '',
      });
      expect(getMock().fromCalls).toContain('fixed_expenses');
    });

    it('deleteFixedExpense calls delete', async () => {
      setTableResult('fixed_expenses', { error: null });
      await deleteFixedExpense(userId, 'e1');
      expect(getMock().fromCalls).toContain('fixed_expenses');
    });
  });

  describe('getAssets / saveAsset / deleteAsset', () => {
    it('getAssets returns mapped list', async () => {
      setTableResult('assets', {
        data: [
          {
            id: 'a1',
            user_id: userId,
            name: 'House',
            type: 'property',
            value_local: 250000,
            value_dollars: 0,
            local_currency: 'MXN',
            purchase_date: null,
            notes: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      });
      const list = await getAssets(userId);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('House');
      expect(list[0].type).toBe('property');
      expect(list[0].valueLocal).toBe(250000);
    });

    it('saveAsset and deleteAsset call from(assets)', async () => {
      setTableResult('assets', { error: null });
      await saveAsset(userId, {
        id: 'a1',
        name: 'House',
        type: 'property',
        valueLocal: 250000,
        valueDollars: 0,
        localCurrency: 'MXN',
        createdAt: '',
        updatedAt: '',
      });
      await deleteAsset(userId, 'a1');
      expect(getMock().fromCalls).toContain('assets');
    });
  });

  describe('getIncomes / saveIncome / deleteIncome', () => {
    it('getIncomes returns mapped list', async () => {
      setTableResult('incomes', {
        data: [
          {
            id: 'i1',
            user_id: userId,
            name: 'Salary',
            amount_local: 3000,
            amount_dollars: 0,
            local_currency: 'MXN',
            type: 'salary',
            frequency: 'monthly',
            next_payment_date: null,
            notes: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      });
      const list = await getIncomes(userId);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Salary');
      expect(list[0].frequency).toBe('monthly');
    });

    it('saveIncome and deleteIncome call from(incomes)', async () => {
      setTableResult('incomes', { error: null });
      await saveIncome(userId, {
        id: 'i1',
        name: 'Salary',
        amountLocal: 3000,
        amountDollars: 0,
        localCurrency: 'MXN',
        type: 'salary',
        frequency: 'monthly',
        createdAt: '',
        updatedAt: '',
      });
      await deleteIncome(userId, 'i1');
      expect(getMock().fromCalls).toContain('incomes');
    });
  });

  describe('getSubscription / setSubscription', () => {
    it('getSubscription returns null when no data', async () => {
      setTableResult('subscriptions', { data: null, error: { message: 'not found' } });
      const sub = await getSubscription(userId);
      expect(sub).toBeNull();
    });

    it('getSubscription returns mapped subscription', async () => {
      setTableResult('subscriptions', {
        data: {
          plan: 'premium',
          status: 'active',
          interval: 'monthly',
          ends_at: '2025-12-31T00:00:00Z',
        },
        error: null,
      });
      const sub = await getSubscription(userId);
      expect(sub).toEqual({
        plan: 'premium',
        status: 'active',
        interval: 'monthly',
        endsAt: '2025-12-31T00:00:00.000Z',
      });
    });

    it('setSubscription calls upsert', async () => {
      setTableResult('subscriptions', { error: null });
      await setSubscription(userId, { plan: 'premium', status: 'active', interval: 'monthly' });
      expect(getMock().fromCalls).toContain('subscriptions');
    });
  });

  describe('getUserPreferences / setUserPreferences', () => {
    it('getUserPreferences returns null when no data', async () => {
      setTableResult('user_preferences', { data: null, error: {} });
      const prefs = await getUserPreferences(userId);
      expect(prefs).toBeNull();
    });

    it('getUserPreferences returns mapped prefs', async () => {
      setTableResult('user_preferences', {
        data: {
          local_currency: 'CRC',
          language: 'es',
          theme_mode: null,
          color_scheme: null,
          hide_amounts: true,
          has_seen_initial_setup: true,
        },
        error: null,
      });
      const prefs = await getUserPreferences(userId);
      expect(prefs).not.toBeNull();
      expect(prefs!.localCurrency).toBe('CRC');
      expect(prefs!.language).toBe('es');
      expect(prefs!.hideAmounts).toBe(true);
    });

    it('setUserPreferences calls upsert', async () => {
      setTableResult('user_preferences', { error: null });
      await setUserPreferences(userId, { localCurrency: 'CRC' });
      expect(getMock().fromCalls).toContain('user_preferences');
    });
  });

  describe('hydrateFromSupabase', () => {
    it('returns all entities from parallel getters', async () => {
      setTableResult('debts', { data: [], error: null });
      setTableResult('fixed_expenses', { data: [], error: null });
      setTableResult('assets', { data: [], error: null });
      setTableResult('incomes', { data: [], error: null });
      setTableResult('notifications', { data: [], error: null });
      setTableResult('subscriptions', { data: null, error: {} });
      setTableResult('user_preferences', { data: null, error: {} });
      setTableResults('list_orders', [
        { data: { order_ids: [] }, error: null },
        { data: { order_ids: [] }, error: null },
        { data: { order_ids: [] }, error: null },
        { data: { order_ids: [] }, error: null },
      ]);

      const payload = await hydrateFromSupabase(userId);

      expect(payload.debts).toEqual([]);
      expect(payload.fixedExpenses).toEqual([]);
      expect(payload.assets).toEqual([]);
      expect(payload.incomes).toEqual([]);
      expect(payload.notifications).toEqual([]);
      expect(payload.subscription).toBeNull();
      expect(payload.preferences).toBeNull();
      expect(Array.isArray(payload.debtsOrder)).toBe(true);
      expect(Array.isArray(payload.fixedExpensesOrder)).toBe(true);
      expect(Array.isArray(payload.assetsOrder)).toBe(true);
      expect(Array.isArray(payload.incomesOrder)).toBe(true);
    });
  });
});

/**
 * Ejecutor único de acciones IA: recibe AIAction y ejecuta (storage + notify + navigate).
 */

import type { Debt, FixedExpense, Asset, Income } from '../types';
import type { AIAction, AIActionResult } from '../types/ai';
import { isValidAIIntent } from './aiActions';
import { getFullState, getOverviewForAI } from './aiContext';
import { storage } from '../utils/storage';
import { notify } from '../utils/notifications';

const genId = () => Date.now().toString() + Math.random().toString(36).slice(2, 9);

function num(p: unknown): number {
  if (typeof p === 'number' && !isNaN(p)) return p;
  if (typeof p === 'string') return parseFloat(p) || 0;
  return 0;
}

function str(p: unknown): string {
  if (typeof p === 'string') return p;
  if (p != null) return String(p);
  return '';
}


export interface AIExecutorContext {
  navigate: (path: string) => void;
}

export async function executeAIAction(
  action: AIAction,
  context: AIExecutorContext
): Promise<AIActionResult> {
  const { navigate } = context;
  console.log('[AI Executor] executeAIAction – type:', action.type, 'params:', action.params);

  if (!action.type || !isValidAIIntent(action.type)) {
    console.log('[AI Executor] invalid action type:', action.type);
    return { success: false, error: 'Invalid action type' };
  }

  const params = action.params || {};

  try {
    switch (action.type) {
      case 'get_state': {
        const state = getFullState();
        return { success: true, data: state };
      }
      case 'get_overview':
      case 'get_debts': {
        const overview = getOverviewForAI();
        return { success: true, data: overview };
      }

      case 'reply': {
        const message = str(params.message);
        return { success: true, data: { message: message || '' } };
      }

      case 'navigate': {
        const route = str(params.route);
        if (!route) return { success: false, error: 'Missing route' };
        navigate(route.startsWith('/') ? route : '/' + route);
        return { success: true, message: 'Navigated' };
      }

      case 'toggle_hide_amounts':
        return { success: true, message: 'toggle_hide_amounts', data: { type: 'toggle_hide_amounts' } };
      // Caller (Dashboard) must handle actual toggle; we only return success so UI updates

      case 'add_debt': {
        const name = str(params.name);
        if (!name.trim()) return { success: false, error: 'Debt name required' };
        const now = new Date().toISOString();
        const localCurrency = str(params.localCurrency) || storage.getLocalCurrency();
        const newDebt: Debt = {
          id: genId(),
          name: name.trim(),
          type: (str(params.type) === 'tarjeta' ? 'tarjeta' : 'prestamo') as Debt['type'],
          localCurrency,
          localFee: num(params.localFee),
          dollarFee: num(params.dollarFee),
          totalLocal: num(params.totalLocal),
          totalDollars: num(params.totalDollars),
          feeToUpdate: 0,
          feeToUpdateDollars: 0,
          inOrder: true,
          currentPlan: str(params.currentPlan),
          bankName: str(params.bankName),
          bankPhone: str(params.bankPhone) || undefined,
          paymentDay: params.paymentDay != null ? Math.min(31, Math.max(1, num(params.paymentDay))) : undefined,
          cutDay: params.cutDay != null ? Math.min(31, Math.max(1, num(params.cutDay))) : undefined,
          interestRate: (params.interestRate !== undefined && params.interestRate !== null) ? num(params.interestRate) : undefined,
          hasCallTask: Boolean(params.hasCallTask),
          callCompleted: false,
          createdAt: now,
          updatedAt: now,
        };
        storage.saveDebt(newDebt);
        notify.overviewUpdated();
        notify.entryCreated('debt', newDebt.name);
        return { success: true, message: 'Debt created', data: { debtId: newDebt.id } };
      }

      case 'edit_debt': {
        const debtId = str(params.debtId);
        const debt = storage.getDebt(debtId);
        if (!debt) return { success: false, error: 'Debt not found' };
        const updated: Debt = {
          ...debt,
          ...(params.name !== undefined && { name: str(params.name) }),
          ...(params.type !== undefined && { type: str(params.type) as Debt['type'] }),
          ...(params.bankName !== undefined && { bankName: str(params.bankName) }),
          ...(params.localFee !== undefined && { localFee: num(params.localFee) }),
          ...(params.dollarFee !== undefined && { dollarFee: num(params.dollarFee) }),
          ...(params.totalLocal !== undefined && { totalLocal: num(params.totalLocal) }),
          ...(params.totalDollars !== undefined && { totalDollars: num(params.totalDollars) }),
          ...(params.feeToUpdate !== undefined && { feeToUpdate: num(params.feeToUpdate) }),
          ...(params.feeToUpdateDollars !== undefined && { feeToUpdateDollars: num(params.feeToUpdateDollars) }),
          ...(params.currentPlan !== undefined && { currentPlan: str(params.currentPlan) }),
          ...(params.paymentDay !== undefined && { paymentDay: Math.min(31, Math.max(1, num(params.paymentDay))) }),
          ...(params.cutDay !== undefined && { cutDay: Math.min(31, Math.max(1, num(params.cutDay))) }),
          ...(params.interestRate !== undefined && { interestRate: num(params.interestRate) }),
          ...(params.hasCallTask !== undefined && { hasCallTask: Boolean(params.hasCallTask) }),
          ...(params.callCompleted !== undefined && { callCompleted: Boolean(params.callCompleted) }),
          ...(params.bankPhone !== undefined && { bankPhone: str(params.bankPhone) || undefined }),
          updatedAt: new Date().toISOString(),
        };
        if (updated.totalLocal === 0 && updated.totalDollars === 0) {
          updated.closedAt = new Date().toISOString();
          updated.localFee = 0;
          updated.dollarFee = 0;
        }
        storage.saveDebt(updated);
        notify.overviewUpdated();
        return { success: true, message: 'Debt updated' };
      }

      case 'delete_debt': {
        const debtId = str(params.debtId);
        const debt = storage.getDebt(debtId);
        if (!debt) return { success: false, error: 'Debt not found' };
        storage.deleteDebt(debtId);
        notify.overviewUpdated();
        return { success: true, message: 'Debt deleted' };
      }

      case 'delete_all_debts': {
        const allDebts = storage.getDebts();
        for (const d of allDebts) storage.deleteDebt(d.id);
        if (allDebts.length > 0) notify.overviewUpdated();
        return { success: true, message: allDebts.length > 0 ? `Deleted ${allDebts.length} debt(s)` : 'No debts to delete' };
      }

      case 'complete_debt': {
        const debtId = str(params.debtId);
        const debt = storage.getDebt(debtId);
        if (!debt) return { success: false, error: 'Debt not found' };
        const updated: Debt = {
          ...debt,
          totalLocal: 0,
          totalDollars: 0,
          localFee: 0,
          dollarFee: 0,
          inOrder: true,
          closedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.saveDebt(updated);
        notify.overviewUpdated();
        return { success: true, message: 'Debt marked as paid off' };
      }

      case 'add_fixed_expense': {
        const name = str(params.name);
        if (!name.trim()) return { success: false, error: 'Expense name required' };
        const now = new Date().toISOString();
        const newExpense: FixedExpense = {
          id: genId(),
          name: name.trim(),
          amountLocal: num(params.amountLocal),
          amountDollars: num(params.amountDollars),
          localCurrency: str(params.localCurrency) || storage.getLocalCurrency(),
          paymentDay: params.paymentDay != null ? Math.min(31, Math.max(1, num(params.paymentDay))) : undefined,
          notes: str(params.notes) || undefined,
          createdAt: now,
          updatedAt: now,
        };
        storage.saveFixedExpense(newExpense);
        notify.overviewUpdated();
        notify.entryCreated('fixed_expense', newExpense.name);
        return { success: true, message: 'Fixed expense created', data: { expenseId: newExpense.id } };
      }

      case 'edit_fixed_expense': {
        const expenseId = str(params.expenseId);
        const expense = storage.getFixedExpense(expenseId);
        if (!expense) return { success: false, error: 'Expense not found' };
        const updated: FixedExpense = {
          ...expense,
          ...(params.name !== undefined && { name: str(params.name) }),
          ...(params.amountLocal !== undefined && { amountLocal: num(params.amountLocal) }),
          ...(params.amountDollars !== undefined && { amountDollars: num(params.amountDollars) }),
          ...(params.paymentDay !== undefined && { paymentDay: Math.min(31, Math.max(1, num(params.paymentDay))) }),
          ...(params.notes !== undefined && { notes: str(params.notes) || undefined }),
          updatedAt: new Date().toISOString(),
        };
        storage.saveFixedExpense(updated);
        notify.overviewUpdated();
        return { success: true, message: 'Fixed expense updated' };
      }

      case 'delete_fixed_expense': {
        const expenseId = str(params.expenseId);
        if (!storage.getFixedExpense(expenseId)) return { success: false, error: 'Expense not found' };
        storage.deleteFixedExpense(expenseId);
        notify.overviewUpdated();
        return { success: true, message: 'Fixed expense deleted' };
      }

      case 'delete_all_fixed_expenses': {
        const allExpenses = storage.getFixedExpenses();
        for (const e of allExpenses) storage.deleteFixedExpense(e.id);
        if (allExpenses.length > 0) notify.overviewUpdated();
        return { success: true, message: allExpenses.length > 0 ? `Deleted ${allExpenses.length} fixed expense(s)` : 'No fixed expenses to delete' };
      }

      case 'add_asset': {
        const name = str(params.name);
        if (!name.trim()) return { success: false, error: 'Asset name required' };
        const now = new Date().toISOString();
        const type = (str(params.type) || 'other') as Asset['type'];
        const validTypes: Asset['type'][] = ['property', 'vehicle', 'investment', 'savings', 'other'];
        const newAsset: Asset = {
          id: genId(),
          name: name.trim(),
          type: validTypes.includes(type) ? type : 'other',
          valueLocal: num(params.valueLocal),
          valueDollars: num(params.valueDollars),
          localCurrency: str(params.localCurrency) || storage.getLocalCurrency(),
          purchaseDate: params.purchaseDate ? new Date(str(params.purchaseDate)).toISOString().slice(0, 10) : undefined,
          notes: str(params.notes) || undefined,
          createdAt: now,
          updatedAt: now,
        };
        storage.saveAsset(newAsset);
        notify.overviewUpdated();
        return { success: true, message: 'Asset created', data: { assetId: newAsset.id } };
      }

      case 'edit_asset': {
        const assetId = str(params.assetId);
        const asset = storage.getAsset(assetId);
        if (!asset) return { success: false, error: 'Asset not found' };
        const type = (str(params.type) || asset.type) as Asset['type'];
        const validTypes: Asset['type'][] = ['property', 'vehicle', 'investment', 'savings', 'other'];
        const updated: Asset = {
          ...asset,
          ...(params.name !== undefined && { name: str(params.name) }),
          ...(params.type !== undefined && { type: validTypes.includes(type) ? type : asset.type }),
          ...(params.valueLocal !== undefined && { valueLocal: num(params.valueLocal) }),
          ...(params.valueDollars !== undefined && { valueDollars: num(params.valueDollars) }),
          ...(params.purchaseDate !== undefined && { purchaseDate: str(params.purchaseDate) || undefined }),
          ...(params.notes !== undefined && { notes: str(params.notes) || undefined }),
          updatedAt: new Date().toISOString(),
        };
        storage.saveAsset(updated);
        notify.overviewUpdated();
        return { success: true, message: 'Asset updated' };
      }

      case 'delete_asset': {
        const assetId = str(params.assetId);
        if (!storage.getAsset(assetId)) return { success: false, error: 'Asset not found' };
        storage.deleteAsset(assetId);
        notify.overviewUpdated();
        return { success: true, message: 'Asset deleted' };
      }

      case 'delete_all_assets': {
        const allAssets = storage.getAssets();
        for (const a of allAssets) storage.deleteAsset(a.id);
        if (allAssets.length > 0) notify.overviewUpdated();
        return { success: true, message: allAssets.length > 0 ? `Deleted ${allAssets.length} asset(s)` : 'No assets to delete' };
      }

      case 'complete_asset':
        navigate(`/complete-asset/${params.assetId}`);
        return { success: true, message: 'Opening liquidate asset' };

      case 'add_income': {
        const name = str(params.name);
        if (!name.trim()) return { success: false, error: 'Income name required' };
        const now = new Date().toISOString();
        const type = (str(params.type) || 'salary') as Income['type'];
        const frequency = (str(params.frequency) || 'monthly') as Income['frequency'];
        const validTypes: Income['type'][] = ['salary', 'freelance', 'investment', 'rental', 'other'];
        const validFreq: Income['frequency'][] = ['monthly', 'weekly', 'biweekly', 'yearly', 'one-time'];
        const newIncome: Income = {
          id: genId(),
          name: name.trim(),
          amountLocal: num(params.amountLocal),
          amountDollars: num(params.amountDollars),
          localCurrency: str(params.localCurrency) || storage.getLocalCurrency(),
          type: validTypes.includes(type) ? type : 'salary',
          frequency: validFreq.includes(frequency) ? frequency : 'monthly',
          paymentDay: params.paymentDay != null ? Math.min(31, Math.max(1, num(params.paymentDay))) : undefined,
          notes: str(params.notes) || undefined,
          createdAt: now,
          updatedAt: now,
        };
        storage.saveIncome(newIncome);
        notify.overviewUpdated();
        notify.entryCreated('income', newIncome.name);
        console.log('[AI Executor] add_income OK – id:', newIncome.id, 'name:', newIncome.name);
        return { success: true, message: 'Income created', data: { incomeId: newIncome.id } };
      }

      case 'edit_income': {
        const incomeId = str(params.incomeId);
        const income = storage.getIncome(incomeId);
        if (!income) return { success: false, error: 'Income not found' };
        const type = (str(params.type) || income.type) as Income['type'];
        const frequency = (str(params.frequency) || income.frequency) as Income['frequency'];
        const validTypes: Income['type'][] = ['salary', 'freelance', 'investment', 'rental', 'other'];
        const validFreq: Income['frequency'][] = ['monthly', 'weekly', 'biweekly', 'yearly', 'one-time'];
        const updated: Income = {
          ...income,
          ...(params.name !== undefined && { name: str(params.name) }),
          ...(params.amountLocal !== undefined && { amountLocal: num(params.amountLocal) }),
          ...(params.amountDollars !== undefined && { amountDollars: num(params.amountDollars) }),
          ...(params.type !== undefined && { type: validTypes.includes(type) ? type : income.type }),
          ...(params.frequency !== undefined && { frequency: validFreq.includes(frequency) ? frequency : income.frequency }),
          ...(params.paymentDay !== undefined && { paymentDay: Math.min(31, Math.max(1, num(params.paymentDay))) }),
          ...(params.notes !== undefined && { notes: str(params.notes) || undefined }),
          updatedAt: new Date().toISOString(),
        };
        storage.saveIncome(updated);
        notify.overviewUpdated();
        return { success: true, message: 'Income updated' };
      }

      case 'delete_income': {
        const incomeId = str(params.incomeId);
        if (!storage.getIncome(incomeId)) return { success: false, error: 'Income not found' };
        storage.deleteIncome(incomeId);
        notify.overviewUpdated();
        return { success: true, message: 'Income deleted' };
      }

      case 'delete_all_incomes': {
        const allIncomes = storage.getIncomes();
        for (const i of allIncomes) storage.deleteIncome(i.id);
        if (allIncomes.length > 0) notify.overviewUpdated();
        return { success: true, message: allIncomes.length > 0 ? `Deleted ${allIncomes.length} income(s)` : 'No incomes to delete' };
      }

      default:
        return { success: false, error: 'Action not implemented' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Especificación de intents y parámetros para validación y documentación.
 * Cualquier IA que envíe JSON debe respetar estos tipos y params.
 */

import type { AIIntent } from '../types/ai';

export const AI_ACTION_TYPES: AIIntent[] = [
  'add_debt',
  'edit_debt',
  'delete_debt',
  'delete_all_debts',
  'complete_debt',
  'add_fixed_expense',
  'edit_fixed_expense',
  'delete_fixed_expense',
  'delete_all_fixed_expenses',
  'add_asset',
  'edit_asset',
  'delete_asset',
  'delete_all_assets',
  'complete_asset',
  'add_income',
  'edit_income',
  'delete_income',
  'delete_all_incomes',
  'navigate',
  'toggle_hide_amounts',
  'get_overview',
  'get_debts',
  'get_state',
  'reply',
];

/** Parámetros requeridos/opcionales por intent (para validación y docs). */
export const AI_ACTION_PARAMS: Record<
  AIIntent,
  { required?: string[]; optional?: string[] }
> = {
  add_debt: {
    required: ['name'],
    optional: [
      'type',
      'bankName',
      'localCurrency',
      'localFee',
      'dollarFee',
      'totalLocal',
      'totalDollars',
      'currentPlan',
      'paymentDate',
      'cutDate',
      'interestRate',
      'hasCallTask',
      'bankPhone',
    ],
  },
  edit_debt: {
    required: ['debtId'],
    optional: [
      'name',
      'type',
      'bankName',
      'localFee',
      'dollarFee',
      'totalLocal',
      'totalDollars',
      'feeToUpdate',
      'feeToUpdateDollars',
      'currentPlan',
      'paymentDate',
      'cutDate',
      'interestRate',
      'hasCallTask',
      'callCompleted',
      'bankPhone',
    ],
  },
  delete_debt: { required: ['debtId'] },
  delete_all_debts: {},
  complete_debt: { required: ['debtId'] },
  add_fixed_expense: {
    required: ['name'],
    optional: ['amountLocal', 'amountDollars', 'localCurrency', 'category', 'dueDate', 'notes'],
  },
  edit_fixed_expense: {
    required: ['expenseId'],
    optional: ['name', 'amountLocal', 'amountDollars', 'category', 'dueDate', 'notes'],
  },
  delete_fixed_expense: { required: ['expenseId'] },
  delete_all_fixed_expenses: {},
  add_asset: {
    required: ['name'],
    optional: ['type', 'valueLocal', 'valueDollars', 'localCurrency', 'purchaseDate', 'notes'],
  },
  edit_asset: {
    required: ['assetId'],
    optional: ['name', 'type', 'valueLocal', 'valueDollars', 'purchaseDate', 'notes'],
  },
  delete_asset: { required: ['assetId'] },
  delete_all_assets: {},
  complete_asset: { required: ['assetId'] },
  add_income: {
    required: ['name'],
    optional: [
      'amountLocal',
      'amountDollars',
      'localCurrency',
      'type',
      'frequency',
      'nextPaymentDate',
      'notes',
    ],
  },
  edit_income: {
    required: ['incomeId'],
    optional: ['name', 'amountLocal', 'amountDollars', 'type', 'frequency', 'nextPaymentDate', 'notes'],
  },
  delete_income: { required: ['incomeId'] },
  delete_all_incomes: {},
  navigate: { required: ['route'] },
  toggle_hide_amounts: {},
  get_overview: {},
  get_debts: {},
  get_state: {},
  reply: { required: ['message'], optional: [] },
};

export function isValidAIIntent(type: string): type is AIIntent {
  return AI_ACTION_TYPES.includes(type as AIIntent);
}

/**
 * Capa de lectura para la IA: estado completo y resumen.
 * La IA (o el módulo que hable con ella) puede leer todo sin tocar la UI.
 */

import { storage } from '../utils/storage';
import type { Debt, FixedExpense, Asset, Income } from '../types';

export interface FullState {
  debts: Debt[];
  fixedExpenses: FixedExpense[];
  assets: Asset[];
  incomes: Income[];
}

export interface OverviewForAI {
  localCurrency: string;
  totalDebtLocal: number;
  totalDebtDollars: number;
  totalMonthlyLocal: number;
  totalMonthlyDollars: number;
  totalFixedExpensesLocal: number;
  totalFixedExpensesDollars: number;
  totalAssetsLocal: number;
  totalAssetsDollars: number;
  totalIncomesLocal: number;
  totalIncomesDollars: number;
  netWorthLocal: number;
  netWorthDollars: number;
  debtCount: number;
  expenseCount: number;
  assetCount: number;
  incomeCount: number;
}

export function getFullState(): FullState {
  return {
    debts: storage.getDebts(),
    fixedExpenses: storage.getFixedExpenses(),
    assets: storage.getAssets(),
    incomes: storage.getIncomes(),
  };
}

export function getOverviewForAI(): OverviewForAI {
  const debts = storage.getDebts();
  const fixedExpenses = storage.getFixedExpenses();
  const assets = storage.getAssets();
  const incomes = storage.getIncomes();
  const localCurrency = storage.getLocalCurrency();

  const totalDebtLocal = debts.reduce((s, d) => s + (d.totalLocal || 0), 0);
  const totalDebtDollars = debts.reduce((s, d) => s + (d.totalDollars || 0), 0);
  const totalMonthlyLocal = debts.reduce((s, d) => s + (d.localFee || 0), 0);
  const totalMonthlyDollars = debts.reduce((s, d) => s + (d.dollarFee || 0), 0);

  const totalFixedExpensesLocal = fixedExpenses.reduce((s, e) => s + (e.amountLocal || 0), 0);
  const totalFixedExpensesDollars = fixedExpenses.reduce((s, e) => s + (e.amountDollars || 0), 0);

  const totalAssetsLocal = assets.reduce((s, a) => s + (a.valueLocal || 0), 0);
  const totalAssetsDollars = assets.reduce((s, a) => s + (a.valueDollars || 0), 0);

  const totalIncomesLocal = incomes.reduce((s, i) => s + (i.amountLocal || 0), 0);
  const totalIncomesDollars = incomes.reduce((s, i) => s + (i.amountDollars || 0), 0);

  const netWorthLocal = totalAssetsLocal - totalDebtLocal;
  const netWorthDollars = totalAssetsDollars - totalDebtDollars;

  return {
    localCurrency,
    totalDebtLocal,
    totalDebtDollars,
    totalMonthlyLocal,
    totalMonthlyDollars,
    totalFixedExpensesLocal,
    totalFixedExpensesDollars,
    totalAssetsLocal,
    totalAssetsDollars,
    totalIncomesLocal,
    totalIncomesDollars,
    netWorthLocal,
    netWorthDollars,
    debtCount: debts.length,
    expenseCount: fixedExpenses.length,
    assetCount: assets.length,
    incomeCount: incomes.length,
  };
}

/** Texto resumido para respuestas en lenguaje natural (es/en). */
export function getSummaryText(lang: 'es' | 'en'): string {
  const state = getFullState();
  const overview = getOverviewForAI();
  const { localCurrency } = overview;

  const lines: string[] = [];
  if (lang === 'es') {
    lines.push(`Tienes ${overview.debtCount} deuda(s). Total deuda: ${localCurrency} ${overview.totalDebtLocal.toLocaleString()}, USD ${overview.totalDebtDollars.toLocaleString()}.`);
    lines.push(`Pagos mensuales (deudas): ${localCurrency} ${overview.totalMonthlyLocal.toLocaleString()}, USD ${overview.totalMonthlyDollars.toLocaleString()}.`);
    lines.push(`${overview.expenseCount} gasto(s) fijo(s): ${localCurrency} ${overview.totalFixedExpensesLocal.toLocaleString()}, USD ${overview.totalFixedExpensesDollars.toLocaleString()}.`);
    lines.push(`${overview.assetCount} activo(s): ${localCurrency} ${overview.totalAssetsLocal.toLocaleString()}, USD ${overview.totalAssetsDollars.toLocaleString()}.`);
    lines.push(`${overview.incomeCount} ingreso(s): ${localCurrency} ${overview.totalIncomesLocal.toLocaleString()}, USD ${overview.totalIncomesDollars.toLocaleString()}.`);
    lines.push(`Patrimonio neto: ${localCurrency} ${overview.netWorthLocal.toLocaleString()}, USD ${overview.netWorthDollars.toLocaleString()}.`);
  } else {
    lines.push(`You have ${overview.debtCount} debt(s). Total debt: ${localCurrency} ${overview.totalDebtLocal.toLocaleString()}, USD ${overview.totalDebtDollars.toLocaleString()}.`);
    lines.push(`Monthly payments (debts): ${localCurrency} ${overview.totalMonthlyLocal.toLocaleString()}, USD ${overview.totalMonthlyDollars.toLocaleString()}.`);
    lines.push(`${overview.expenseCount} fixed expense(s): ${localCurrency} ${overview.totalFixedExpensesLocal.toLocaleString()}, USD ${overview.totalFixedExpensesDollars.toLocaleString()}.`);
    lines.push(`${overview.assetCount} asset(s): ${localCurrency} ${overview.totalAssetsLocal.toLocaleString()}, USD ${overview.totalAssetsDollars.toLocaleString()}.`);
    lines.push(`${overview.incomeCount} income(s): ${localCurrency} ${overview.totalIncomesLocal.toLocaleString()}, USD ${overview.totalIncomesDollars.toLocaleString()}.`);
    lines.push(`Net worth: ${localCurrency} ${overview.netWorthLocal.toLocaleString()}, USD ${overview.netWorthDollars.toLocaleString()}.`);
  }

  if (state.debts.length > 0 && lang === 'es') {
    lines.push(' Deudas: ' + state.debts.map((d) => d.name).join(', ') + '.');
  } else if (state.debts.length > 0) {
    lines.push(' Debts: ' + state.debts.map((d) => d.name).join(', ') + '.');
  }

  return lines.join(' ');
}

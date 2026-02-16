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

/** Convierte ingreso a equivalente mensual según frecuencia. */
function incomeToMonthlyLocal(income: Income): number {
  const local = income.amountLocal ?? 0;
  switch (income.frequency) {
    case 'monthly': return local;
    case 'weekly': return local * 4.33;
    case 'biweekly': return local * 2.17;
    case 'yearly': return local / 12;
    default: return 0;
  }
}
function incomeToMonthlyDollars(income: Income): number {
  const dollars = income.amountDollars ?? 0;
  switch (income.frequency) {
    case 'monthly': return dollars;
    case 'weekly': return dollars * 4.33;
    case 'biweekly': return dollars * 2.17;
    case 'yearly': return dollars / 12;
    default: return 0;
  }
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
  /** Ingreso mensual equivalente (por frecuencias). */
  totalMonthlyIncomeLocal: number;
  totalMonthlyIncomeDollars: number;
  /** Gastos mensuales totales (cuotas deuda + gastos fijos). */
  totalMonthlyExpensesLocal: number;
  totalMonthlyExpensesDollars: number;
  /** Ingreso mensual - gastos mensuales. */
  monthlySurplusLocal: number;
  monthlySurplusDollars: number;
  /** Meses para salir de deudas si todo el surplus se destina a deuda (null si surplus <= 0 o sin deuda). */
  monthsToPayOffDebt: number | null;
  /** Runway: meses que aguantas con patrimonio neto positivo si no hubiera ingresos (null si no aplica). */
  runwayMonths: number | null;
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

  const totalMonthlyIncomeLocal = incomes.reduce((s, i) => s + incomeToMonthlyLocal(i), 0);
  const totalMonthlyIncomeDollars = incomes.reduce((s, i) => s + incomeToMonthlyDollars(i), 0);

  const totalMonthlyExpensesLocal = totalMonthlyLocal + totalFixedExpensesLocal;
  const totalMonthlyExpensesDollars = totalMonthlyDollars + totalFixedExpensesDollars;

  const monthlySurplusLocal = totalMonthlyIncomeLocal - totalMonthlyExpensesLocal;
  const monthlySurplusDollars = totalMonthlyIncomeDollars - totalMonthlyExpensesDollars;

  const totalDebt = totalDebtLocal + totalDebtDollars;
  const monthlySurplus = monthlySurplusLocal + monthlySurplusDollars;
  const monthsToPayOffDebt =
    totalDebt > 0 && monthlySurplus > 0
      ? Math.ceil(totalDebt / monthlySurplus)
      : null;

  const netWorthLocal = totalAssetsLocal - totalDebtLocal;
  const netWorthDollars = totalAssetsDollars - totalDebtDollars;
  const netWorth = netWorthLocal + netWorthDollars;
  const monthlyExpenses = totalMonthlyExpensesLocal + totalMonthlyExpensesDollars;
  const runwayMonths =
    netWorth > 0 && monthlyExpenses > 0
      ? Math.floor(netWorth / monthlyExpenses)
      : null;

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
    totalMonthlyIncomeLocal,
    totalMonthlyIncomeDollars,
    totalMonthlyExpensesLocal,
    totalMonthlyExpensesDollars,
    monthlySurplusLocal,
    monthlySurplusDollars,
    monthsToPayOffDebt,
    runwayMonths,
  };
}

/** Texto resumido para respuestas en lenguaje natural (es/en). Incluye métricas de análisis. */
export function getSummaryText(lang: 'es' | 'en'): string {
  const state = getFullState();
  const overview = getOverviewForAI();
  const { localCurrency } = overview;

  const lines: string[] = [];
  if (lang === 'es') {
    lines.push(`Tienes ${overview.debtCount} deuda(s). Total deuda: ${localCurrency} ${overview.totalDebtLocal.toLocaleString()}, USD ${overview.totalDebtDollars.toLocaleString()}.`);
    lines.push(`Pagos mensuales (deudas): ${localCurrency} ${overview.totalMonthlyLocal.toLocaleString()}, USD ${overview.totalMonthlyDollars.toLocaleString()}.`);
    lines.push(`${overview.expenseCount} gasto(s) fijo(s): ${localCurrency} ${overview.totalFixedExpensesLocal.toLocaleString()}, USD ${overview.totalFixedExpensesDollars.toLocaleString()}.`);
    lines.push(`Gastos mensuales totales: ${localCurrency} ${overview.totalMonthlyExpensesLocal.toLocaleString()}, USD ${overview.totalMonthlyExpensesDollars.toLocaleString()}.`);
    lines.push(`Ingreso mensual equivalente: ${localCurrency} ${overview.totalMonthlyIncomeLocal.toLocaleString()}, USD ${overview.totalMonthlyIncomeDollars.toLocaleString()}.`);
    lines.push(`Superávit mensual: ${localCurrency} ${overview.monthlySurplusLocal.toLocaleString()}, USD ${overview.monthlySurplusDollars.toLocaleString()}.`);
    if (overview.monthsToPayOffDebt != null) {
      lines.push(`Meses estimados para salir de deudas (destinando todo el superávit): ${overview.monthsToPayOffDebt}.`);
    }
    if (overview.runwayMonths != null) {
      lines.push(`Runway (meses que aguantas sin ingresos con patrimonio actual): ${overview.runwayMonths}.`);
    }
    lines.push(`${overview.assetCount} activo(s): ${localCurrency} ${overview.totalAssetsLocal.toLocaleString()}, USD ${overview.totalAssetsDollars.toLocaleString()}.`);
    lines.push(`Patrimonio neto: ${localCurrency} ${overview.netWorthLocal.toLocaleString()}, USD ${overview.netWorthDollars.toLocaleString()}.`);
  } else {
    lines.push(`You have ${overview.debtCount} debt(s). Total debt: ${localCurrency} ${overview.totalDebtLocal.toLocaleString()}, USD ${overview.totalDebtDollars.toLocaleString()}.`);
    lines.push(`Monthly payments (debts): ${localCurrency} ${overview.totalMonthlyLocal.toLocaleString()}, USD ${overview.totalMonthlyDollars.toLocaleString()}.`);
    lines.push(`${overview.expenseCount} fixed expense(s): ${localCurrency} ${overview.totalFixedExpensesLocal.toLocaleString()}, USD ${overview.totalFixedExpensesDollars.toLocaleString()}.`);
    lines.push(`Total monthly expenses: ${localCurrency} ${overview.totalMonthlyExpensesLocal.toLocaleString()}, USD ${overview.totalMonthlyExpensesDollars.toLocaleString()}.`);
    lines.push(`Monthly income equivalent: ${localCurrency} ${overview.totalMonthlyIncomeLocal.toLocaleString()}, USD ${overview.totalMonthlyIncomeDollars.toLocaleString()}.`);
    lines.push(`Monthly surplus: ${localCurrency} ${overview.monthlySurplusLocal.toLocaleString()}, USD ${overview.monthlySurplusDollars.toLocaleString()}.`);
    if (overview.monthsToPayOffDebt != null) {
      lines.push(`Estimated months to pay off debt (putting all surplus to debt): ${overview.monthsToPayOffDebt}.`);
    }
    if (overview.runwayMonths != null) {
      lines.push(`Runway (months you can cover without income with current net worth): ${overview.runwayMonths}.`);
    }
    lines.push(`${overview.assetCount} asset(s): ${localCurrency} ${overview.totalAssetsLocal.toLocaleString()}, USD ${overview.totalAssetsDollars.toLocaleString()}.`);
    lines.push(`Net worth: ${localCurrency} ${overview.netWorthLocal.toLocaleString()}, USD ${overview.netWorthDollars.toLocaleString()}.`);
  }

  if (state.debts.length > 0) {
    const detail = state.debts
      .map((d) => `${d.name} total ${(d.totalLocal || 0) + (d.totalDollars || 0)} cuota ${(d.localFee || 0) + (d.dollarFee || 0)}`)
      .join('; ');
    lines.push(lang === 'es' ? ` Detalle deudas: ${detail}.` : ` Debt detail: ${detail}.`);
  }
  if (state.fixedExpenses.length > 0) {
    const detail = state.fixedExpenses
      .map((e) => `${e.name} ${(e.amountLocal || 0) + (e.amountDollars || 0)}`)
      .join('; ');
    lines.push(lang === 'es' ? ` Gastos fijos: ${detail}.` : ` Fixed expenses: ${detail}.`);
  }
  if (state.incomes.length > 0) {
    const detail = state.incomes
      .map((i) => `${i.name} ${(i.amountLocal || 0) + (i.amountDollars || 0)} ${i.frequency}`)
      .join('; ');
    lines.push(lang === 'es' ? ` Ingresos: ${detail}.` : ` Incomes: ${detail}.`);
  }

  return lines.join(' ');
}

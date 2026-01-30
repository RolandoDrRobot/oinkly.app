/**
 * AI Voice Control — Contrato de acciones para cualquier IA.
 * Cualquier cliente (parsing local, IA externa) puede enviar acciones en este formato.
 */

export type AIIntent =
  // Deudas
  | 'add_debt'
  | 'edit_debt'
  | 'delete_debt'
  | 'complete_debt'
  // Compromisos
  | 'add_commitment'
  | 'edit_commitment'
  | 'delete_commitment'
  | 'complete_commitment'
  // Llamadas
  | 'add_call'
  | 'edit_call'
  | 'delete_call'
  // Gastos fijos
  | 'add_fixed_expense'
  | 'edit_fixed_expense'
  | 'delete_fixed_expense'
  // Activos
  | 'add_asset'
  | 'edit_asset'
  | 'delete_asset'
  | 'complete_asset'
  // Ingresos
  | 'add_income'
  | 'edit_income'
  | 'delete_income'
  // UI / lectura
  | 'navigate'
  | 'toggle_hide_amounts'
  | 'get_overview'
  | 'get_debts'
  | 'get_state';

export interface AIAction {
  type: AIIntent;
  params?: Record<string, unknown>;
}

export interface AIActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

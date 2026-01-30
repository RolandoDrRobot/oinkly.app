/**
 * Parser de texto/voz a AIAction.
 * Convierte frases en español/inglés a acciones estructuradas para executeAIAction.
 */

import type { AIAction } from '../types/ai';
import type { Debt } from '../types';
import { getSummaryText } from './aiContext';

export function parseTextToAIAction(text: string, debts: Debt[]): AIAction | null {
  const lower = text.toLowerCase().trim();

  // —— Navegación y UI ——
  if (/agregar deuda|add debt|nueva deuda|new debt/i.test(lower)) {
    return { type: 'navigate', params: { route: '/add-debt' } };
  }
  if (/resumen|overview|total|cuánto debo|how much|patrimonio|net worth/i.test(lower)) {
    return { type: 'get_overview' };
  }
  if (/ocultar montos|hide amounts|mostrar montos|show amounts/i.test(lower)) {
    return { type: 'toggle_hide_amounts' };
  }
  if (/sobre|about|método|method/i.test(lower)) {
    return { type: 'navigate', params: { route: '/about' } };
  }
  if (/perfil|profile/i.test(lower)) {
    return { type: 'navigate', params: { route: '/profile' } };
  }
  if (/preferencias|preferences/i.test(lower)) {
    return { type: 'navigate', params: { route: '/preferences' } };
  }
  if (/agregar gasto|add expense|gasto fijo|fixed expense/i.test(lower)) {
    return { type: 'navigate', params: { route: '/add-fixed-expense' } };
  }
  if (/agregar activo|add asset|nuevo activo|new asset/i.test(lower)) {
    return { type: 'navigate', params: { route: '/add-asset' } };
  }
  if (/agregar ingreso|add income|nuevo ingreso|new income/i.test(lower)) {
    return { type: 'navigate', params: { route: '/add-income' } };
  }

  // —— Compromiso: "agregar compromiso para [deuda] [monto]" ——
  const commitmentMatch = lower.match(
    /(?:agregar|add|crear|create)\s*(?:compromiso|commitment)\s*(?:para|to|de|for)?\s*(.+?)(?:\s+con|\s+with|\s+de|\s+of)?\s*(\d+(?:[.,]\d+)?)/i
  );
  if (commitmentMatch) {
    const debtName = commitmentMatch[1]?.trim();
    const amount = parseFloat(commitmentMatch[2].replace(',', '.')) || 0;
    const debt = debts.find((d) => d.name.toLowerCase().includes(debtName?.toLowerCase() || ''));
    if (debt && amount > 0) {
      return {
        type: 'add_commitment',
        params: { debtId: debt.id, amountLocal: amount, amountDollars: 0 },
      };
    }
  }

  // —— Completar compromiso: "completar compromiso [deuda]" ——
  if (/completar compromiso|complete commitment|pago realizado|payment made/i.test(lower)) {
    const debtMatch = lower.match(/(?:para|to|de|for)?\s*(.+?)(?:\s+compromiso|\s+commitment)?$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : debts[0];
    if (debt?.commitments?.length) {
      const pending = debt.commitments.find((c) => c.status === 'pending');
      if (pending) {
        return { type: 'complete_commitment', params: { debtId: debt.id, commitmentId: pending.id } };
      }
      return { type: 'navigate', params: { route: `/complete-commitment/${debt.id}/${debt.commitments[0].id}` } };
    }
  }

  // —— Eliminar deuda ——
  if (/eliminar deuda|delete debt|borrar deuda/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'delete_debt', params: { debtId: debt.id } };
    }
  }

  // —— Registrar llamada ——
  if (/registrar llamada|record call|llamada/i.test(lower)) {
    const debtMatch = lower.match(/(?:para|to|de|for)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : debts[0];
    if (debt) {
      return { type: 'add_call', params: { debtId: debt.id } };
    }
  }

  // —— Editar deuda (abrir pantalla) ——
  if (/editar deuda|edit debt/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'navigate', params: { route: `/edit-debt/${debt.id}` } };
    }
  }

  // —— Marcar deuda como pagada ——
  if (/completar deuda|complete debt|deuda pagada|debt paid/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'complete_debt', params: { debtId: debt.id } };
    }
  }

  return null;
}

/** Construye mensaje de respuesta para el usuario a partir del resultado del ejecutor y la acción. */
export function getMessageForActionResult(
  action: AIAction,
  result: { success: boolean; message?: string; error?: string; data?: unknown },
  lang: 'es' | 'en'
): string {
  if (!result.success) {
    const err = result.error || result.message || '';
    return lang === 'es' ? `Error: ${err}` : `Error: ${err}`;
  }
  if (action.type === 'get_overview' || action.type === 'get_debts') {
    return getSummaryText(lang);
  }
  if (action.type === 'get_state') {
    return lang === 'es' ? 'Estado cargado.' : 'State loaded.';
  }
  if (action.type === 'toggle_hide_amounts') {
    return lang === 'es' ? 'Montos ocultos/mostrados.' : 'Amounts hidden/shown.';
  }
  if (action.type === 'navigate') {
    const route = (action.params?.route as string) || '';
    return lang === 'es' ? `Navegando a ${route}.` : `Navigating to ${route}.`;
  }
  return (result.message as string) || (lang === 'es' ? 'Listo.' : 'Done.');
}

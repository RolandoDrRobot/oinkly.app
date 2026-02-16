import { parseTextToAIAction, getMessageForActionResult } from './aiParser';
import type { AIAction } from '../types/ai';
import type { Debt } from '../types';

jest.mock('./aiContext', () => ({
  getSummaryText: jest.fn(() => 'Summary text'),
}));

const emptyDebts: Debt[] = [];

describe('parseTextToAIAction', () => {
  it('returns navigate to dashboard for "ir al inicio" and "go to dashboard"', () => {
    expect(parseTextToAIAction('ir al inicio', emptyDebts)).toEqual({
      type: 'navigate',
      params: { route: '/dashboard' },
    });
    expect(parseTextToAIAction('go to dashboard', emptyDebts)).toEqual({
      type: 'navigate',
      params: { route: '/dashboard' },
    });
  });

  it('returns get_overview for "resumen" and "dame el resumen"', () => {
    expect(parseTextToAIAction('resumen', emptyDebts)).toEqual({ type: 'get_overview' });
    expect(parseTextToAIAction('dame el resumen', emptyDebts)).toEqual({ type: 'get_overview' });
  });

  it('returns get_overview for overview / how much (en)', () => {
    expect(parseTextToAIAction('overview', emptyDebts)).toEqual({ type: 'get_overview' });
    expect(parseTextToAIAction('how much do I owe', emptyDebts)).toEqual({ type: 'get_overview' });
  });

  it('returns get_overview for analysis-style questions (fallback when no AI)', () => {
    expect(parseTextToAIAction('cuánto tiempo me queda de pago', emptyDebts)).toEqual({ type: 'get_overview' });
    expect(parseTextToAIAction('dame un plan', emptyDebts)).toEqual({ type: 'get_overview' });
    expect(parseTextToAIAction('en cuánto salgo de deudas', emptyDebts)).toEqual({ type: 'get_overview' });
  });

  it('returns toggle_hide_amounts for "ocultar montos" and "hide amounts"', () => {
    expect(parseTextToAIAction('ocultar montos', emptyDebts)).toEqual({ type: 'toggle_hide_amounts' });
    expect(parseTextToAIAction('hide amounts', emptyDebts)).toEqual({ type: 'toggle_hide_amounts' });
  });

  it('returns navigate to preferences for "preferencias"', () => {
    expect(parseTextToAIAction('preferencias', emptyDebts)).toEqual({
      type: 'navigate',
      params: { route: '/preferences' },
    });
  });

  it('returns delete_all_debts for "eliminar todas las deudas"', () => {
    expect(parseTextToAIAction('eliminar todas las deudas', emptyDebts)).toEqual({
      type: 'delete_all_debts',
      params: {},
    });
  });

  it('returns null for unrecognized text', () => {
    expect(parseTextToAIAction('xyz random', emptyDebts)).toBeNull();
  });
});

describe('getMessageForActionResult', () => {
  it('returns error message when result.success is false', () => {
    const action: AIAction = { type: 'add_debt', params: { name: 'Test' } };
    const result = { success: false, error: 'Debt name required' };
    expect(getMessageForActionResult(action, result, 'es')).toBe('Error: Debt name required');
    expect(getMessageForActionResult(action, result, 'en')).toBe('Error: Debt name required');
  });

  it('returns navigate message for navigate action', () => {
    const action: AIAction = { type: 'navigate', params: { route: '/dashboard' } };
    const result = { success: true };
    expect(getMessageForActionResult(action, result, 'es')).toContain('Navegando');
    expect(getMessageForActionResult(action, result, 'en')).toContain('Navigating');
  });

  it('returns toggle message for toggle_hide_amounts', () => {
    const action: AIAction = { type: 'toggle_hide_amounts' };
    const result = { success: true };
    expect(getMessageForActionResult(action, result, 'es')).toMatch(/Montos|ocultos|mostrados/);
    expect(getMessageForActionResult(action, result, 'en')).toMatch(/Amounts|hidden|shown/);
  });

  it('returns delete_all message for delete_all_debts', () => {
    const action: AIAction = { type: 'delete_all_debts', params: {} };
    const result = { success: true };
    expect(getMessageForActionResult(action, result, 'es')).toMatch(/eliminaron|deudas/);
  });

  it('returns result.message or Done/Listo for generic success', () => {
    const action: AIAction = { type: 'add_debt', params: { name: 'X' } };
    expect(getMessageForActionResult(action, { success: true, message: 'Debt created' }, 'en')).toBe('Debt created');
    expect(getMessageForActionResult(action, { success: true }, 'es')).toBe('Listo.');
    expect(getMessageForActionResult(action, { success: true }, 'en')).toBe('Done.');
  });

  it('returns result.data.message for reply action (AI analysis)', () => {
    const action: AIAction = { type: 'reply', params: { message: 'Con tu superávit actual saldrías en ~24 meses.' } };
    const result = { success: true, data: { message: 'Con tu superávit actual saldrías en ~24 meses.' } };
    expect(getMessageForActionResult(action, result, 'es')).toBe('Con tu superávit actual saldrías en ~24 meses.');
    expect(getMessageForActionResult(action, { success: true, data: {} }, 'es')).toBe('Listo.');
  });
});

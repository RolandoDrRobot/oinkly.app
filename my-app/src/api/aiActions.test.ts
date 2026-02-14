import { isValidAIIntent, AI_ACTION_TYPES, AI_ACTION_PARAMS } from './aiActions';

describe('aiActions', () => {
  describe('isValidAIIntent', () => {
    it('returns true for all valid action types', () => {
      AI_ACTION_TYPES.forEach((type) => {
        expect(isValidAIIntent(type)).toBe(true);
      });
    });

    it('returns true for add_debt, edit_debt, navigate, get_overview', () => {
      expect(isValidAIIntent('add_debt')).toBe(true);
      expect(isValidAIIntent('edit_debt')).toBe(true);
      expect(isValidAIIntent('navigate')).toBe(true);
      expect(isValidAIIntent('get_overview')).toBe(true);
    });

    it('returns false for invalid or unknown types', () => {
      expect(isValidAIIntent('invalid')).toBe(false);
      expect(isValidAIIntent('')).toBe(false);
      expect(isValidAIIntent('add_debts')).toBe(false);
      expect(isValidAIIntent('navigate_to')).toBe(false);
    });
  });

  describe('AI_ACTION_PARAMS', () => {
    it('add_debt has required name and expected optional params', () => {
      const params = AI_ACTION_PARAMS.add_debt;
      expect(params.required).toContain('name');
      expect(params.optional).toContain('totalLocal');
      expect(params.optional).toContain('paymentDate');
    });

    it('edit_debt has required debtId', () => {
      expect(AI_ACTION_PARAMS.edit_debt.required).toContain('debtId');
    });

    it('navigate has required route', () => {
      expect(AI_ACTION_PARAMS.navigate.required).toContain('route');
    });
  });
});

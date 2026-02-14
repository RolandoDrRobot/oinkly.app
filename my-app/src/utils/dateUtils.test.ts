import {
  formatDateLocal,
  todayLocal,
  parseLocalDate,
  toLocalYYYYMMDD,
} from './dateUtils';

describe('dateUtils', () => {
  describe('formatDateLocal', () => {
    it('formats YYYY-MM-DD as readable local date', () => {
      expect(formatDateLocal('2025-02-14')).toMatch(/2025|Feb|14|feb|14/);
    });

    it('handles ISO string and uses date part only', () => {
      const result = formatDateLocal('2025-01-01T12:00:00.000Z');
      expect(result).toMatch(/2025|Jan|1|ene|1/);
    });

    it('returns empty string for empty or invalid input', () => {
      expect(formatDateLocal('')).toBe('');
      expect(formatDateLocal(null as any)).toBe('');
    });

    it('returns original string when not enough parts', () => {
      expect(formatDateLocal('2025')).toBe('2025');
    });
  });

  describe('todayLocal', () => {
    it('returns string in YYYY-MM-DD format', () => {
      const result = todayLocal();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches local date components', () => {
      const t = new Date();
      const result = todayLocal();
      const [y, m, d] = result.split('-').map(Number);
      expect(y).toBe(t.getFullYear());
      expect(m).toBe(t.getMonth() + 1);
      expect(d).toBe(t.getDate());
    });
  });

  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD as local date (no UTC shift)', () => {
      const d = parseLocalDate('2025-02-14');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2025);
      expect(d!.getMonth()).toBe(1); // February = 1
      expect(d!.getDate()).toBe(14);
    });

    it('returns null for empty or invalid', () => {
      expect(parseLocalDate('')).toBeNull();
      expect(parseLocalDate('invalid')).toBeNull();
    });
  });

  describe('toLocalYYYYMMDD', () => {
    it('normalizes valid date to YYYY-MM-DD', () => {
      expect(toLocalYYYYMMDD('2025-02-14')).toBe('2025-02-14');
      expect(toLocalYYYYMMDD('2025-01-01T00:00:00Z')).toBe('2025-01-01');
    });

    it('returns empty string for invalid input', () => {
      expect(toLocalYYYYMMDD('')).toBe('');
      expect(toLocalYYYYMMDD('x')).toBe('');
    });
  });
});

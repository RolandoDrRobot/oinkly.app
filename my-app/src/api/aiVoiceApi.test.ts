/**
 * Tests for OpenAI voice API layer. fetch and storage are mocked; no real API calls.
 */

const mockGetOpenAIApiKey = jest.fn();
jest.mock('../utils/storage', () => ({
  storage: {
    getOpenAIApiKey: () => mockGetOpenAIApiKey(),
  },
}));

import {
  interpretWithAI,
  isAIVoiceEnabled,
  getLastAIVoiceError,
} from './aiVoiceApi';

let fetchMock: jest.Mock;
const envKeys = ['REACT_APP_OPENAI_API_KEY', 'REACT_APP_AI_VOICE_API_KEY'] as const;

let consoleWarnSpy: jest.SpyInstance;
beforeAll(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  consoleWarnSpy?.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOpenAIApiKey.mockReturnValue('sk-test-key');
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  envKeys.forEach((k) => {
    delete process.env[k];
  });
});

afterEach(() => {
  envKeys.forEach((k) => {
    delete process.env[k];
  });
});

const baseContext = { lang: 'es' as const, debts: [] };

describe('aiVoiceApi', () => {
  describe('interpretWithAI', () => {
    it('returns null when API key is empty', async () => {
      mockGetOpenAIApiKey.mockReturnValue('');
      const result = await interpretWithAI('dame mi resumen', baseContext);
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null when text is empty', async () => {
      const result = await interpretWithAI('  ', baseContext);
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns action when API returns 200 with valid JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '{"type":"get_overview","params":{}}' } }],
          }),
      });
      const result = await interpretWithAI('dame mi resumen', baseContext);
      expect(result).toEqual({ type: 'get_overview', params: {} });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );
    });

    it('returns null and sets last error to quota when API returns 429', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      });
      const result = await interpretWithAI('resumen', baseContext);
      expect(result).toBeNull();
      expect(getLastAIVoiceError()).toBe('quota');
    });

    it('returns null and sets last error to model_not_found when API returns 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Model not found'),
      });
      const result = await interpretWithAI('resumen', baseContext);
      expect(result).toBeNull();
      expect(getLastAIVoiceError()).toBe('model_not_found');
    });

    it('sets last error to quota when response body has insufficient_quota', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: () =>
          Promise.resolve(JSON.stringify({ error: { code: 'insufficient_quota' } })),
      });
      const result = await interpretWithAI('resumen', baseContext);
      expect(result).toBeNull();
      expect(getLastAIVoiceError()).toBe('quota');
    });

    it('returns add_debt action when API returns valid add_debt JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content:
                    '{"type":"add_debt","params":{"name":"BBVA","type":"tarjeta","bankName":"BBVA"}}',
                },
              },
            ],
          }),
      });
      const result = await interpretWithAI('tengo una deuda con BBVA tarjeta', baseContext);
      expect(result).toEqual({
        type: 'add_debt',
        params: { name: 'BBVA', type: 'tarjeta', bankName: 'BBVA' },
      });
    });
  });

  describe('isAIVoiceEnabled', () => {
    it('returns true when API key is set', () => {
      mockGetOpenAIApiKey.mockReturnValue('sk-xxx');
      expect(isAIVoiceEnabled()).toBe(true);
    });

    it('returns false when API key is empty', () => {
      mockGetOpenAIApiKey.mockReturnValue('');
      expect(isAIVoiceEnabled()).toBe(false);
    });
  });

  describe('getLastAIVoiceError', () => {
    it('returns null after successful call', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '{"type":"get_overview","params":{}}' } }],
          }),
      });
      await interpretWithAI('resumen', baseContext);
      expect(getLastAIVoiceError()).toBeNull();
    });
  });
});

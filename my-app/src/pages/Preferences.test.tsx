/**
 * UI tests for Preferences page: settings render and update as expected.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Preferences from './Preferences';

// Mock react-router-dom (only useNavigate; MemoryRouter we use for real)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock storage so we control initial currency/language and can assert on setters
const mockGetLocalCurrency = jest.fn();
const mockGetLanguage = jest.fn();
const mockSetLocalCurrency = jest.fn();
const mockSetLanguage = jest.fn();
const mockSetOpenAIApiKey = jest.fn();
jest.mock('../utils/storage', () => ({
  storage: {
    getLocalCurrency: () => mockGetLocalCurrency(),
    getLanguage: () => mockGetLanguage(),
    setLocalCurrency: (c: string) => mockSetLocalCurrency(c),
    setLanguage: (l: string) => mockSetLanguage(l),
    setOpenAIApiKey: (k: string) => mockSetOpenAIApiKey(k),
  },
}));

jest.mock('../api/aiVoiceApi', () => ({
  isAIVoiceEnabled: jest.fn(() => false),
}));

// Mock framer-motion so we get plain DOM (no animation delays; strip motion-only props)
const domOnly = (props: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, transition, ...rest } = props;
  return rest;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...domOnly(props)}>{children}</div>,
    header: ({ children, className, ...props }: any) => <header className={className} {...domOnly(props)}>{children}</header>,
    button: ({ children, className, onClick, ...props }: any) => (
      <button type="button" className={className} onClick={onClick} {...domOnly(props)}>{children}</button>
    ),
    span: ({ children, ...props }: any) => <span {...domOnly(props)}>{children}</span>,
  },
}));

// Mock i18n: return predictable text so we can assert on UI
const mockChangeLanguage = jest.fn();
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'preferences.title': 'Preferences',
        'preferences.goToDashboard': 'Go to Dashboard',
        'common.back': 'Back',
        'preferences.language': 'Language',
        'preferences.english': 'English',
        'preferences.spanish': 'Spanish',
        'preferences.localCurrency': 'Local Currency',
        'preferences.voiceAiSection': 'Voice assistant (ChatGPT)',
        'preferences.voiceAiDescription': 'Voice description text',
        'preferences.openAIApiKeyPlaceholder': 'sk-... (optional)',
        'preferences.openAIApiKey': 'OpenAI API key',
        'preferences.openAIApiKeySaved': 'API key saved',
        'preferences.openAIApiKeyRemoved': 'API key removed',
        'preferences.getKeyAt': 'Get your key at platform.openai.com',
        'common.save': 'Save',
      };
      return map[key] ?? key;
    },
    i18n: { changeLanguage: mockChangeLanguage },
  }),
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderPreferences() {
  return render(
    <MemoryRouter future={routerFuture}>
      <Preferences />
    </MemoryRouter>
  );
}

describe('Preferences (Settings) UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalCurrency.mockReturnValue('USD');
    mockGetLanguage.mockReturnValue('en');
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => (key === 'hasSeenInitialSetup' ? '1' : null)),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(() => null),
        length: 0,
      },
      writable: true,
      configurable: true,
    });
  });

  describe('initial render', () => {
    it('renders page title Preferences', () => {
      renderPreferences();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Preferences');
    });

    it('renders Back button when user has seen setup', () => {
      renderPreferences();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('renders Language section with English and Spanish options', () => {
      renderPreferences();
      expect(screen.getByRole('heading', { name: /language/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /spanish/i })).toBeInTheDocument();
    });

    it('renders Local Currency section and currency grid', () => {
      renderPreferences();
      expect(screen.getByRole('heading', { name: /local currency/i })).toBeInTheDocument();
      expect(screen.getByText('CRC')).toBeInTheDocument();
      expect(screen.getByText('MXN')).toBeInTheDocument();
      expect(screen.getByText('Colón Costarricense')).toBeInTheDocument();
      expect(screen.getByText('Peso Mexicano')).toBeInTheDocument();
    });

    it('renders Voice assistant section with input and Save button', () => {
      renderPreferences();
      expect(screen.getByRole('heading', { name: /voice assistant/i })).toBeInTheDocument();
      const input = screen.getByLabelText(/openai api key/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('language setting', () => {
    it('marks English as active when language is en', () => {
      mockGetLanguage.mockReturnValue('en');
      renderPreferences();
      const englishBtn = screen.getByRole('button', { name: /english/i });
      const spanishBtn = screen.getByRole('button', { name: /spanish/i });
      expect(englishBtn).toHaveClass('active');
      expect(spanishBtn).not.toHaveClass('active');
    });

    it('marks Spanish as active when language is es', () => {
      mockGetLanguage.mockReturnValue('es');
      renderPreferences();
      const englishBtn = screen.getByRole('button', { name: /english/i });
      const spanishBtn = screen.getByRole('button', { name: /spanish/i });
      expect(spanishBtn).toHaveClass('active');
      expect(englishBtn).not.toHaveClass('active');
    });

    it('calls storage.setLanguage and i18n.changeLanguage when clicking Spanish', async () => {
      const user = userEvent.setup();
      renderPreferences();
      await user.click(screen.getByRole('button', { name: /spanish/i }));
      expect(mockSetLanguage).toHaveBeenCalledWith('es');
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    });

    it('calls storage.setLanguage and i18n.changeLanguage when clicking English', async () => {
      mockGetLanguage.mockReturnValue('es');
      const user = userEvent.setup();
      renderPreferences();
      await user.click(screen.getByRole('button', { name: /english/i }));
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('currency setting', () => {
    it('shows MXN as selected when localCurrency is MXN', () => {
      mockGetLocalCurrency.mockReturnValue('MXN');
      renderPreferences();
      const activeButtons = document.querySelectorAll('.currency-button.active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0]).toHaveTextContent('MXN');
    });

    it('shows CRC as selected when localCurrency is CRC', () => {
      mockGetLocalCurrency.mockReturnValue('CRC');
      renderPreferences();
      const activeButtons = document.querySelectorAll('.currency-button.active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0]).toHaveTextContent('CRC');
    });

    it('calls storage.setLocalCurrency when clicking a currency', async () => {
      const user = userEvent.setup();
      renderPreferences();
      await user.click(screen.getByText('Costa Rica').closest('button')!);
      expect(mockSetLocalCurrency).toHaveBeenCalledWith('CRC');
    });
  });

  describe('OpenAI API key', () => {
    it('calls storage.setOpenAIApiKey when typing and clicking Save', async () => {
      const user = userEvent.setup();
      renderPreferences();
      const input = screen.getByLabelText(/openai api key/i);
      await user.type(input, 'sk-test123');
      await user.click(screen.getByRole('button', { name: /save/i }));
      expect(mockSetOpenAIApiKey).toHaveBeenCalledWith('sk-test123');
    });
  });
});

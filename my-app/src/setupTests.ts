/**
 * Jest setup (CRA runs this before each test file).
 * Optional: mock localStorage, matchMedia, etc.
 */
import '@testing-library/jest-dom';

// Mock localStorage with a real backing store so tests can assert on stored values.
const storageBacking: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: jest.fn((key: string) => storageBacking[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    storageBacking[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete storageBacking[key];
  }),
  clear: jest.fn(() => {
    Object.keys(storageBacking).forEach((k) => delete storageBacking[k]);
  }),
  key: jest.fn(() => null),
  length: 0,
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
// Expose backing store so tests (e.g. storage.test) can seed or assert on it.
(window as unknown as { __storageBacking?: Record<string, string> }).__storageBacking = storageBacking;

// Mock window.matchMedia (usado por algunos componentes/theme)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Reset mocks between tests (implementation is kept; only call history is cleared)
beforeEach(() => {
  (localStorageMock.getItem as jest.Mock).mockClear();
  (localStorageMock.setItem as jest.Mock).mockClear();
  (localStorageMock.removeItem as jest.Mock).mockClear();
  (localStorageMock.clear as jest.Mock).mockClear();
  Object.keys(storageBacking).forEach((k) => delete storageBacking[k]);
});

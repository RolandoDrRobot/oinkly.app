/**
 * Dashboard UI tests: empty lists, tabs, and navigation to add routes.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGetDebts = jest.fn(() => []);
const mockGetFixedExpenses = jest.fn(() => []);
const mockGetAssets = jest.fn(() => []);
const mockGetIncomes = jest.fn(() => []);
const mockGetDebtsOrder = jest.fn(() => [] as string[]);
const mockGetFixedExpensesOrder = jest.fn(() => [] as string[]);
const mockGetAssetsOrder = jest.fn(() => [] as string[]);
const mockGetIncomesOrder = jest.fn(() => [] as string[]);
const mockGetLocalCurrency = jest.fn(() => 'MXN');
const mockGetUnreadNotificationsCount = jest.fn(() => 0);
jest.mock('../utils/storage', () => ({
  storage: {
    getDebts: () => mockGetDebts(),
    getFixedExpenses: () => mockGetFixedExpenses(),
    getAssets: () => mockGetAssets(),
    getIncomes: () => mockGetIncomes(),
    getDebtsOrder: () => mockGetDebtsOrder(),
    getFixedExpensesOrder: () => mockGetFixedExpensesOrder(),
    getAssetsOrder: () => mockGetAssetsOrder(),
    getIncomesOrder: () => mockGetIncomesOrder(),
    getLocalCurrency: () => mockGetLocalCurrency(),
    getUnreadNotificationsCount: () => mockGetUnreadNotificationsCount(),
    saveDebt: jest.fn(),
    setDebtsOrder: jest.fn(),
    setFixedExpensesOrder: jest.fn(),
    setAssetsOrder: jest.fn(),
    setIncomesOrder: jest.fn(),
  },
}));

jest.mock('../utils/notifications', () => ({
  notify: {
    debtStatusChanged: jest.fn(),
    saveAndToast: jest.fn(),
    overviewUpdated: jest.fn(),
  },
  ensureReminders: jest.fn(),
  ensureFixedExpenseReminders: jest.fn(),
}));

jest.mock('../utils/dateUtils', () => ({
  formatDateLocal: (d: string) => d || '',
}));

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
}));

jest.mock('../api', () => ({
  executeAIAction: jest.fn(),
  parseTextToAIAction: jest.fn(),
  getMessageForActionResult: jest.fn(),
  interpretWithAI: jest.fn(),
  isAIVoiceEnabled: () => false,
  getLastAIVoiceError: () => null,
  getSummaryText: jest.fn(() => ''),
}));

const domOnly = (p: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, exit, transition, style, ...rest } = p;
  return rest;
};
const createMotion = (Tag: string) => {
  const C = (props: any) => {
    const clean = domOnly(props);
    const { children, ...attr } = clean;
    return React.createElement(Tag, attr, children as React.ReactNode);
  };
  C.displayName = `motion.${Tag}`;
  return C;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: createMotion('div'),
    button: createMotion('button'),
    span: createMotion('span'),
    p: createMotion('p'),
    img: createMotion('img'),
    header: createMotion('header'),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(() => null),
  useSensors: jest.fn(() => []),
}));
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  sortableKeyboardCoordinates: jest.fn(),
  arrayMove: jest.fn((arr: unknown[], a: number, b: number) => {
    const copy = [...arr];
    const [removed] = copy.splice(a, 1);
    copy.splice(b, 0, removed);
    return copy;
  }),
}));

jest.mock('../components/SortableDebtCard', () => {
  return function MockSortableDebtCard({ children, debt }: any) {
    return <div data-testid="debt-card">{debt?.name}{children && typeof children === 'function' ? children({}) : children}</div>;
  };
});
jest.mock('../components/SortableItemCard', () => {
  return function MockSortableItemCard({ children }: any) {
    return <div data-testid="item-card">{children && typeof children === 'function' ? children({}) : children}</div>;
  };
});
jest.mock('../components/Tour', () => () => null);
jest.mock('../components/NotificationsSidebar', () => () => null);

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderDashboard() {
  return render(
    <MemoryRouter future={routerFuture}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDebts.mockReturnValue([]);
    mockGetFixedExpenses.mockReturnValue([]);
    mockGetAssets.mockReturnValue([]);
    mockGetIncomes.mockReturnValue([]);
    mockGetDebtsOrder.mockReturnValue([]);
    mockGetFixedExpensesOrder.mockReturnValue([]);
    mockGetAssetsOrder.mockReturnValue([]);
    mockGetIncomesOrder.mockReturnValue([]);
  });

  it('shows four tabs (debt, fixedExpenses, assets, incomes)', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'dashboard.debt' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'dashboard.fixedExpenses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dashboard.assets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'dashboard.incomes' })).toBeInTheDocument();
  });

  it('shows empty state for debts when no debts', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('dashboard.noDebts')).toBeInTheDocument();
    });
  });

  it('switching to fixedExpenses tab shows empty state for fixed expenses', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('dashboard.noDebts')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'dashboard.fixedExpenses' }));
    await waitFor(() => {
      expect(screen.getByText('dashboard.noFixedExpenses')).toBeInTheDocument();
    });
  });

});

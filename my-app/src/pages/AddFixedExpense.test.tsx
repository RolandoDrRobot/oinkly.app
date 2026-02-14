/**
 * UI tests for Add Fixed Expense flow: render steps and creation saves + navigates.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddFixedExpense from './AddFixedExpense';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSaveFixedExpense = jest.fn();
const mockGetLocalCurrency = jest.fn(() => 'MXN');
jest.mock('../utils/storage', () => ({
  storage: {
    getLocalCurrency: () => mockGetLocalCurrency(),
    saveFixedExpense: (data: unknown) => mockSaveFixedExpense(data),
  },
}));

jest.mock('../utils/notifications', () => ({
  notify: { overviewUpdated: jest.fn() },
}));

jest.mock('../utils/currencyFormatter', () => ({
  formatCurrencyInput: (v: number) => (v ? `MXN ${v}` : ''),
  getCurrencyForField: (id: string, local: string) => (id === 'amountDollars' ? 'USD' : local),
  formatNumberWithSeparators: (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
}));

const domOnly = (p: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, exit, transition, ...rest } = p;
  return rest;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...domOnly(props)}>{children}</div>,
    button: ({ children, className, onClick, type, disabled, ...props }: any) => (
      <button type={type || 'button'} className={className} onClick={onClick} disabled={disabled} {...domOnly(props)}>{children}</button>
    ),
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...domOnly(props)}>{children}</h1>,
    p: ({ children, className, ...props }: any) => <p className={className} {...domOnly(props)}>{children}</p>,
    input: (props: any) => <input {...domOnly(props)} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderAddFixedExpense() {
  return render(
    <MemoryRouter future={routerFuture}>
      <AddFixedExpense />
    </MemoryRouter>
  );
}

describe('AddFixedExpense creation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalCurrency.mockReturnValue('MXN');
  });

  it('renders welcome step with title', () => {
    renderAddFixedExpense();
    expect(screen.getByText('addFixedExpense.title')).toBeInTheDocument();
  });

  it('Next from welcome shows expense name step', async () => {
    const user = userEvent.setup();
    renderAddFixedExpense();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    expect(screen.getByText('addFixedExpense.expenseName')).toBeInTheDocument();
  });

  it('Back from name step returns to welcome', async () => {
    const user = userEvent.setup();
    renderAddFixedExpense();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const stepBack = screen.getAllByRole('button', { name: /common.back/i })[1];
    await user.click(stepBack);
    expect(screen.getByText('addFixedExpense.title')).toBeInTheDocument();
  });

  it('full flow: fill steps and complete saves expense and navigates to dashboard', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAddFixedExpense();

    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const nameInput = screen.getByPlaceholderText(/addFixedExpense.expenseNamePlaceholder/i);
    await user.type(nameInput, 'Rent');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const amountInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(amountInput);
    await user.type(amountInput, '5000');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const dollarInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(dollarInput);
    await user.type(dollarInput, '0');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByText(/addFixedExpense.catHousing/i));

    await user.click(screen.getByRole('button', { name: /common.skip/i }));
    await user.click(screen.getByRole('button', { name: /common.skip/i }));

    expect(screen.getByText('common.allDone')).toBeInTheDocument();

    jest.advanceTimersByTime(1600);

    expect(mockSaveFixedExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rent',
        amountLocal: 5000,
        amountDollars: 0,
        category: 'housing',
      })
    );
    expect(mockSaveFixedExpense.mock.calls[0][0].localCurrency).toBeDefined();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

    jest.useRealTimers();
  });
});

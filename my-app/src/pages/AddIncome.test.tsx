/**
 * UI tests for Add Income flow: render steps and creation saves + navigates.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddIncome from './AddIncome';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSaveIncome = jest.fn();
const mockGetLocalCurrency = jest.fn(() => 'MXN');
jest.mock('../utils/storage', () => ({
  storage: {
    getLocalCurrency: () => mockGetLocalCurrency(),
    saveIncome: (data: unknown) => mockSaveIncome(data),
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
  useTranslation: () => ({ t: (key: string) => key }),
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderAddIncome() {
  return render(
    <MemoryRouter future={routerFuture}>
      <AddIncome />
    </MemoryRouter>
  );
}

describe('AddIncome creation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalCurrency.mockReturnValue('MXN');
  });

  it('renders welcome step with title', () => {
    renderAddIncome();
    expect(screen.getByText('addIncome.title')).toBeInTheDocument();
  });

  it('Next from welcome shows income name step', async () => {
    const user = userEvent.setup();
    renderAddIncome();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    expect(screen.getByText('addIncome.incomeName')).toBeInTheDocument();
  });

  it('Back from name step returns to welcome', async () => {
    const user = userEvent.setup();
    renderAddIncome();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const stepBack = screen.getAllByRole('button', { name: /common.back/i })[1];
    await user.click(stepBack);
    expect(screen.getByText('addIncome.title')).toBeInTheDocument();
  });

  it('full flow: fill steps and complete saves income and navigates to dashboard', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAddIncome();

    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const nameInput = screen.getByPlaceholderText(/addIncome.incomeNamePlaceholder/i);
    await user.type(nameInput, 'Salary');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByText(/dashboard.salary/i));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await user.click(screen.getByText(/dashboard.monthly/i));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    const amountInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(amountInput);
    await user.type(amountInput, '3000');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const dollarInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(dollarInput);
    await user.type(dollarInput, '0');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByRole('button', { name: /common.skip/i }));
    await user.click(screen.getByRole('button', { name: /common.skip/i }));

    expect(screen.getByText('common.allDone')).toBeInTheDocument();
    jest.advanceTimersByTime(1600);

    expect(mockSaveIncome).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Salary',
        type: 'salary',
        frequency: 'monthly',
        amountLocal: 3000,
        amountDollars: 0,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    jest.useRealTimers();
  });
});

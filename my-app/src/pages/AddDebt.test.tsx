/**
 * UI tests for Add Debt flow: render steps and creation saves + navigates.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddDebt from './AddDebt';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSaveDebt = jest.fn();
const mockGetLocalCurrency = jest.fn(() => 'MXN');
jest.mock('../utils/storage', () => ({
  storage: {
    getLocalCurrency: () => mockGetLocalCurrency(),
    saveDebt: (data: unknown) => mockSaveDebt(data),
  },
}));

jest.mock('../utils/notifications', () => ({
  notify: { overviewUpdated: jest.fn() },
}));

jest.mock('../utils/currencyFormatter', () => ({
  formatCurrencyInput: (v: number) => (v ? `MXN ${v}` : ''),
  getCurrencyForField: (id: string, local: string) =>
    (id === 'dollarFee' || id === 'totalDollars' ? 'USD' : local),
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

function renderAddDebt() {
  return render(
    <MemoryRouter future={routerFuture}>
      <AddDebt />
    </MemoryRouter>
  );
}

describe('AddDebt creation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalCurrency.mockReturnValue('MXN');
  });

  it('renders welcome step with title', () => {
    renderAddDebt();
    expect(screen.getByText('addDebt.title')).toBeInTheDocument();
  });

  it('Next from welcome shows debt name step', async () => {
    const user = userEvent.setup();
    renderAddDebt();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    expect(screen.getByText('addDebt.debtName')).toBeInTheDocument();
  });

  it('Back from name step returns to welcome', async () => {
    const user = userEvent.setup();
    renderAddDebt();
    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const stepBack = screen.getAllByRole('button', { name: /common.back/i })[1];
    await user.click(stepBack);
    expect(screen.getByText('addDebt.title')).toBeInTheDocument();
  });

  it('full flow: fill steps and complete saves debt and navigates to dashboard', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderAddDebt();

    await user.click(screen.getByRole('button', { name: /common.next/i }));
    const nameInput = screen.getByPlaceholderText(/addDebt.debtNamePlaceholder/i);
    await user.type(nameInput, 'Bank Loan');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByText(/addDebt.loan/i));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    const bankInput = screen.getByPlaceholderText(/addDebt.bankNamePlaceholder/i);
    await user.type(bankInput, 'BBVA');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByRole('button', { name: /common.skip/i }));

    const localFeeInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(localFeeInput);
    await user.type(localFeeInput, '500');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const dollarFeeInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(dollarFeeInput);
    await user.type(dollarFeeInput, '0');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const totalLocalInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(totalLocalInput);
    await user.type(totalLocalInput, '10000');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const totalDollarInput = screen.getByPlaceholderText(/common.amountPlaceholder/i);
    await user.clear(totalDollarInput);
    await user.type(totalDollarInput, '0');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    const planInput = screen.getByPlaceholderText(/addDebt.paymentPlanPlaceholder/i);
    await user.type(planInput, '24 months');
    await user.click(screen.getByRole('button', { name: /common.next/i }));

    await user.click(screen.getByRole('button', { name: /common.skip/i }));
    await user.click(screen.getByRole('button', { name: /common.skip/i }));

    await user.click(screen.getByRole('button', { name: /common.no/i }));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByText('common.allDone')).toBeInTheDocument();
    jest.advanceTimersByTime(1600);

    expect(mockSaveDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bank Loan',
        type: 'prestamo',
        bankName: 'BBVA',
        localFee: 500,
        dollarFee: 0,
        totalLocal: 10000,
        totalDollars: 0,
        currentPlan: '24 months',
        hasCallTask: false,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    jest.useRealTimers();
  });
});

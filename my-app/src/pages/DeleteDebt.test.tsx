/**
 * DeleteDebt: confirm step, then deleteDebt and navigate to dashboard.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DeleteDebt from './DeleteDebt';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockDebt = {
  id: 'd1',
  name: 'BBVA Card',
  type: 'tarjeta' as const,
  localCurrency: 'MXN',
  localFee: 5000,
  dollarFee: 0,
  totalLocal: 10000,
  totalDollars: 0,
  commitments: [],
  callHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGetDebt = jest.fn();
const mockDeleteDebt = jest.fn();
const mockGetDebtsOrder = jest.fn(() => []);
const mockSetDebtsOrder = jest.fn();
jest.mock('../utils/storage', () => ({
  storage: {
    getDebt: (id: string) => mockGetDebt(id),
    deleteDebt: (id: string) => mockDeleteDebt(id),
    getDebtsOrder: () => mockGetDebtsOrder(),
    setDebtsOrder: (order: string[]) => mockSetDebtsOrder(order),
  },
}));

jest.mock('../utils/notifications', () => ({
  notify: { overviewUpdated: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const domOnly = (p: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, exit, transition, ...rest } = p;
  return rest;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...domOnly(props)}>{props.children}</div>,
    h1: (props: any) => <h1 {...domOnly(props)}>{props.children}</h1>,
    p: (props: any) => <p {...domOnly(props)}>{props.children}</p>,
    button: (props: any) => <button type="button" {...domOnly(props)}>{props.children}</button>,
  },
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderDeleteDebt(debtId = 'd1') {
  return render(
    <MemoryRouter initialEntries={[`/delete-debt/${debtId}`]} future={routerFuture}>
      <Routes>
        <Route path="/delete-debt/:debtId" element={<DeleteDebt />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DeleteDebt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDebt.mockReturnValue(mockDebt);
    mockGetDebtsOrder.mockReturnValue(['d1']);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows confirm step with title and delete button', () => {
    renderDeleteDebt();
    expect(screen.getByText('deleteDebt.title')).toBeInTheDocument();
    expect(screen.getByText('common.delete')).toBeInTheDocument();
  });

  it('confirm triggers deleteDebt and navigate after delay', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderDeleteDebt();
    const confirmBtn = screen.getByText('common.delete');
    await user.click(confirmBtn);
    jest.advanceTimersByTime(1600);
    expect(mockDeleteDebt).toHaveBeenCalledWith('d1');
    expect(mockSetDebtsOrder).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

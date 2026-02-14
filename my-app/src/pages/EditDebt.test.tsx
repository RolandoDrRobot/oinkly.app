/**
 * EditDebt: form shows debt data, save calls storage.saveDebt and navigate.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EditDebt from './EditDebt';

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
const mockSaveDebt = jest.fn();
const mockGetLocalCurrency = jest.fn(() => 'MXN');
jest.mock('../utils/storage', () => ({
  storage: {
    getDebt: (id: string) => mockGetDebt(id),
    saveDebt: (d: unknown) => mockSaveDebt(d),
    getLocalCurrency: () => mockGetLocalCurrency(),
  },
}));

jest.mock('../utils/notifications', () => ({
  notify: { overviewUpdated: jest.fn() },
}));

jest.mock('../utils/currencyFormatter', () => ({
  formatCurrencyInput: (v: number, _c: string) => (v ? `${v}` : ''),
  getCurrencyForField: () => 'MXN',
  formatNumberWithSeparators: (s: string) => s,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const domOnly = (p: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, transition, ...rest } = p;
  return rest;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...domOnly(props)}>{props.children}</div>,
    header: (props: any) => <header {...domOnly(props)}>{props.children}</header>,
    button: (props: any) => <button type="button" {...domOnly(props)}>{props.children}</button>,
    form: (props: any) => <form {...domOnly(props)}>{props.children}</form>,
  },
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderEditDebt(debtId = 'd1') {
  return render(
    <MemoryRouter initialEntries={[`/edit-debt/${debtId}`]} future={routerFuture}>
      <Routes>
        <Route path="/edit-debt/:id" element={<EditDebt />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EditDebt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDebt.mockReturnValue(mockDebt);
  });

  it('renders form with debt name', async () => {
    renderEditDebt();
    await screen.findByDisplayValue('BBVA Card');
    expect(screen.getByText('editDebt.title')).toBeInTheDocument();
  });

  it('save button calls saveDebt and navigate to dashboard', async () => {
    const user = userEvent.setup();
    renderEditDebt();
    await screen.findByDisplayValue('BBVA Card');
    await user.click(screen.getByText('common.save'));
    expect(mockSaveDebt).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

/**
 * Landing UI tests: last step shows Sign in with Google; button calls loginWithGoogle.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = jest.fn();
const mockLoginWithGoogle = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: jest.fn() } }),
}));

jest.mock('../utils/storage', () => ({
  storage: { getLanguage: () => 'es', setLanguage: jest.fn() },
}));

jest.mock('react-hot-toast', () => ({ default: { error: jest.fn() } }));

const domOnly = (p: Record<string, unknown>) => {
  const { whileHover, whileTap, initial, animate, exit, transition, ...rest } = p;
  return rest;
};
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...domOnly(props)}>{children}</div>,
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button type="button" className={className} onClick={onClick} disabled={disabled} {...domOnly(props)}>{children}</button>
    ),
    header: (props: any) => <header {...domOnly(props)}>{props.children}</header>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderLanding() {
  return render(
    <MemoryRouter future={routerFuture}>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Sign in with Google on last step', async () => {
    const user = userEvent.setup();
    renderLanding();
    // Go to last step (5 steps: 0..4, so click Next 4 times)
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText('common.next'));
    }
    expect(screen.getByText('landing.signInWithGoogle')).toBeInTheDocument();
  });

  it('Sign in with Google button calls loginWithGoogle', async () => {
    const user = userEvent.setup();
    renderLanding();
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText('common.next'));
    }
    await user.click(screen.getByText('landing.signInWithGoogle'));
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });
});

/**
 * Profile UI tests: user name/email, action links, logout.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUser = { id: 'u1', email: 'user@test.com', name: 'Test User' };
const mockLogout = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false }),
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
    div: ({ children, className, ...props }: any) => <div className={className} {...domOnly(props)}>{children}</div>,
    header: (props: any) => <header {...domOnly(props)}>{props.children}</header>,
    button: ({ children, className, onClick, type, ...props }: any) => (
      <button type={type || 'button'} className={className} onClick={onClick} {...domOnly(props)}>{children}</button>
    ),
    section: (props: any) => <section {...domOnly(props)}>{props.children}</section>,
  },
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

beforeAll(() => {
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
});

function renderProfile() {
  return render(
    <MemoryRouter future={routerFuture}>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('shows user name and email', () => {
    renderProfile();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
  });

  it('shows preferences and other action links', () => {
    renderProfile();
    expect(screen.getByText('profile.preferences')).toBeInTheDocument();
    expect(screen.getByText('profile.preferences')).toBeInTheDocument();
    expect(screen.getByText('profile.logout')).toBeInTheDocument();
  });

  it('logout button calls logout and navigates to /', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByText('profile.logout'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('preferences link navigates to /preferences', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(screen.getByText('profile.preferences'));
    expect(mockNavigate).toHaveBeenCalledWith('/preferences');
  });
});

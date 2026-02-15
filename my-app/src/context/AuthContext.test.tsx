/**
 * AuthContext tests with mocked Supabase, storage and hydrateFromSupabase.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockMapSupabaseUser = jest.fn();
const mockIsSupabaseConfigured = jest.fn(() => true);

jest.mock('../lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured();
  },
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      signOut: () => mockSignOut(),
      signInWithOAuth: (opts: unknown) => mockSignInWithOAuth(opts),
    },
  },
  mapSupabaseUser: (user: unknown) => mockMapSupabaseUser(user),
}));

const mockSetUser = jest.fn();
const mockLogout = jest.fn();
const mockHydrateToLocalStorage = jest.fn();
jest.mock('../utils/storage', () => ({
  storage: {
    setUser: (u: unknown) => mockSetUser(u),
    logout: () => mockLogout(),
    hydrateToLocalStorage: (data: unknown, userId: string) =>
      mockHydrateToLocalStorage(data, userId),
  },
}));

const mockHydrateFromSupabase = jest.fn();
const mockSetSubscription = jest.fn().mockResolvedValue(undefined);
const mockSetUserPreferences = jest.fn().mockResolvedValue(undefined);
jest.mock('../lib/supabaseData', () => ({
  hydrateFromSupabase: (userId: string) => mockHydrateFromSupabase(userId),
  setSubscription: (...args: unknown[]) => mockSetSubscription(...args),
  setUserPreferences: (...args: unknown[]) => mockSetUserPreferences(...args),
}));

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-name">{auth.user?.name ?? ''}</span>
      <span data-testid="user-email">{auth.user?.email ?? ''}</span>
      <button type="button" onClick={() => auth.login('a@b.com', 'Test User')}>
        Login
      </button>
      <button type="button" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
}

let consoleInfoSpy: jest.SpyInstance;
beforeAll(() => {
  consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterAll(() => {
  consoleInfoSpy?.mockRestore();
});

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockHydrateFromSupabase.mockResolvedValue({
      debts: [],
      fixedExpenses: [],
      assets: [],
      incomes: [],
      notifications: [],
      subscription: { plan: 'free' },
      debtsOrder: [],
      fixedExpensesOrder: [],
      assetsOrder: [],
      incomesOrder: [],
    });
  });

  it('useAuth throws when outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });

  it('when getSession returns no session, loading becomes false and user is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-name')).toHaveTextContent('');
  });

  it('when getSession returns a session, maps user and calls hydrateFromSupabase + hydrateToLocalStorage', async () => {
    const mappedUser = { id: 'uid-1', email: 'u@test.com', name: 'Test User' };
    mockMapSupabaseUser.mockReturnValue(mappedUser);
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'uid-1', email: 'u@test.com', user_metadata: { full_name: 'Test User' } },
        },
      },
      error: null,
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(mockMapSupabaseUser).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(mappedUser);
    expect(mockHydrateFromSupabase).toHaveBeenCalledWith('uid-1');
    await waitFor(() => {
      expect(mockHydrateToLocalStorage).toHaveBeenCalledWith(
        expect.any(Object),
        'uid-1'
      );
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
  });

  it('login() sets user and calls storage.setUser when Supabase is not configured', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        name: 'Test User',
      })
    );
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    mockIsSupabaseConfigured.mockReturnValue(true);
  });

  it('login() is no-op when Supabase is configured', async () => {
    mockIsSupabaseConfigured.mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('logout() calls signOut, storage.logout and clears state', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);
    mockSignOut.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    await user.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    expect(mockLogout).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-name')).toHaveTextContent('');
  });
});

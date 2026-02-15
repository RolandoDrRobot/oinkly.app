/**
 * ProtectedRoute: when not authenticated redirects to /; when authenticated renders children.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = jest.fn();
const mockUseSubscription = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}));

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

function renderWithRouter(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={routerFuture}>
      <Routes>
        <Route path="/" element={<div>Landing</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

let consoleInfoSpy: jest.SpyInstance;
beforeAll(() => {
  consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterAll(() => {
  consoleInfoSpy?.mockRestore();
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscription.mockReturnValue({ isLoading: false });
  });

  it('shows loading screen when loading is true', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: true });
    renderWithRouter();
    expect(document.querySelector('.auth-loading-screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
    expect(screen.queryByText('Landing')).not.toBeInTheDocument();
  });

  it('redirects to / when not authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    renderWithRouter();
    expect(screen.getByText('Landing')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('shows loading when authenticated but subscription still loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseSubscription.mockReturnValue({ isLoading: true });
    renderWithRouter();
    expect(document.querySelector('.auth-loading-screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and subscription loaded', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockUseSubscription.mockReturnValue({ isLoading: false });
    renderWithRouter();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Landing')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Mock the auth context so each test can pin an exact auth state (FR-05).
vi.mock('../context/AuthContext');

const mockedUseAuth = vi.mocked(useAuth);

type AuthValue = ReturnType<typeof useAuth>;

function authValue(overrides: Partial<AuthValue>): AuthValue {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('shows a spinner while the session is being restored', () => {
    mockedUseAuth.mockReturnValue(authValue({ isLoading: true }));
    renderProtected();

    expect(screen.getByText(/restoring session/i)).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: false, isLoading: false }));
    renderProtected();

    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders the protected children when authenticated', () => {
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, isLoading: false, user: {
        id: 'user-1',
        email: 'reviewer@101digital.io',
        fullname: 'Reviewer',
        createdAt: '2026-01-01T00:00:00.000Z',
      } }),
    );
    renderProtected();

    expect(screen.getByText('Secret content')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});

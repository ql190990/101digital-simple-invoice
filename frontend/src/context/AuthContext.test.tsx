import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { getToken, setToken } from '../lib/auth';
import { server } from '../test/mocks/server';

/** Surfaces the auth state so assertions can read it from the DOM. */
function AuthProbe() {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe('AuthProvider session restore (M5)', () => {
  beforeEach(() => localStorage.clear());

  it('restores the session from a stored token via /auth/me', async () => {
    setToken('stored-token');
    renderAuth();

    // A token is present, so the provider starts in the loading state.
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('user')).toHaveTextContent('reviewer@101digital.io');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(getToken()).toBe('stored-token');
  });

  it('clears an invalid stored token when /auth/me returns 401', async () => {
    setToken('expired-token');
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    );
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(getToken()).toBeNull();
  });
});

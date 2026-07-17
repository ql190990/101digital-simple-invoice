import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';
import { renderWithProviders } from '../test/utils';

function LandingProbe() {
  return <div>Invoice list landing</div>;
}

function setup() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LandingProbe />} />
    </Routes>,
    { route: '/login' },
  );
}

describe('LoginPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows client-side validation errors for empty fields', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('validates email format client-side', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('logs in with valid credentials and redirects to the list', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/email/i), 'reviewer@101digital.io');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText(/invoice list landing/i)).toBeInTheDocument());
    expect(localStorage.getItem('simpleinvoice.token')).toBe('test-token');
  });

  it('shows a generic error on invalid credentials', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText(/email/i), 'reviewer@101digital.io');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});

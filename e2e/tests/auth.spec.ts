import { expect, test } from '@playwright/test';
import { CREDENTIALS, login } from '../helpers';

// The auth flow must be exercised from a clean, unauthenticated state — opt out
// of the shared storageState for this file.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('redirects an unauthenticated user from a protected route to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows client-side validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('rejects invalid credentials with a generic error and stays on /login', async ({ page }) => {
    await login(page, CREDENTIALS.email, 'wrong-password');
    await expect(page.getByRole('alert').filter({ hasText: /invalid email or password/i })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logs in with valid credentials and lands on the invoice list', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    await expect(page.getByTestId('invoice-row').first()).toBeVisible();
  });
});

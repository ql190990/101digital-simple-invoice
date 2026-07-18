import { expect, test } from '@playwright/test';
import { ANCHOR, gotoList, login } from '../helpers';

/**
 * Mobile-viewport smoke of the critical flows (FR-20 responsiveness). Runs under
 * the `mobile-chrome` project (Pixel 5 emulation) via testMatch in the config.
 */
test.describe('Responsive (mobile) — login flow', () => {
  // The login flow needs a clean, unauthenticated state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login works on a mobile viewport', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  });
});

test.describe('Responsive (mobile) — authenticated', () => {
  test('list and search work on a mobile viewport', async ({ page }) => {
    await gotoList(page);
    await page.getByLabel(/search/i).fill(ANCHOR.number);
    await expect(page.getByTestId('invoice-row')).toHaveCount(1);
    await expect(page.getByText(ANCHOR.number)).toBeVisible();
  });

  test('create form is usable on a mobile viewport', async ({ page }) => {
    await gotoList(page);
    await page.getByRole('link', { name: /new invoice/i }).click();
    await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible();
    await expect(page.locator('#customerFullname')).toBeVisible();
    await expect(page.getByRole('button', { name: /create invoice/i })).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';
import { ANCHOR, gotoList } from '../helpers';

test.beforeEach(async ({ page }) => {
  await gotoList(page);
});

async function openAnchorDetail(page: import('@playwright/test').Page) {
  await page.getByLabel(/search/i).fill(ANCHOR.number);
  await expect(page.getByTestId('invoice-row')).toHaveCount(1);
  await page.getByTestId('invoice-row').first().click();
  await expect(page.getByRole('heading', { name: ANCHOR.number })).toBeVisible();
}

test.describe('Invoice detail', () => {
  test('shows invoice, customer, line item and totals from the stored record', async ({ page }) => {
    await openAnchorDetail(page);

    // Customer information
    await expect(page.getByText(ANCHOR.customerEmail)).toBeVisible();
    await expect(page.getByText('Singapore')).toBeVisible();

    // Line item
    await expect(page.getByText(ANCHOR.itemName)).toBeVisible();

    // Totals (server-computed, persisted) — tax percent label + outstanding balance
    await expect(page.getByText(/Tax \(10%\)/)).toBeVisible();
    await expect(page.getByTestId('balance')).toContainText(ANCHOR.balance);

    // Derived status badge
    await expect(page.getByText('Overdue')).toBeVisible();
  });

  test('back link returns to the invoice list', async ({ page }) => {
    await openAnchorDetail(page);
    await page.getByRole('link', { name: /back to invoices/i }).click();
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  });

  test('shows a not-found state for a non-existent invoice id', async ({ page }) => {
    await page.goto('/invoices/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/invoice not found/i)).toBeVisible();
  });
});

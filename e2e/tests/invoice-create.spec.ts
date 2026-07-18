import { expect, test } from '@playwright/test';
import { fillInvoiceForm, gotoList, uniqueInvoiceNumber } from '../helpers';

test.beforeEach(async ({ page }) => {
  await gotoList(page);
  await page.getByRole('link', { name: /new invoice/i }).click();
  await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible();
});

test.describe('Create invoice', () => {
  test('validates required fields on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /create invoice/i }).click();
    await expect(page.getByText('Customer name is required')).toBeVisible();
    await expect(page.getByText('Customer email is required')).toBeVisible();
    await expect(page.getByText('Invoice number is required')).toBeVisible();
    await expect(page.getByText('Item name is required')).toBeVisible();
  });

  test('rejects a due date earlier than the invoice date', async ({ page }) => {
    await fillInvoiceForm(page, {
      number: uniqueInvoiceNumber('DATE'),
      invoiceDate: '2026-07-10',
      dueDate: '2026-07-01',
    });
    await page.getByRole('button', { name: /create invoice/i }).click();
    await expect(page.getByText('Due date must be on or after invoice date')).toBeVisible();
  });

  test('creates an invoice, shows a toast, redirects, and it appears in the list', async ({ page }) => {
    const number = uniqueInvoiceNumber('OK');
    await fillInvoiceForm(page, { number, qty: 2, rate: 1000 });
    await page.getByRole('button', { name: /create invoice/i }).click();

    // Success toast + redirect to the list
    await expect(page.getByText(new RegExp(`Invoice ${number} created`))).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

    // It is retrievable via search (server persisted it with server-computed totals).
    // Assert on the row itself — `getByText(number)` would also match the toast.
    await page.getByLabel(/search/i).fill(number);
    await expect(page.getByTestId('invoice-row')).toHaveCount(1);
    await expect(page.getByTestId('invoice-row').first()).toContainText(number);
  });

  test('rejects a duplicate invoice number with a 409 shown to the user', async ({ page }) => {
    const number = uniqueInvoiceNumber('DUP');

    // First create succeeds.
    await fillInvoiceForm(page, { number });
    await page.getByRole('button', { name: /create invoice/i }).click();
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

    // Second create with the same number is rejected.
    await page.getByRole('link', { name: /new invoice/i }).click();
    await expect(page.getByRole('heading', { name: /create invoice/i })).toBeVisible();
    await fillInvoiceForm(page, { number });
    await page.getByRole('button', { name: /create invoice/i }).click();

    await expect(page.getByText(/already exists/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/invoices\/new$/);
  });
});

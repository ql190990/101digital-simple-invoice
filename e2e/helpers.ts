import { expect, type Page } from '@playwright/test';

/** Default seeded reviewer account (README §3). */
export const CREDENTIALS = { email: 'reviewer@101digital.io', password: 'Password123!' };

/** Appendix A anchor invoice — persisted Pending, past due → derives Overdue (ADR A7). */
export const ANCHOR = {
  number: 'IV1780488206995',
  customer: 'Paul',
  customerEmail: 'paul@101digital.io',
  itemName: 'Honda RC150',
  balance: '728.66',
};

/** Fill and submit the login form (no post-conditions asserted). */
export async function login(
  page: Page,
  email = CREDENTIALS.email,
  password = CREDENTIALS.password,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Log in as the reviewer and wait until the invoice list is shown. */
export async function loginAsReviewer(page: Page): Promise<void> {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
}

/**
 * For already-authenticated tests (via storageState): open the list and wait
 * for it to render. Avoids re-logging-in per test (login is rate-limited).
 */
export async function gotoList(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
}

/** A unique invoice number so create tests are re-runnable against a shared DB. */
export function uniqueInvoiceNumber(prefix = 'E2E'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/** Fill the create-invoice form (single line item). Missing fields keep their form defaults. */
export async function fillInvoiceForm(
  page: Page,
  o: {
    number: string;
    customer?: string;
    email?: string;
    invoiceDate?: string;
    dueDate?: string;
    currency?: string;
    item?: string;
    qty?: number;
    rate?: number;
  },
): Promise<void> {
  await page.locator('#customerFullname').fill(o.customer ?? 'E2E Customer');
  await page.locator('#customerEmail').fill(o.email ?? 'e2e@example.com');
  await page.locator('#invoiceNumber').fill(o.number);
  await page.locator('#invoiceDate').fill(o.invoiceDate ?? '2026-06-01');
  await page.locator('#dueDate').fill(o.dueDate ?? '2026-07-01');
  await page.locator('#currency').fill(o.currency ?? 'AUD');
  await page.locator('#itemName').fill(o.item ?? 'Consulting Services');
  await page.locator('#itemQuantity').fill(String(o.qty ?? 2));
  await page.locator('#itemRate').fill(String(o.rate ?? 1000));
}

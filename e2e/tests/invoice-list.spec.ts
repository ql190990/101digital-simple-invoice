import { expect, test } from '@playwright/test';
import { ANCHOR, gotoList } from '../helpers';

test.beforeEach(async ({ page }) => {
  await gotoList(page);
});

test.describe('Invoice list', () => {
  test('renders server-paginated invoice rows', async ({ page }) => {
    // The anchor invoice is not necessarily on page 1 (default sort is invoiceDate
    // DESC); its existence is proven by the search + row-click tests below.
    const rows = page.getByTestId('invoice-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
  });

  test('searches by customer name (partial, case-insensitive)', async ({ page }) => {
    await page.getByLabel(/search/i).fill('paul');
    // Every visible row must match the keyword once the debounced fetch resolves.
    await expect
      .poll(
        async () => {
          const texts = await page.getByTestId('invoice-row').allInnerTexts();
          return texts.length > 0 && texts.every((t) => /paul/i.test(t));
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await expect(page.getByText(ANCHOR.number)).toBeVisible();
  });

  test('searches by invoice number (partial match)', async ({ page }) => {
    await page.getByLabel(/search/i).fill('iv178');
    await expect(page.getByTestId('invoice-row')).toHaveCount(1);
    await expect(page.getByText(ANCHOR.number)).toBeVisible();
  });

  test('filters by derived Overdue status (badge matches filter)', async ({ page }) => {
    await page.getByLabel('Status').selectOption('Overdue');
    await expect
      .poll(
        async () => {
          const texts = await page.getByTestId('invoice-row').allInnerTexts();
          return texts.length > 0 && texts.every((t) => /Overdue/.test(t));
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  });

  test('filters by Paid status', async ({ page }) => {
    await page.getByLabel('Status').selectOption('Paid');
    await expect
      .poll(
        async () => {
          const texts = await page.getByTestId('invoice-row').allInnerTexts();
          return texts.length > 0 && texts.every((t) => /Paid/.test(t));
        },
        { timeout: 15_000 },
      )
      .toBe(true);
  });

  test('sorting by total amount changes the ordering (ASC vs DESC)', async ({ page }) => {
    await page.getByLabel('Sort by').selectOption('totalAmount');
    // The toggle button uses aria-label "Toggle sort direction"; its visible text
    // is "↓ DESC" / "↑ ASC" (assert via text content, not accessible name).
    const toggle = page.getByRole('button', { name: /toggle sort direction/i });
    const firstNumber = () =>
      page.getByTestId('invoice-row').first().locator('td').first().innerText();

    await expect(page.getByTestId('invoice-row').first()).toBeVisible();
    const descTop = (await firstNumber()).trim();

    await toggle.click(); // flip DESC → ASC
    await expect(toggle).toContainText('ASC');
    // Wait until the re-sorted list actually changes its top row.
    await expect.poll(async () => (await firstNumber()).trim(), { timeout: 15_000 }).not.toBe(descTop);
  });

  test('paginates through results (server-side)', async ({ page }) => {
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    const firstNumber = () =>
      page.getByTestId('invoice-row').first().locator('td').first().innerText();
    const page1First = (await firstNumber()).trim();

    // Next: React Query keeps the previous page's rows while fetching (placeholderData),
    // so poll until the top row actually changes rather than reading it immediately.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await expect.poll(async () => (await firstNumber()).trim(), { timeout: 15_000 }).not.toBe(page1First);

    // Previous: back to page 1, top row returns to the original.
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await expect.poll(async () => (await firstNumber()).trim(), { timeout: 15_000 }).toBe(page1First);
  });

  test('clicking a row navigates to its detail page', async ({ page }) => {
    await page.getByLabel(/search/i).fill(ANCHOR.number);
    await expect(page.getByTestId('invoice-row')).toHaveCount(1);
    await page.getByTestId('invoice-row').first().click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: ANCHOR.number })).toBeVisible();
  });
});

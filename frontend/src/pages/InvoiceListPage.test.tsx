import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceListPage } from './InvoiceListPage';
import type { InvoiceListItem } from '../features/invoices/types';
import { server } from '../test/mocks/server';
import { renderWithProviders } from '../test/utils';

function setup() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<InvoiceListPage />} />
      <Route path="/invoices/:id" element={<div>Detail page</div>} />
      <Route path="/invoices/new" element={<div>Create page</div>} />
    </Routes>,
    { route: '/' },
  );
}

async function waitForRows() {
  await waitFor(() => expect(screen.getAllByTestId('invoice-row').length).toBeGreaterThan(0));
}

describe('InvoiceListPage', () => {
  it('renders invoices with number, customer, total and status', async () => {
    setup();
    await waitForRows();

    expect(screen.getByText('IV1780488206995')).toBeInTheDocument();
    expect(screen.getByText('Paul')).toBeInTheDocument();
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
  });

  it('searches by keyword (case-insensitive, partial)', async () => {
    const user = userEvent.setup();
    setup();
    await waitForRows();

    await user.type(screen.getByLabelText(/search/i), 'emma');
    await waitFor(() => {
      const rows = screen.getAllByTestId('invoice-row');
      expect(rows).toHaveLength(1);
      expect(within(rows[0]).getByText('Emma Watson')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    setup();
    await waitForRows();

    await user.selectOptions(screen.getByLabelText(/status/i), 'Paid');
    await waitFor(() => {
      const rows = screen.getAllByTestId('invoice-row');
      expect(rows).toHaveLength(1);
      expect(within(rows[0]).getByText('INV-0003')).toBeInTheDocument();
    });
  });

  it('sorts by total amount ascending', async () => {
    const user = userEvent.setup();
    setup();
    await waitForRows();

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'totalAmount');
    await user.click(screen.getByRole('button', { name: /toggle sort direction/i }));

    await waitFor(() => {
      const rows = screen.getAllByTestId('invoice-row');
      // Lowest total (500, Emma) should be first in ASC order.
      expect(within(rows[0]).getByText('Emma Watson')).toBeInTheDocument();
    });
  });

  it('navigates to detail on row click', async () => {
    const user = userEvent.setup();
    setup();
    await waitForRows();

    await user.click(screen.getAllByTestId('invoice-row')[0]);
    expect(await screen.findByText(/detail page/i)).toBeInTheDocument();
  });

  it('pages forward and backward through results', async () => {
    const user = userEvent.setup();
    // 25 rows across 3 pages of 10; the override slices by page/pageSize.
    const many: InvoiceListItem[] = Array.from({ length: 25 }, (_, i) => ({
      invoiceId: `page-${i}`,
      invoiceNumber: `PAGE-${String(i).padStart(3, '0')}`,
      customerFullname: `Customer ${i}`,
      invoiceDate: '2026-01-01',
      dueDate: '2099-01-01',
      totalAmount: 100 + i,
      currency: 'AUD',
      currencySymbol: 'AU$',
      status: 'Pending',
    }));
    server.use(
      http.get('/api/invoices', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');
        const pageSize = Number(url.searchParams.get('pageSize') ?? '10');
        const start = (page - 1) * pageSize;
        return HttpResponse.json({
          data: many.slice(start, start + pageSize),
          paging: { page, pageSize, total: many.length },
        });
      }),
    );

    setup();
    await waitForRows();

    // Page 1: first slice, Previous disabled.
    expect(screen.getByText('PAGE-000')).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    // Next → page 2.
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(screen.getByText('PAGE-010')).toBeInTheDocument());
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    // Previous → back to page 1.
    await user.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => expect(screen.getByText('PAGE-000')).toBeInTheDocument());
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('shows an error state when the list request fails', async () => {
    server.use(http.get('/api/invoices', () => HttpResponse.json({}, { status: 500 })));
    setup();

    expect(await screen.findByText(/failed to load invoices/i)).toBeInTheDocument();
  });
});

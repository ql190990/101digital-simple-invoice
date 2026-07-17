import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceListPage } from './InvoiceListPage';
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
});

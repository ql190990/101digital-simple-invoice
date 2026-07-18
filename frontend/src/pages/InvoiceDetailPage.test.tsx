import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InvoiceDetailPage } from './InvoiceDetailPage';
import { renderWithProviders } from '../test/utils';
import { mockInvoiceDetail } from '../test/mocks/data';

function setup(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
    </Routes>,
    { route: `/invoices/${id}` },
  );
}

describe('InvoiceDetailPage', () => {
  it('renders invoice, customer, line items and totals from the stored record', async () => {
    setup(mockInvoiceDetail.invoiceId);

    // Header / status
    expect(await screen.findByText('IV1780488206995')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    // Customer information
    expect(screen.getByText('paul@101digital.io')).toBeInTheDocument();
    expect(screen.getByText('Singapore')).toBeInTheDocument();

    // Line item
    expect(screen.getByText('Honda RC150')).toBeInTheDocument();

    // Totals reflect the persisted values exactly (FR-13)
    expect(screen.getByText(/Tax \(10%\)/)).toBeInTheDocument();
    expect(screen.getByTestId('balance')).toHaveTextContent('728.66');
  });

  it('shows a not-found state when the invoice does not exist (404)', async () => {
    setup('00000000-0000-0000-0000-000000000000');

    expect(await screen.findByText(/invoice not found/i)).toBeInTheDocument();
  });
});

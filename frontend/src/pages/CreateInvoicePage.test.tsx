import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CreateInvoicePage } from './CreateInvoicePage';
import { renderWithProviders } from '../test/utils';

function setup() {
  return renderWithProviders(
    <Routes>
      <Route path="/invoices/new" element={<CreateInvoicePage />} />
      <Route path="/" element={<div>Invoice list landing</div>} />
    </Routes>,
    { route: '/invoices/new' },
  );
}

describe('CreateInvoicePage', () => {
  it('shows validation errors when required fields are missing', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/item name is required/i)).toBeInTheDocument();
  });

  it('rejects a due date before the invoice date', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText(/invoice date/i));
    await user.type(screen.getByLabelText(/invoice date/i), '2026-07-03');
    await user.clear(screen.getByLabelText(/due date/i));
    await user.type(screen.getByLabelText(/due date/i), '2026-06-03');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(
      await screen.findByText(/due date must be on or after invoice date/i),
    ).toBeInTheDocument();
  });

  it('submits a valid invoice and redirects to the list', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Name *'), 'Paul');
    await user.type(screen.getByLabelText('Email *'), 'paul@101digital.io');
    await user.type(screen.getByLabelText('Invoice number *'), 'INV-NEW-1');
    await user.clear(screen.getByLabelText('Invoice date *'));
    await user.type(screen.getByLabelText('Invoice date *'), '2026-06-03');
    await user.clear(screen.getByLabelText('Due date *'));
    await user.type(screen.getByLabelText('Due date *'), '2026-07-03');
    await user.type(screen.getByLabelText('Item name *'), 'Honda RC150');
    await user.clear(screen.getByLabelText('Quantity *'));
    await user.type(screen.getByLabelText('Quantity *'), '2');
    await user.type(screen.getByLabelText('Rate *'), '1000');

    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(screen.getByText(/invoice list landing/i)).toBeInTheDocument());
  });

  it('computes a live client-side preview of totals', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(/rate/i), '1000');
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), '2');

    const preview = screen.getByTestId('totals-preview');
    // subtotal 2000, tax 10% = 200, total 2200 (no discount).
    await waitFor(() => expect(preview).toHaveTextContent('2,200.00'));
  });
});

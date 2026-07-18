import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { useInvoice } from '../features/invoices/api';
import { formatDate, formatMoney } from '../lib/format';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError, error } = useInvoice(id);

  if (isLoading) return <Spinner label="Loading invoice…" />;
  if (isError || !invoice) {
    // Only a genuine 404 means "not found"; a 500/network fault is something else
    // and must not masquerade as a missing invoice (CQ M3).
    const isNotFound = axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-red-600">
          {isNotFound
            ? 'Invoice not found.'
            : 'Something went wrong loading this invoice. Please try again.'}
        </p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-brand-600">
          ← Back to invoices
        </Link>
      </div>
    );
  }

  const symbol = invoice.currencySymbol;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/" className="text-sm font-medium text-brand-600">
            ← Back to invoices
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice information */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invoice information
          </h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Invoice date</dt>
            <dd className="text-right font-medium">{formatDate(invoice.invoiceDate)}</dd>
            <dt className="text-slate-500">Due date</dt>
            <dd className="text-right font-medium">{formatDate(invoice.dueDate)}</dd>
            <dt className="text-slate-500">Currency</dt>
            <dd className="text-right font-medium">{invoice.currency}</dd>
            <dt className="text-slate-500">Reference</dt>
            <dd className="text-right font-medium">{invoice.invoiceReference ?? '—'}</dd>
            <dt className="text-slate-500">Description</dt>
            <dd className="text-right font-medium">{invoice.description ?? '—'}</dd>
          </dl>
        </section>

        {/* Customer information */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Customer information
          </h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Name</dt>
            <dd className="text-right font-medium">{invoice.customerFullname}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="text-right font-medium">{invoice.customerEmail}</dd>
            <dt className="text-slate-500">Mobile</dt>
            <dd className="text-right font-medium">{invoice.customerMobile ?? '—'}</dd>
            <dt className="text-slate-500">Address</dt>
            <dd className="text-right font-medium">{invoice.customerAddress ?? '—'}</dd>
          </dl>
        </section>
      </div>

      {/* Line items */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 text-right font-medium">Qty</th>
                <th className="px-5 py-2 text-right font-medium">Rate</th>
                <th className="px-5 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium">{item.name}</td>
                  <td className="px-5 py-3 text-right">{item.quantity}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(item.rate, symbol)}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatMoney(item.rate * item.quantity, symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totals */}
      <section className="ml-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-medium">{formatMoney(invoice.invoiceSubTotal, symbol)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Tax ({invoice.taxPercent}%)</dt>
            <dd className="font-medium">{formatMoney(invoice.totalTax, symbol)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Discount</dt>
            <dd className="font-medium">− {formatMoney(invoice.totalDiscount, symbol)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold">{formatMoney(invoice.totalAmount, symbol)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Paid</dt>
            <dd className="font-medium">{formatMoney(invoice.totalPaid, symbol)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Outstanding balance</dt>
            <dd className="font-bold text-brand-700" data-testid="balance">
              {formatMoney(invoice.balanceAmount, symbol)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

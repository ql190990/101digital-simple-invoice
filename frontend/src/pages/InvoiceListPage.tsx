import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { useInvoices } from '../features/invoices/api';
import type { EffectiveStatus, Ordering, SortBy } from '../features/invoices/types';
import { formatDate, formatMoney } from '../lib/format';

const STATUS_OPTIONS: (EffectiveStatus | 'All')[] = ['All', 'Draft', 'Pending', 'Paid', 'Overdue'];
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'invoiceDate', label: 'Invoice date' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'totalAmount', label: 'Total amount' },
];
const PAGE_SIZE = 10;

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<EffectiveStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortBy>('invoiceDate');
  const [ordering, setOrdering] = useState<Ordering>('DESC');
  const [page, setPage] = useState(1);

  // Debounce the keyword so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(keywordInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [keywordInput]);

  const params = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      ordering,
      status: status === 'All' ? undefined : status,
      keyword: keyword || undefined,
    }),
    [page, sortBy, ordering, status, keyword],
  );

  const { data, isLoading, isError, isFetching } = useInvoices(params);

  const total = data?.paging.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{total} total</p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + New invoice
        </Link>
      </div>

      {/* Controls */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-slate-600">
            Search (invoice # or customer)
          </label>
          <input
            id="search"
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as EffectiveStatus | 'All');
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sortBy" className="mb-1 block text-xs font-medium text-slate-600">
            Sort by
          </label>
          <div className="flex gap-2">
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Toggle sort direction"
              onClick={() => setOrdering((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {ordering === 'ASC' ? '↑ ASC' : '↓ DESC'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-600">Failed to load invoices.</div>
        ) : data && data.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Invoice date</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((invoice) => (
                  <tr
                    key={invoice.invoiceId}
                    onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
                    className="cursor-pointer hover:bg-slate-50"
                    data-testid="invoice-row"
                  >
                    <td className="px-4 py-3 font-medium text-brand-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">{invoice.customerFullname}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            No invoices match your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Page {page} of {totalPages}
          {isFetching && <span className="ml-2 text-slate-400">updating…</span>}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

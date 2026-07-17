import { HttpResponse, http } from 'msw';
import type { InvoiceListItem } from '../../features/invoices/types';
import { mockInvoiceDetail, mockInvoices } from './data';

const BASE = '/api';

/**
 * MSW handlers emulating the backend contract for frontend tests. The list
 * handler applies keyword/status/sort/pagination so UI interactions can be
 * asserted end-to-end without a real server.
 */
export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'reviewer@101digital.io' && body.password === 'Password123!') {
      return HttpResponse.json({
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 'user-1',
          email: body.email,
          fullname: 'Reviewer',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'Invalid email or password', error: 'Unauthorized' },
      { status: 401 },
    );
  }),

  http.get(`${BASE}/auth/me`, () =>
    HttpResponse.json({
      id: 'user-1',
      email: 'reviewer@101digital.io',
      fullname: 'Reviewer',
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  ),

  http.get(`${BASE}/invoices`, ({ request }) => {
    const url = new URL(request.url);
    const keyword = (url.searchParams.get('keyword') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const sortBy = url.searchParams.get('sortBy') ?? 'invoiceDate';
    const ordering = url.searchParams.get('ordering') ?? 'DESC';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10');

    let rows: InvoiceListItem[] = [...mockInvoices];

    if (keyword) {
      rows = rows.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(keyword) ||
          r.customerFullname.toLowerCase().includes(keyword),
      );
    }
    if (status) {
      rows = rows.filter((r) => r.status === status);
    }
    rows.sort((a, b) => {
      const key = sortBy as keyof InvoiceListItem;
      const av = a[key];
      const bv = b[key];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return ordering === 'ASC' ? cmp : -cmp;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const data = rows.slice(start, start + pageSize);

    return HttpResponse.json({ data, paging: { page, pageSize, total } });
  }),

  http.get(`${BASE}/invoices/:id`, ({ params }) => {
    if (params.id === mockInvoiceDetail.invoiceId) {
      return HttpResponse.json(mockInvoiceDetail);
    }
    return HttpResponse.json(
      { statusCode: 404, message: 'Invoice not found', error: 'Not Found' },
      { status: 404 },
    );
  }),

  http.post(`${BASE}/invoices`, async ({ request }) => {
    const body = (await request.json()) as { invoiceNumber: string };
    if (body.invoiceNumber === 'DUPLICATE') {
      return HttpResponse.json(
        {
          statusCode: 409,
          message: `Invoice number "${body.invoiceNumber}" already exists`,
          error: 'Conflict',
        },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      { ...mockInvoiceDetail, invoiceNumber: body.invoiceNumber, status: 'Draft' },
      { status: 201 },
    );
  }),
];

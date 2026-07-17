import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { InvoiceDetail, ListInvoicesParams, PaginatedInvoices } from './types';

/** Build a query object with only the defined params (keeps URLs clean). */
function toQueryParams(params: ListInvoicesParams): Record<string, string | number> {
  const out: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    ordering: params.ordering,
  };
  if (params.status) out.status = params.status;
  if (params.keyword && params.keyword.trim()) out.keyword = params.keyword.trim();
  if (params.fromDate) out.fromDate = params.fromDate;
  if (params.toDate) out.toDate = params.toDate;
  return out;
}

export function useInvoices(params: ListInvoicesParams) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async (): Promise<PaginatedInvoices> => {
      const { data } = await api.get<PaginatedInvoices>('/invoices', {
        params: toQueryParams(params),
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<InvoiceDetail> => {
      const { data } = await api.get<InvoiceDetail>(`/invoices/${id}`);
      return data;
    },
  });
}

export interface CreateInvoicePayload {
  customerFullname: string;
  customerEmail: string;
  customerMobile?: string;
  customerAddress?: string;
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol?: string;
  description?: string;
  taxPercent: number;
  discount: number;
  items: { name: string; quantity: number; rate: number }[];
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload): Promise<InvoiceDetail> => {
      const { data } = await api.post<InvoiceDetail>('/invoices', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

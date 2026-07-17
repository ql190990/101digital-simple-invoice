export type EffectiveStatus = 'Draft' | 'Pending' | 'Paid' | 'Overdue';
export type SortBy = 'invoiceDate' | 'dueDate' | 'totalAmount';
export type Ordering = 'ASC' | 'DESC';

export interface InvoiceListItem {
  invoiceId: string;
  invoiceNumber: string;
  customerFullname: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  currencySymbol: string;
  status: EffectiveStatus;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface InvoiceDetail extends InvoiceListItem {
  invoiceReference: string | null;
  description: string | null;
  customerEmail: string;
  customerMobile: string | null;
  customerAddress: string | null;
  invoiceSubTotal: number;
  taxPercent: number;
  totalTax: number;
  totalDiscount: number;
  totalPaid: number;
  balanceAmount: number;
  items: InvoiceItem[];
  createdAt: string;
  createdBy: string;
}

export interface Paging {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedInvoices {
  data: InvoiceListItem[];
  paging: Paging;
}

export interface ListInvoicesParams {
  page: number;
  pageSize: number;
  sortBy: SortBy;
  ordering: Ordering;
  status?: EffectiveStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullname: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

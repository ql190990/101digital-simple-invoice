import { Injectable } from '@nestjs/common';
import { Invoice, InvoiceItem, InvoiceStatus, Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import {
  EffectiveStatusFilter,
  InvoiceSortBy,
  ListInvoicesDto,
  SortOrdering,
} from './dto/list-invoices.dto';

/**
 * Shape the repository persists. Money fields (and the item rate) accept
 * domain-native values — `Decimal.Value` is decimal.js `Decimal | number |
 * string` — rather than `Prisma.Decimal`, so the service stays
 * persistence-agnostic (Arch M1). The repository converts to `Prisma.Decimal`
 * internally via `toDecimal`, keeping the ONLY Prisma-money coupling here (D2).
 */
export interface CreateInvoiceData {
  invoiceNumber: string;
  invoiceReference: string | null;
  invoiceDate: Date;
  dueDate: Date;
  currency: string;
  currencySymbol: string;
  description: string | null;
  customerFullname: string;
  customerEmail: string;
  customerMobile: string | null;
  customerAddress: string | null;
  taxPercent: Decimal.Value;
  invoiceSubTotal: Decimal.Value;
  totalTax: Decimal.Value;
  totalDiscount: Decimal.Value;
  totalAmount: Decimal.Value;
  totalPaid: Decimal.Value;
  balanceAmount: Decimal.Value;
  createdBy: string;
  items: { name: string; quantity: number; rate: Decimal.Value }[];
}

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

const SORT_FIELD_MAP: Record<InvoiceSortBy, keyof Prisma.InvoiceOrderByWithRelationInput> = {
  [InvoiceSortBy.invoiceDate]: 'invoiceDate',
  [InvoiceSortBy.dueDate]: 'dueDate',
  [InvoiceSortBy.totalAmount]: 'totalAmount',
};

/**
 * Data access for invoices. This is the ONLY invoice layer that imports Prisma
 * (ADR D2). It also owns translation from query DTO → Prisma where/orderBy,
 * including the derived-status predicate (A3) and the keyword ILIKE search (A8).
 */
@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<InvoiceWithItems> {
    return this.prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        invoiceReference: data.invoiceReference,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        currency: data.currency,
        currencySymbol: data.currencySymbol,
        description: data.description,
        customerFullname: data.customerFullname,
        customerEmail: data.customerEmail,
        customerMobile: data.customerMobile,
        customerAddress: data.customerAddress,
        taxPercent: this.toDecimal(data.taxPercent),
        invoiceSubTotal: this.toDecimal(data.invoiceSubTotal),
        totalTax: this.toDecimal(data.totalTax),
        totalDiscount: this.toDecimal(data.totalDiscount),
        totalAmount: this.toDecimal(data.totalAmount),
        totalPaid: this.toDecimal(data.totalPaid),
        balanceAmount: this.toDecimal(data.balanceAmount),
        createdBy: data.createdBy,
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            rate: this.toDecimal(item.rate),
          })),
        },
      },
      include: { items: true },
    });
  }

  /**
   * Convert a domain money value into a `Prisma.Decimal` (Arch M1). Serialising
   * via `toString()` keeps decimal.js `Decimal` inputs exact and never coerces
   * through a JS float (ADR A12). This is the sole point where invoice money
   * crosses into Prisma.
   */
  private toDecimal(value: Decimal.Value): Prisma.Decimal {
    return new Prisma.Decimal(value.toString());
  }

  findById(invoiceId: string): Promise<InvoiceWithItems | null> {
    return this.prisma.invoice.findUnique({
      where: { invoiceId },
      include: { items: true },
    });
  }

  /**
   * Paginated, filtered, sorted list. Returns rows and the total count for the
   * same filter (server-side pagination, FR-11).
   */
  async findMany(query: ListInvoicesDto, today: Date): Promise<{ rows: Invoice[]; total: number }> {
    const where = this.buildWhere(query, today);
    const dir = query.ordering === SortOrdering.ASC ? 'asc' : 'desc';
    const primarySort: Prisma.InvoiceOrderByWithRelationInput = {
      [SORT_FIELD_MAP[query.sortBy]]: dir,
    };
    // Append the unique primary key as a tiebreaker so offset pagination is
    // deterministic across rows that share a sort value (Arch H1 / Perf H-1) —
    // without it, equal-key rows can duplicate or vanish at page boundaries.
    // Same direction as the primary sort keeps the ordering intuitive.
    const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = [primarySort, { invoiceId: dir }];

    // A read-only paginated list does not need the two queries to share a
    // snapshot, so run them concurrently with Promise.all rather than serially
    // inside a $transaction (Perf H-2 / L-2): latency ≈ max(findMany, count).
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { rows, total };
  }

  /** Translate the query DTO into a Prisma where-clause. */
  private buildWhere(query: ListInvoicesDto, today: Date): Prisma.InvoiceWhereInput {
    const and: Prisma.InvoiceWhereInput[] = [];

    // Keyword: case-insensitive partial match on invoice number OR customer name.
    // `contains` + `mode: insensitive` compiles to ILIKE '%kw%', which the
    // pg_trgm GIN indexes accelerate (A8, DB-08).
    if (query.keyword && query.keyword.trim().length > 0) {
      const keyword = query.keyword.trim();
      and.push({
        OR: [
          { invoiceNumber: { contains: keyword, mode: 'insensitive' } },
          { customerFullname: { contains: keyword, mode: 'insensitive' } },
        ],
      });
    }

    // Effective-status filter (A3) — must match what the user sees.
    if (query.status) {
      and.push(this.statusPredicate(query.status, today));
    }

    // invoiceDate range.
    if (query.fromDate) {
      and.push({ invoiceDate: { gte: new Date(`${query.fromDate}T00:00:00.000Z`) } });
    }
    if (query.toDate) {
      and.push({ invoiceDate: { lte: new Date(`${query.toDate}T00:00:00.000Z`) } });
    }

    return and.length > 0 ? { AND: and } : {};
  }

  /**
   * SQL predicate mirroring `deriveInvoiceStatus` (A3). The persisted enum stores
   * only Draft/Pending/Paid; Overdue is expressed as a date comparison.
   */
  private statusPredicate(status: EffectiveStatusFilter, today: Date): Prisma.InvoiceWhereInput {
    switch (status) {
      case EffectiveStatusFilter.Overdue:
        // Overdue = not Paid AND past due. Expressed as an IN over the two
        // non-Paid persisted statuses (equivalent to `!= Paid` while only
        // Draft/Pending/Paid are persisted) so the leading column of the
        // [status, dueDate] btree stays an equality set and can seek the
        // dueDate range instead of scanning (Perf M-1). Mirrors
        // deriveInvoiceStatus: `status !== 'Paid' AND dueDate < today` (A3).
        return {
          status: { in: [InvoiceStatus.Draft, InvoiceStatus.Pending] },
          dueDate: { lt: today },
        };
      case EffectiveStatusFilter.Draft:
        return { status: InvoiceStatus.Draft, dueDate: { gte: today } };
      case EffectiveStatusFilter.Pending:
        return { status: InvoiceStatus.Pending, dueDate: { gte: today } };
      case EffectiveStatusFilter.Paid:
        return { status: InvoiceStatus.Paid };
      default: {
        // Exhaustiveness guard: a new status must be handled here.
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  }
}

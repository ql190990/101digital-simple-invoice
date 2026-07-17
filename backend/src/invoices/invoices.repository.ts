import { Injectable } from '@nestjs/common';
import { Invoice, InvoiceItem, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EffectiveStatusFilter,
  InvoiceSortBy,
  ListInvoicesDto,
  SortOrdering,
} from './dto/list-invoices.dto';

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
  taxPercent: Prisma.Decimal;
  invoiceSubTotal: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalDiscount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  balanceAmount: Prisma.Decimal;
  createdBy: string;
  items: { name: string; quantity: number; rate: Prisma.Decimal }[];
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
        taxPercent: data.taxPercent,
        invoiceSubTotal: data.invoiceSubTotal,
        totalTax: data.totalTax,
        totalDiscount: data.totalDiscount,
        totalAmount: data.totalAmount,
        totalPaid: data.totalPaid,
        balanceAmount: data.balanceAmount,
        createdBy: data.createdBy,
        items: { create: data.items },
      },
      include: { items: true },
    });
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
    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {
      [SORT_FIELD_MAP[query.sortBy]]: query.ordering === SortOrdering.ASC ? 'asc' : 'desc',
    };

    const [rows, total] = await this.prisma.$transaction([
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
        return { status: { not: 'Paid' }, dueDate: { lt: today } };
      case EffectiveStatusFilter.Draft:
        return { status: 'Draft', dueDate: { gte: today } };
      case EffectiveStatusFilter.Pending:
        return { status: 'Pending', dueDate: { gte: today } };
      case EffectiveStatusFilter.Paid:
        return { status: 'Paid' };
      default: {
        // Exhaustiveness guard: a new status must be handled here.
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  }
}

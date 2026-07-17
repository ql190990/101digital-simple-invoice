import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { getTodayInTimezone } from '../common/utils/date.util';
import { calculateInvoiceTotals } from './domain/calculate-invoice-totals';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDetailDto, InvoiceListItemDto } from './dto/invoice-response.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { PaginatedInvoicesDto } from './dto/paginated-invoices.dto';
import { InvoicesRepository } from './invoices.repository';

const DEFAULT_TAX_PERCENT = 10;
const DEFAULT_DISCOUNT = 0;
const DEFAULT_CURRENCY_SYMBOL = '';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly config: ConfigService,
  ) {}

  private get timezone(): string {
    return this.config.get<string>('APP_TIMEZONE', 'UTC');
  }

  private get maxPageSize(): number {
    return this.config.get<number>('MAX_PAGE_SIZE', 100);
  }

  /**
   * Create an invoice. Totals and status are computed server-side (FR-19, BL-07).
   * Duplicate invoice numbers surface as 409 (A10) — the DB unique constraint is
   * the source of truth (no racy read-then-write).
   */
  async create(dto: CreateInvoiceDto, userId: string): Promise<InvoiceDetailDto> {
    const taxPercent = dto.taxPercent ?? DEFAULT_TAX_PERCENT;
    const discount = dto.discount ?? DEFAULT_DISCOUNT;

    const totals = calculateInvoiceTotals({
      items: dto.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
      taxPercent,
      discount,
      totalPaid: 0,
    });

    try {
      const created = await this.repository.create({
        invoiceNumber: dto.invoiceNumber,
        invoiceReference: dto.invoiceReference ?? null,
        invoiceDate: new Date(`${dto.invoiceDate}T00:00:00.000Z`),
        dueDate: new Date(`${dto.dueDate}T00:00:00.000Z`),
        currency: dto.currency,
        currencySymbol: dto.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL,
        description: dto.description ?? null,
        customerFullname: dto.customerFullname,
        customerEmail: dto.customerEmail,
        customerMobile: dto.customerMobile ?? null,
        customerAddress: dto.customerAddress ?? null,
        taxPercent: new Prisma.Decimal(taxPercent),
        invoiceSubTotal: new Prisma.Decimal(totals.subTotal.toString()),
        totalTax: new Prisma.Decimal(totals.taxAmount.toString()),
        totalDiscount: new Prisma.Decimal(discount),
        totalAmount: new Prisma.Decimal(totals.totalAmount.toString()),
        totalPaid: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(totals.balanceAmount.toString()),
        createdBy: userId,
        // New invoices always start as Draft (BL-07); the schema default enforces it.
        items: dto.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          rate: new Prisma.Decimal(i.rate),
        })),
      });

      return InvoiceDetailDto.fromEntity(created, getTodayInTimezone(this.timezone));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Invoice number "${dto.invoiceNumber}" already exists`);
      }
      throw error;
    }
  }

  async findOne(invoiceId: string): Promise<InvoiceDetailDto> {
    const invoice = await this.repository.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return InvoiceDetailDto.fromEntity(invoice, getTodayInTimezone(this.timezone));
  }

  async findMany(query: ListInvoicesDto): Promise<PaginatedInvoicesDto> {
    // Defence in depth: clamp pageSize even though the DTO also caps it (API-09).
    const pageSize = Math.min(query.pageSize, this.maxPageSize);
    const effectiveQuery: ListInvoicesDto = { ...query, pageSize };

    const today = getTodayInTimezone(this.timezone);
    const { rows, total } = await this.repository.findMany(effectiveQuery, today);

    return {
      data: rows.map((row) => InvoiceListItemDto.fromEntity(row, today)),
      paging: {
        page: effectiveQuery.page,
        pageSize,
        total,
      },
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Invoice, InvoiceItem } from '@prisma/client';
import { toMoneyNumber } from '../../common/utils/decimal.util';
import { formatDateKey } from '../../common/utils/date.util';
import { deriveInvoiceStatus } from '../domain/derive-invoice-status';
import { EFFECTIVE_STATUSES, EffectiveStatus } from '../domain/invoice-status';

type InvoiceWithItems = Invoice & { items?: InvoiceItem[] };

export class InvoiceItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Honda RC150' })
  name!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 1000, description: '2 decimal places' })
  rate!: number;

  static fromEntity(item: InvoiceItem): InvoiceItemDto {
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      rate: toMoneyNumber(item.rate),
    };
  }
}

/**
 * Full invoice detail (FR-12). Money is serialised as numbers with 2 dp (A12).
 * `status` is the derived effective status (A3).
 */
export class InvoiceDetailDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId!: string;

  @ApiProperty({ example: 'IV1780488206995' })
  invoiceNumber!: string;

  @ApiPropertyOptional({ example: '#5721662', nullable: true })
  invoiceReference!: string | null;

  @ApiProperty({ example: '2026-06-03' })
  invoiceDate!: string;

  @ApiProperty({ example: '2026-07-03' })
  dueDate!: string;

  @ApiProperty({ example: 'AUD' })
  currency!: string;

  @ApiProperty({ example: 'AU$' })
  currencySymbol!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'Paul' })
  customerFullname!: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  customerEmail!: string;

  @ApiPropertyOptional({ nullable: true })
  customerMobile!: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerAddress!: string | null;

  @ApiProperty({ enum: EFFECTIVE_STATUSES, example: 'Overdue' })
  status!: EffectiveStatus;

  @ApiProperty({ example: 2000 })
  invoiceSubTotal!: number;

  @ApiProperty({ example: 10 })
  taxPercent!: number;

  @ApiProperty({ example: 200 })
  totalTax!: number;

  @ApiProperty({ example: 20 })
  totalDiscount!: number;

  @ApiProperty({ example: 2180 })
  totalAmount!: number;

  @ApiProperty({ example: 1451.34 })
  totalPaid!: number;

  @ApiProperty({ example: 728.66 })
  balanceAmount!: number;

  @ApiProperty({ type: [InvoiceItemDto] })
  items!: InvoiceItemDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  static fromEntity(invoice: InvoiceWithItems, today: Date): InvoiceDetailDto {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceReference: invoice.invoiceReference,
      invoiceDate: formatDateKey(invoice.invoiceDate),
      dueDate: formatDateKey(invoice.dueDate),
      currency: invoice.currency,
      currencySymbol: invoice.currencySymbol,
      description: invoice.description,
      customerFullname: invoice.customerFullname,
      customerEmail: invoice.customerEmail,
      customerMobile: invoice.customerMobile,
      customerAddress: invoice.customerAddress,
      status: deriveInvoiceStatus(invoice.status, invoice.dueDate, today),
      invoiceSubTotal: toMoneyNumber(invoice.invoiceSubTotal),
      taxPercent: toMoneyNumber(invoice.taxPercent),
      totalTax: toMoneyNumber(invoice.totalTax),
      totalDiscount: toMoneyNumber(invoice.totalDiscount),
      totalAmount: toMoneyNumber(invoice.totalAmount),
      totalPaid: toMoneyNumber(invoice.totalPaid),
      balanceAmount: toMoneyNumber(invoice.balanceAmount),
      items: (invoice.items ?? []).map(InvoiceItemDto.fromEntity),
      createdAt: invoice.createdAt.toISOString(),
      createdBy: invoice.createdBy,
    };
  }
}

/**
 * Compact list-row representation (FR-07).
 */
export class InvoiceListItemDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId!: string;

  @ApiProperty({ example: 'IV1780488206995' })
  invoiceNumber!: string;

  @ApiProperty({ example: 'Paul' })
  customerFullname!: string;

  @ApiProperty({ example: '2026-06-03' })
  invoiceDate!: string;

  @ApiProperty({ example: '2026-07-03' })
  dueDate!: string;

  @ApiProperty({ example: 2180 })
  totalAmount!: number;

  @ApiProperty({ example: 'AUD' })
  currency!: string;

  @ApiProperty({ example: 'AU$' })
  currencySymbol!: string;

  @ApiProperty({ enum: EFFECTIVE_STATUSES, example: 'Overdue' })
  status!: EffectiveStatus;

  static fromEntity(invoice: Invoice, today: Date): InvoiceListItemDto {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerFullname: invoice.customerFullname,
      invoiceDate: formatDateKey(invoice.invoiceDate),
      dueDate: formatDateKey(invoice.dueDate),
      totalAmount: toMoneyNumber(invoice.totalAmount),
      currency: invoice.currency,
      currencySymbol: invoice.currencySymbol,
      status: deriveInvoiceStatus(invoice.status, invoice.dueDate, today),
    };
  }
}

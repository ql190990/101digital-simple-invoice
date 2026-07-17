import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum InvoiceSortBy {
  invoiceDate = 'invoiceDate',
  dueDate = 'dueDate',
  totalAmount = 'totalAmount',
}

export enum SortOrdering {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum EffectiveStatusFilter {
  Draft = 'Draft',
  Pending = 'Pending',
  Paid = 'Paid',
  Overdue = 'Overdue',
}

/**
 * Query parameters for GET /invoices. `sortBy` and `ordering` are whitelisted
 * via enums and never interpolated into SQL (API-10). `pageSize` is clamped to a
 * configurable maximum by the service (API-09).
 */
export class ListInvoicesDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional({ enum: InvoiceSortBy, default: InvoiceSortBy.invoiceDate })
  @IsOptional()
  @IsEnum(InvoiceSortBy)
  sortBy: InvoiceSortBy = InvoiceSortBy.invoiceDate;

  @ApiPropertyOptional({ enum: SortOrdering, default: SortOrdering.DESC })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(SortOrdering)
  ordering: SortOrdering = SortOrdering.DESC;

  @ApiPropertyOptional({ enum: EffectiveStatusFilter, description: 'Filter by effective status' })
  @IsOptional()
  @IsEnum(EffectiveStatusFilter)
  status?: EffectiveStatusFilter;

  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on number or customer name',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'invoiceDate on/after (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'invoiceDate on/before (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

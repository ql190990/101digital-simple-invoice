import { ApiProperty } from '@nestjs/swagger';
import { InvoiceListItemDto } from './invoice-response.dto';

export class PagingDto {
  @ApiProperty({ example: 1, description: 'Current page (starts at 1)' })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 41, description: 'Total matching records' })
  total!: number;
}

/**
 * Paginated list envelope (API-07, ADR A1): { data, paging: { page, pageSize, total } }.
 */
export class PaginatedInvoicesDto {
  @ApiProperty({ type: [InvoiceListItemDto] })
  data!: InvoiceListItemDto[];

  @ApiProperty({ type: PagingDto })
  paging!: PagingDto;
}

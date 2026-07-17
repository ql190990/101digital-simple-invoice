import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDetailDto } from './dto/invoice-response.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { PaginatedInvoicesDto } from './dto/paginated-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with search, filter, sort and pagination' })
  @ApiOkResponse({ type: PaginatedInvoicesDto })
  list(@Query() query: ListInvoicesDto): Promise<PaginatedInvoicesDto> {
    return this.invoicesService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail by id' })
  @ApiOkResponse({ type: InvoiceDetailDto })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InvoiceDetailDto> {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice (status Draft, totals computed server-side)' })
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Invoice number already exists' })
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceDetailDto> {
    return this.invoicesService.create(dto, user.id);
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsOnOrAfter } from '../../common/validators/is-on-or-after.validator';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

/**
 * Create-invoice payload. The persisted totals and status are always computed
 * server-side (FR-19, BL-07); clients cannot set them.
 *
 * Only one line item is required for this assessment, but the DTO/schema model
 * a one-to-many so multiple items are possible later (FR-15).
 */
export class CreateInvoiceDto {
  // ── Customer (embedded snapshot) ───────────────────────────────────────────
  @ApiProperty({ example: 'Paul' })
  @IsString()
  @IsNotEmpty({ message: 'customerFullname should not be empty' })
  @MaxLength(255)
  customerFullname!: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  @IsEmail({}, { message: 'customerEmail must be a valid email address' })
  @MaxLength(255)
  customerEmail!: string;

  @ApiPropertyOptional({ example: '947717364111' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerMobile?: string;

  @ApiPropertyOptional({ example: 'Singapore' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerAddress?: string;

  // ── Invoice ────────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'IV1780488206995', description: 'Unique, user-provided' })
  @IsString()
  @IsNotEmpty({ message: 'invoiceNumber should not be empty' })
  @MaxLength(100)
  invoiceNumber!: string;

  @ApiPropertyOptional({ example: '#5721662', description: 'Optional external reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceReference?: string;

  @ApiProperty({ example: '2026-06-03', description: 'YYYY-MM-DD' })
  @IsDateString({}, { message: 'invoiceDate must be a valid date (YYYY-MM-DD)' })
  invoiceDate!: string;

  @ApiProperty({ example: '2026-07-03', description: 'YYYY-MM-DD, must be ≥ invoiceDate' })
  @IsDateString({}, { message: 'dueDate must be a valid date (YYYY-MM-DD)' })
  @IsOnOrAfter('invoiceDate')
  dueDate!: string;

  @ApiProperty({ example: 'AUD', description: 'ISO 4217 currency code' })
  @IsString()
  @IsNotEmpty({ message: 'currency should not be empty' })
  @MaxLength(10)
  currency!: string;

  @ApiPropertyOptional({ example: 'AU$', description: 'Display symbol' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencySymbol?: string;

  @ApiPropertyOptional({ example: 'Invoice is issued to Kanglee' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Bounded to the persisted column precision Decimal(5,2) → max 999.99 (Sec L5).
  @ApiPropertyOptional({ example: 10, default: 10, description: 'Tax percent, non-negative' })
  @IsOptional()
  @IsNumber({}, { message: 'taxPercent must be a number' })
  @Min(0, { message: 'taxPercent must not be negative' })
  @Max(999.99, { message: 'taxPercent must not exceed 999.99' })
  taxPercent?: number;

  // Bounded to the persisted column precision Decimal(12,2) → max 9999999999.99 (Sec L5).
  @ApiPropertyOptional({ example: 20, default: 0, description: 'Absolute discount amount' })
  @IsOptional()
  @IsNumber({}, { message: 'discount must be a number' })
  @Min(0, { message: 'discount must not be negative' })
  @Max(9999999999.99, { message: 'discount must not exceed 9999999999.99' })
  discount?: number;

  @ApiProperty({ type: [CreateInvoiceItemDto], description: 'Line items (one required)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'at least one item is required' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}

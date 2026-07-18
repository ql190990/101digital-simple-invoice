import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Max, MaxLength } from 'class-validator';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Honda RC150', description: 'Line item name' })
  @IsString()
  @IsNotEmpty({ message: 'item name should not be empty' })
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 2, description: 'Quantity — positive integer' })
  @IsInt({ message: 'quantity must be an integer' })
  @IsPositive({ message: 'quantity must be a positive integer' })
  quantity!: number;

  // Bounded to the persisted column precision Decimal(12,2) → max 9999999999.99 (Sec L5).
  @ApiProperty({ example: 1000, description: 'Unit rate — positive number' })
  @IsNumber({}, { message: 'rate must be a number' })
  @IsPositive({ message: 'rate must be a positive number' })
  @Max(9999999999.99, { message: 'rate must not exceed 9999999999.99' })
  rate!: number;
}

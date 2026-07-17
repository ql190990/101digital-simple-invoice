import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

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

  @ApiProperty({ example: 1000, description: 'Unit rate — positive number' })
  @IsPositive({ message: 'rate must be a positive number' })
  rate!: number;
}

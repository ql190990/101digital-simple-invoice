import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error envelope (ERR-02) emitted by {@link AllExceptionsFilter} for
 * every non-validation error: `{ statusCode, message, error }`. Exposed as a
 * Swagger DTO so `/api/docs` documents a real error schema (Doc L2).
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({
    description:
      'Human-readable message, or an array of field-level messages for validation errors',
    example: 'Invoice not found',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Not Found', description: 'HTTP reason phrase for the status code' })
  error!: string;
}

/**
 * Validation-error variant (400 / ERR-01). Nest's global `ValidationPipe` emits
 * `message` as an array of field-level errors, so it is typed as `string[]` here.
 */
export class ValidationErrorDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ type: [String], example: ['invoiceNumber should not be empty'] })
  message!: string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}

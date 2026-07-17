import { Decimal } from 'decimal.js';

/**
 * Serialise a Prisma/decimal.js Decimal (or numeric-like value) to a JS number
 * with exactly 2 decimal places (ADR A12). Used by response DTO mappers so money
 * is always presented consistently on the wire.
 */
export function toMoneyNumber(value: Decimal.Value | { toString(): string }): number {
  return Number(new Decimal(value.toString()).toFixed(2));
}

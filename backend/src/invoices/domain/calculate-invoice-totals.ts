import { Decimal } from 'decimal.js';

/**
 * A single line item as consumed by the totals calculation. `quantity` is a
 * positive integer; `rate` may be any Decimal-compatible value (ADR A12: money
 * never touches JS floats).
 */
export interface LineItemInput {
  quantity: number;
  rate: Decimal.Value;
}

export interface CalculateInvoiceTotalsInput {
  items: LineItemInput[];
  /** Tax percentage, e.g. 10 for 10%. Non-negative. Defaults handled by caller. */
  taxPercent: Decimal.Value;
  /** Absolute discount amount (ADR A5), non-negative. */
  discount: Decimal.Value;
  /** Amount already paid. Defaults to 0 for new invoices. */
  totalPaid?: Decimal.Value;
}

export interface InvoiceTotals {
  subTotal: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  balanceAmount: Decimal;
}

const TWO_DP = 2;

/** Round a Decimal to 2 decimal places, half-up. */
export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(TWO_DP, Decimal.ROUND_HALF_UP);
}

/**
 * Pure, dependency-free invoice totals calculation (server-side authority).
 *
 *   subTotal      = Σ(quantity × rate)
 *   taxAmount     = round2(subTotal × taxPercent / 100)
 *   totalAmount   = subTotal + taxAmount − discount
 *   balanceAmount = totalAmount − totalPaid
 *
 * taxAmount is rounded to 2 dp BEFORE being summed into totalAmount (ADR A12) so
 * the persisted figures are internally consistent to the cent.
 */
export function calculateInvoiceTotals(input: CalculateInvoiceTotalsInput): InvoiceTotals {
  const subTotal = input.items.reduce(
    (acc, item) => acc.plus(new Decimal(item.rate).times(item.quantity)),
    new Decimal(0),
  );

  const taxPercent = new Decimal(input.taxPercent);
  const discount = new Decimal(input.discount);
  const totalPaid = new Decimal(input.totalPaid ?? 0);

  const subTotalRounded = round2(subTotal);
  const taxAmount = round2(subTotalRounded.times(taxPercent).dividedBy(100));
  const totalAmount = round2(subTotalRounded.plus(taxAmount).minus(discount));
  const balanceAmount = round2(totalAmount.minus(totalPaid));

  return {
    subTotal: subTotalRounded,
    taxAmount,
    totalAmount,
    balanceAmount,
  };
}

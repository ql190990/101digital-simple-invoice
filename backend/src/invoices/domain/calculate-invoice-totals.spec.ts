import { Decimal } from 'decimal.js';
import { calculateInvoiceTotals } from './calculate-invoice-totals';

describe('calculateInvoiceTotals', () => {
  it('computes the Appendix A anchor figures exactly', () => {
    // subtotal 2000, tax 10% = 200, discount 20 (absolute) → total 2180.
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 2, rate: 1000 }],
      taxPercent: 10,
      discount: 20,
      totalPaid: 1451.34,
    });

    expect(totals.subTotal.toFixed(2)).toBe('2000.00');
    expect(totals.taxAmount.toFixed(2)).toBe('200.00');
    expect(totals.totalAmount.toFixed(2)).toBe('2180.00');
    expect(totals.balanceAmount.toFixed(2)).toBe('728.66');
  });

  it('defaults the tax to 10% when passed 10', () => {
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 100 }],
      taxPercent: 10,
      discount: 0,
    });
    expect(totals.taxAmount.toFixed(2)).toBe('10.00');
    expect(totals.totalAmount.toFixed(2)).toBe('110.00');
  });

  it('handles zero discount and zero tax', () => {
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 3, rate: 50 }],
      taxPercent: 0,
      discount: 0,
    });
    expect(totals.subTotal.toFixed(2)).toBe('150.00');
    expect(totals.taxAmount.toFixed(2)).toBe('0.00');
    expect(totals.totalAmount.toFixed(2)).toBe('150.00');
    expect(totals.balanceAmount.toFixed(2)).toBe('150.00');
  });

  it('rounds tax to 2dp (half-up) before summing into the total', () => {
    // subtotal 100.00 × 8.755% = 8.755 → rounds to 8.76 (not 8.75).
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 100 }],
      taxPercent: 8.755,
      discount: 0,
    });
    expect(totals.taxAmount.toFixed(2)).toBe('8.76');
    expect(totals.totalAmount.toFixed(2)).toBe('108.76');
  });

  it('rounds half-up DOWN when the third decimal is < 5 (complements the 8.755 case)', () => {
    // subtotal 100.00 × 8.754% = 8.754 → rounds DOWN to 8.75.
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 100 }],
      taxPercent: 8.754,
      discount: 0,
    });
    expect(totals.taxAmount.toFixed(2)).toBe('8.75');
    expect(totals.totalAmount.toFixed(2)).toBe('108.75');
  });

  it('yields a negative balance when overpaid (totalPaid > totalAmount)', () => {
    // No tax, no discount: total 100; paying 150 leaves an intended −50 balance.
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 100 }],
      taxPercent: 0,
      discount: 0,
      totalPaid: 150,
    });
    expect(totals.totalAmount.toFixed(2)).toBe('100.00');
    expect(totals.balanceAmount.toFixed(2)).toBe('-50.00');
  });

  it('lets the total go negative when the discount exceeds subtotal + tax', () => {
    // subtotal 100 + 10 tax − 200 discount = −90 (intended; validation is a DTO concern).
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 100 }],
      taxPercent: 10,
      discount: 200,
    });
    expect(totals.totalAmount.toFixed(2)).toBe('-90.00');
    expect(totals.balanceAmount.toFixed(2)).toBe('-90.00');
  });

  it('sums multiple line items into the subtotal', () => {
    const totals = calculateInvoiceTotals({
      items: [
        { quantity: 2, rate: 1000 },
        { quantity: 1, rate: 500.5 },
      ],
      taxPercent: 10,
      discount: 0,
    });
    expect(totals.subTotal.toFixed(2)).toBe('2500.50');
    expect(totals.taxAmount.toFixed(2)).toBe('250.05');
    expect(totals.totalAmount.toFixed(2)).toBe('2750.55');
  });

  it('never uses float arithmetic (0.1 + 0.2 problem)', () => {
    const totals = calculateInvoiceTotals({
      items: [
        { quantity: 1, rate: new Decimal('0.1') },
        { quantity: 1, rate: new Decimal('0.2') },
      ],
      taxPercent: 0,
      discount: 0,
    });
    expect(totals.subTotal.toFixed(2)).toBe('0.30');
  });

  it('subtracts an absolute discount from the total', () => {
    const totals = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 1000 }],
      taxPercent: 10,
      discount: 100,
    });
    // 1000 + 100 tax − 100 discount = 1000.
    expect(totals.totalAmount.toFixed(2)).toBe('1000.00');
  });
});

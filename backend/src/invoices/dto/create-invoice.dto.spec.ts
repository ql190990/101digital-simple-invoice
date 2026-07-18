import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';

/**
 * Fast, DB-free validation tests for the create-invoice payload (Test M3).
 * They drive the real `class-validator` rules via
 * `validateSync(plainToInstance(...))` and assert each guard rejects malformed
 * input — the pure, millisecond equivalent of the e2e bad-request cases.
 */
describe('CreateInvoiceDto validation', () => {
  const validPayload = {
    customerFullname: 'Paul',
    customerEmail: 'paul@101digital.io',
    invoiceNumber: 'IV-NEW-1',
    invoiceDate: '2026-06-03',
    dueDate: '2026-07-03',
    currency: 'AUD',
    taxPercent: 10,
    discount: 20,
    items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
  };

  /** Collect every property (including nested item fields) that failed validation. */
  function failedProps(errors: ValidationError[]): string[] {
    const out: string[] = [];
    for (const error of errors) {
      if (error.constraints) out.push(error.property);
      if (error.children?.length) out.push(...failedProps(error.children));
    }
    return out;
  }

  function validate(payload: Record<string, unknown>): ValidationError[] {
    return validateSync(plainToInstance(CreateInvoiceDto, payload));
  }

  it('accepts a well-formed payload', () => {
    expect(validate(validPayload)).toHaveLength(0);
  });

  it('rejects a negative item rate', () => {
    const errors = validate({
      ...validPayload,
      items: [{ name: 'Honda RC150', quantity: 2, rate: -5 }],
    });
    expect(failedProps(errors)).toContain('rate');
  });

  it('rejects a zero quantity', () => {
    const errors = validate({
      ...validPayload,
      items: [{ name: 'Honda RC150', quantity: 0, rate: 1000 }],
    });
    expect(failedProps(errors)).toContain('quantity');
  });

  it('rejects a malformed email', () => {
    const errors = validate({ ...validPayload, customerEmail: 'not-an-email' });
    expect(failedProps(errors)).toContain('customerEmail');
  });

  it('rejects an empty items array', () => {
    const errors = validate({ ...validPayload, items: [] });
    expect(failedProps(errors)).toContain('items');
  });

  it('rejects a taxPercent above the Decimal(5,2) ceiling (999.99)', () => {
    const errors = validate({ ...validPayload, taxPercent: 1000 });
    expect(failedProps(errors)).toContain('taxPercent');
  });
});

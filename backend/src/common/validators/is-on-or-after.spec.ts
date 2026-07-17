import { validateSync } from 'class-validator';
import { IsDateString } from 'class-validator';
import { IsOnOrAfter } from './is-on-or-after.validator';

class DateRange {
  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  @IsOnOrAfter('invoiceDate')
  dueDate!: string;
}

function build(invoiceDate: string, dueDate: string): DateRange {
  const obj = new DateRange();
  obj.invoiceDate = invoiceDate;
  obj.dueDate = dueDate;
  return obj;
}

describe('IsOnOrAfter (dueDate ≥ invoiceDate)', () => {
  it('passes when dueDate is after invoiceDate', () => {
    expect(validateSync(build('2026-06-03', '2026-07-03'))).toHaveLength(0);
  });

  it('passes when dueDate equals invoiceDate (boundary)', () => {
    expect(validateSync(build('2026-06-03', '2026-06-03'))).toHaveLength(0);
  });

  it('fails when dueDate is before invoiceDate', () => {
    const errors = validateSync(build('2026-07-03', '2026-06-03'));
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('dueDate');
  });

  it('emits the spec-shaped error message', () => {
    const errors = validateSync(build('2026-07-03', '2026-06-03'));
    const messages = Object.values(errors[0].constraints ?? {});
    expect(messages).toContain('dueDate must be on or after invoiceDate');
  });
});

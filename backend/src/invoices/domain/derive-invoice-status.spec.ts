import { deriveInvoiceStatus } from './derive-invoice-status';

const today = new Date(Date.UTC(2026, 6, 17)); // 2026-07-17

function daysFromToday(days: number): Date {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

describe('deriveInvoiceStatus', () => {
  it('returns Overdue when a non-Paid invoice is due yesterday', () => {
    expect(deriveInvoiceStatus('Pending', daysFromToday(-1), today)).toBe('Overdue');
    expect(deriveInvoiceStatus('Draft', daysFromToday(-1), today)).toBe('Overdue');
  });

  it('does NOT return Overdue when due exactly today (boundary)', () => {
    expect(deriveInvoiceStatus('Pending', daysFromToday(0), today)).toBe('Pending');
    expect(deriveInvoiceStatus('Draft', daysFromToday(0), today)).toBe('Draft');
  });

  it('does NOT return Overdue when due in the future', () => {
    expect(deriveInvoiceStatus('Pending', daysFromToday(5), today)).toBe('Pending');
    expect(deriveInvoiceStatus('Draft', daysFromToday(5), today)).toBe('Draft');
  });

  it('never returns Overdue for a Paid invoice, even when past due', () => {
    expect(deriveInvoiceStatus('Paid', daysFromToday(-30), today)).toBe('Paid');
    expect(deriveInvoiceStatus('Paid', daysFromToday(0), today)).toBe('Paid');
    expect(deriveInvoiceStatus('Paid', daysFromToday(30), today)).toBe('Paid');
  });

  it('preserves the persisted status when not overdue', () => {
    expect(deriveInvoiceStatus('Draft', daysFromToday(1), today)).toBe('Draft');
    expect(deriveInvoiceStatus('Pending', daysFromToday(1), today)).toBe('Pending');
  });

  it('is timezone-safe: compares dates only, ignoring wall-clock time', () => {
    // A due date "yesterday" with a late-day timestamp is still overdue.
    const dueLateYesterday = new Date(Date.UTC(2026, 6, 16, 23, 59, 59));
    expect(deriveInvoiceStatus('Pending', dueLateYesterday, today)).toBe('Overdue');
  });
});

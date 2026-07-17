import { EffectiveStatus, PersistedStatus } from './invoice-status';

/**
 * Derive the effective invoice status from the persisted status and due date.
 *
 * Rule (ADR A3):
 *   status !== 'Paid' AND dueDate < today  → 'Overdue'
 *   otherwise                              → persisted status
 *
 * All three arguments are treated as calendar dates only. Callers must pass a
 * `today` that is already normalised to the configured timezone's date (ADR A4).
 * Comparison is done on the `YYYY-MM-DD` string so wall-clock time never leaks in
 * and there is no off-by-one at midnight.
 */
export function deriveInvoiceStatus(
  status: PersistedStatus,
  dueDate: Date,
  today: Date,
): EffectiveStatus {
  if (status === 'Paid') {
    return 'Paid';
  }

  const dueDay = toDateKey(dueDate);
  const todayKey = toDateKey(today);

  // Due strictly before today → overdue. Due today is NOT overdue (boundary).
  if (dueDay < todayKey) {
    return 'Overdue';
  }

  return status;
}

/** Normalise a Date to a `YYYY-MM-DD` string using its UTC components. */
export function toDateKey(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

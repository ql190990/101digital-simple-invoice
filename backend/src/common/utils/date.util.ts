/**
 * Return "today" as a UTC-midnight Date whose calendar components (Y/M/D) are the
 * current date in the given IANA timezone (ADR A4). Because the domain function
 * and SQL predicate both read the date components, storing them at UTC midnight
 * keeps comparisons purely date-based with no wall-clock drift.
 *
 * @param timeZone IANA zone, e.g. "UTC", "Australia/Sydney".
 * @param now      Injectable clock for testing; defaults to the real now.
 */
export function getTodayInTimezone(timeZone: string, now: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA yields YYYY-MM-DD.
  const [year, month, day] = formatter.format(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a Date as a `YYYY-MM-DD` string from its UTC components. */
export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

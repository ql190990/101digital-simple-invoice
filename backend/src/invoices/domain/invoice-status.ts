/**
 * Persisted invoice statuses. `Overdue` is intentionally NOT part of this set —
 * it is derived at read time and never written to the database (ADR A3).
 */
export const PERSISTED_STATUSES = ['Draft', 'Pending', 'Paid'] as const;
export type PersistedStatus = (typeof PERSISTED_STATUSES)[number];

/**
 * Effective (display) status, including the derived `Overdue` value.
 */
export const EFFECTIVE_STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue'] as const;
export type EffectiveStatus = (typeof EFFECTIVE_STATUSES)[number];

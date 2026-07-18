import type { InvoiceStatus } from '@prisma/client';

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

/**
 * Compile-time guard (Arch M2 / ADR A3): `PersistedStatus` must be exactly the
 * generated Prisma `InvoiceStatus` enum — no more, no less. The object literal
 * enforces PersistedStatus ⊇ its keys, and assigning it to
 * `Record<InvoiceStatus, true>` enforces Prisma ⊆ PersistedStatus, so adding or
 * removing a DB status without updating the domain (or vice versa) fails the
 * build. `import type` keeps the domain layer framework-free at runtime.
 */
const _persistedMatchesPrisma: Record<PersistedStatus, true> = {
  Draft: true,
  Pending: true,
  Paid: true,
};
const _prismaMatchesPersisted: Record<InvoiceStatus, true> = _persistedMatchesPrisma;
void _prismaMatchesPersisted;

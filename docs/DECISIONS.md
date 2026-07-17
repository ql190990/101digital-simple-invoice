# SimpleInvoice — Design Decisions & ADRs (Phase 2)

Lightweight ADR format. Each decision: context → decision → rationale. The `A#`
records are the pre-resolved spec ambiguities; the `D#` records are additional
engineering decisions.

---

## Spec ambiguities (resolved)

### A1 — Paging response shape (spec contradicts itself)
- **Context**: §2.3.1 specifies `{ data, paging: { page, pageSize, total } }`.
  Appendix A shows `{ pageNumber, pageSize, totalRecords }`.
- **Decision**: Implement `{ data, paging: { page, pageSize, total } }`. §2.3.1 is
  the normative API contract; Appendix A is only a seed-data reference.
- **Rationale**: The endpoint specification governs the wire contract; the appendix
  is illustrative sample data, not an interface definition.

### A2 — No global API prefix
- **Context**: Endpoint table uses `/auth/login`, `/invoices` (no `/api`), but
  Swagger must live at `/api/docs`.
- **Decision**: Do **not** call `app.setGlobalPrefix('api')`. Mount Swagger via
  `SwaggerModule.setup('api/docs', …)`. Both `/invoices` and `/api/docs` resolve.
- **Rationale**: Honour the literal endpoint paths; Swagger path is independent.

### A3 — Overdue: derived status, filterable & sortable
- **Context**: Overdue is never persisted but must be filterable/displayable.
- **Decision**: Implement derivation twice, consistently: (1) pure domain function
  `deriveInvoiceStatus(status, dueDate, today)` for every response; (2) a matching
  SQL predicate for `?status=` (server-side pagination forbids in-memory filtering).
  Filter on **effective** status:
  - `Overdue` → `status != 'Paid' AND dueDate < today`
  - `Draft`   → `status = 'Draft'   AND dueDate >= today`
  - `Pending` → `status = 'Pending' AND dueDate >= today`
  - `Paid`    → `status = 'Paid'`
- **Rationale**: What the user filters must match what the user sees.

### A4 — "today" is a date in one explicit timezone
- **Context**: `dueDate` is a `DATE`; comparing to wall-clock time is a bug source.
- **Decision**: Compare dates only. Configurable `APP_TIMEZONE` (default `UTC`); the
  same reference date feeds both the domain function and the SQL predicate. Boundary
  unit-tested: due **today** is not overdue; due **yesterday** is.
- **Rationale**: Deterministic, timezone-correct comparisons; no off-by-one at
  midnight.

### A5 — `taxPercent` persisted; discount is absolute
- **Context**: Form accepts `tax (%)`, but reference model stores only `totalTax`.
- **Decision**: Add `taxPercent numeric(5,2)` default `10.00`. `discount` /
  `totalDiscount` is an **absolute amount** (Appendix A: subtotal 2000, tax 200 =
  10%; discount 20 = absolute).
- **Rationale**: Storing only the amount loses the user's input and makes the record
  non-reproducible.

### A6 — Customer embedded on Invoice (immutable snapshot)
- **Context**: Spec allows embedded columns or a separate `customers` table.
- **Decision**: Embed `customerFullname/Email/Mobile/Address` on Invoice.
- **Rationale**: An invoice is a legal/accounting record that must capture customer
  details **as they were at issue time**. A normalised FK would let a later customer
  edit silently mutate historical invoices. This is a deliberate immutable-snapshot
  decision, not a shortcut.

### A7 — Appendix A anchor record
- **Context**: The anchor shows `status: "Overdue"`, but seeding Overdue is forbidden.
- **Decision**: Seed it with persisted status **`Pending`** and its original past
  `dueDate` (2026-07-03) so Overdue is **derived** — proving derivation works. Reuse
  its `createdBy` UUID `ad1e0902-1928-4345-b513-60c86c94fc91` as the default user's id.
- **Rationale**: Keeps referential integrity and demonstrates the derived-status path.

### A8 — Fields absent from the data model
- **Context**: Appendix A has `type: "INVOICE"` and `invoiceGrossTotal` not in §3.1;
  `invoiceGrossTotal` duplicates `invoiceSubTotal`.
- **Decision**: Omit both from the schema.
- **Rationale**: Avoid redundant/undefined columns; single source of truth for
  subtotal.

### A9 — Seed dates relative to current date
- **Context**: Fixed dates would make Overdue only appear in July 2026.
- **Decision**: Keep the anchor fixed; generate remaining records with due dates
  spread across past/future so all four statuses are represented whenever run.
- **Rationale**: The dataset must be meaningful regardless of when the reviewer runs.

### A10 — Duplicate invoice number → 409
- **Context**: Uniqueness could be enforced with a read-then-write check (racy).
- **Decision**: DB unique constraint; catch Prisma `P2002` → `409 Conflict` with the
  standard error envelope.
- **Rationale**: A duplicate is a state conflict, not malformed input; and the DB
  constraint is race-free.

### A11 — JWT client-side storage
- **Context**: `localStorage` vs `httpOnly` cookie.
- **Decision**: Store the token in `localStorage`.
- **Rationale/tradeoff**: `localStorage` is XSS-readable; an `httpOnly` cookie is more
  secure but requires same-site/CSRF handling that is disproportionate for this
  assessment's scope. Documented honestly in README.

### A12 — Money never touches JS floats
- **Context**: Float arithmetic corrupts money.
- **Decision**: All monetary columns `numeric(12,2)`; use Prisma `Decimal`
  (decimal.js) for every calculation. Round `taxAmount` to 2dp **before** summing
  into `totalAmount`. Serialise decimals to JSON as numbers with exactly 2dp.
- **Rationale**: Correctness and reproducibility of financial figures.

---

## Engineering decisions

### D1 — npm workspaces monorepo
Zero-friction setup vs Turborepo/Nx overhead; the reviewer runs `npm install` once at
the root. Matches the prompt's "keep setup friction at zero".

### D2 — Repository layer isolates Prisma
Only `*.repository.ts` imports `PrismaService`. Controllers/services stay
persistence-agnostic and unit-testable.

### D3 — Pure domain functions, no framework deps
`calculateInvoiceTotals` and `deriveInvoiceStatus` are pure and dependency-free, so
the highest-value business rules are trivially testable without mocks or a DB.

### D4 — Schema-validated env, fail fast
`@nestjs/config` + a validation schema; the app refuses to boot on missing/invalid
env, surfacing misconfiguration immediately instead of at first request.

### D5 — nginx reverse proxy for `/api`
The SPA uses a relative base URL (`/api`); nginx proxies to the backend. This
sidesteps CORS entirely in the container setup and avoids Vite build-time env baking
of an absolute API URL.

### D6 — Seed strategy: truncate-then-insert
Idempotent by truncating invoice/item/user tables (respecting FKs) then inserting.
Simpler and more predictable than per-row upserts for a demo dataset; documented.

### D7 — Fixed-seed deterministic RNG
A small seeded PRNG (mulberry32) drives generated data so the dataset is identical
across runs and machines.

### D8 — Global `ValidationPipe` with whitelist + transform
`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — strips unknown
fields and coerces query strings to typed DTOs. The default pipe already emits the
required 400 envelope.

### D9 — Throttler scoped to login
Global-friendly `ThrottlerModule` with a stricter `@Throttle` on `POST /auth/login`
to blunt credential-stuffing without hampering normal API use.

### D10 — Correlation ID middleware + structured logs
Each request gets an `x-correlation-id` (incoming or generated); a Nest logger
includes it, aiding traceability. Cheap, visible value-add.

### D11 — Consciously excluded (scope discipline)
No refresh tokens, RBAC, multi-tenancy, i18n, password policies, or MFA. These are
out of the spec; adding them would dilute focus. Excluded deliberately.

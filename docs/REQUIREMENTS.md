# SimpleInvoice — Requirements Checklist (Phase 0)

Extracted verbatim from `Assessment_Fullstack_v3.0.0.pdf` plus the normative build
prompt. Each item has a stable ID and is verified in Phase 4. Status legend:
`[ ]` pending · `[x]` implemented & verified.

The "Verified by" column is filled during Phase 4 with the file/function that
satisfies the requirement.

---

## FR — Functional Requirements

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| FR-01 | Login screen with email + password fields | §2.1.1 | [x] | `frontend/src/pages/LoginPage.tsx` |
| FR-02 | Client-side validation on auth inputs | §2.1.1 | [x] | `LoginPage.tsx` (RHF+Zod `loginSchema`) |
| FR-03 | Server-side validation on auth inputs | §2.1.1 | [x] | `auth/dto/login.dto.ts` + global `ValidationPipe` |
| FR-04 | Issue JWT on success, store client-side | §2.1.1 | [x] | `auth/auth.service.ts`, `frontend/src/lib/auth.ts` (localStorage) |
| FR-05 | Protected routes guarded; unauth → redirect to Login | §2.1.1 | [x] | `frontend/src/routes/ProtectedRoute.tsx`, `JwtAuthGuard` |
| FR-06 | Invoice List is default home after login | §2.1.2 | [x] | `frontend/src/routes/AppRoutes.tsx` (`/` → list) |
| FR-07 | List shows: Invoice Number, Customer Name, Invoice Date, Due Date, Total Amount, Status | §2.1.2 | [x] | `frontend/src/pages/InvoiceListPage.tsx` |
| FR-08 | Search by invoice number OR customer name; case-insensitive, partial | §2.1.2 | [x] | `invoices.repository.ts` (`ILIKE`), `keyword` param |
| FR-09 | Filter by status: Draft, Pending, Paid, Overdue | §2.1.2 | [x] | `invoices.repository.ts` status predicate |
| FR-10 | Sort by invoiceDate, dueDate, totalAmount (ASC/DESC) | §2.1.2 | [x] | `list-invoices.dto.ts` enum + repository |
| FR-11 | Server-side pagination, configurable page size | §2.1.2 | [x] | `invoices.repository.ts` (`skip`/`take`) |
| FR-12 | Invoice Detail: invoice info, customer info, line items, subtotal, tax, discount, total, outstanding balance, status | §2.1.3 | [x] | `frontend/src/pages/InvoiceDetailPage.tsx`, `GET /invoices/:id` |
| FR-13 | Detail values reflect stored record exactly | §2.1.3 | [x] | `invoices.service.ts` maps persisted values |
| FR-14 | Create Invoice form with exactly one line item | §2.1.4 | [x] | `frontend/src/pages/CreateInvoicePage.tsx` |
| FR-15 | Data model supports multiple items (one-to-many) | §2.1.4 | [x] | `prisma/schema.prisma` `InvoiceItem[]` |
| FR-16 | New invoices created with status Draft | §2.1.4 | [x] | `invoices.service.ts` |
| FR-17 | Invoice number user-provided, unique | §2.1.4 | [x] | schema `@unique` + `create` DTO |
| FR-18 | On success: success notification + redirect to list | §2.1.4 | [x] | `CreateInvoicePage.tsx` (toast + navigate) |
| FR-19 | Total amount calculated by backend, never frontend | §2.1.4 / §2.3.2 | [x] | `invoices/domain/calculate-invoice-totals.ts` |
| FR-20 | Fully responsive (mobile + desktop) | §2.2 | [x] | Tailwind responsive classes |

## VR — Validation Rules (Create Invoice)

| ID | Field / Rule | Source | Status | Verified by |
|----|--------------|--------|--------|-------------|
| VR-01 | Customer name: required, non-empty | §2.1.4 | [x] | `create-invoice.dto.ts` |
| VR-02 | Customer email: required, valid email | §2.1.4 | [x] | `create-invoice.dto.ts` `@IsEmail` |
| VR-03 | Customer mobile: optional | §2.1.4 | [x] | `create-invoice.dto.ts` `@IsOptional` |
| VR-04 | Customer address: optional | §2.1.4 | [x] | `create-invoice.dto.ts` `@IsOptional` |
| VR-05 | Invoice number: required, unique | §2.1.4 | [x] | DTO + DB unique + P2002→409 |
| VR-06 | Invoice date: required, valid date | §2.1.4 | [x] | `create-invoice.dto.ts` `@IsDateString` |
| VR-07 | Due date: required, on/after invoice date | §2.1.4 | [x] | `IsOnOrAfter` custom validator |
| VR-08 | Currency: required | §2.1.4 | [x] | `create-invoice.dto.ts` |
| VR-09 | Item name: required | §2.1.4 | [x] | `create-invoice-item.dto.ts` |
| VR-10 | Item quantity: required, positive integer | §2.1.4 | [x] | `@IsInt` `@IsPositive` + CHECK |
| VR-11 | Item rate: required, positive number | §2.1.4 | [x] | `@IsPositive` + CHECK |
| VR-12 | Tax (%): non-negative, defaults to 10 | §2.1.4 | [x] | `@Min(0)` default 10 |
| VR-13 | Discount: optional, non-negative, defaults to 0 | §2.1.4 | [x] | `@Min(0)` default 0 |

## API — API Contract

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| API-01 | POST `/auth/login` (public) → JWT | §2.3.1 | [x] | `auth.controller.ts` |
| API-02 | GET `/auth/me` (auth) → current user | §2.3.1 | [x] | `auth.controller.ts` |
| API-03 | GET `/invoices` (auth) list w/ search/filter/sort/pagination | §2.3.1 | [x] | `invoices.controller.ts` |
| API-04 | GET `/invoices/:id` (auth) → detail | §2.3.1 | [x] | `invoices.controller.ts` |
| API-05 | POST `/invoices` (auth) → create | §2.3.1 | [x] | `invoices.controller.ts` |
| API-06 | Query params: page, pageSize, sortBy, ordering, status, keyword, fromDate, toDate | §2.3.1 | [x] | `list-invoices.dto.ts` |
| API-07 | Response shape `{ data, paging: { page, pageSize, total } }` | §2.3.1 / A1 | [x] | `paginated-invoices.dto.ts` |
| API-08 | Defaults: page=1, pageSize=10, sortBy=invoiceDate, ordering=DESC | prompt §5 | [x] | `list-invoices.dto.ts` |
| API-09 | Clamp pageSize to max 100 | prompt §5 | [x] | `list-invoices.dto.ts` (`@Max(100)`) |
| API-10 | sortBy/ordering whitelisted via enum, never interpolated | prompt §5 | [x] | enum + Prisma orderBy object |
| API-11 | Swagger UI at `/api/docs` | §2.3.8 | [x] | `main.ts` `SwaggerModule.setup('api/docs')` |
| API-12 | No global `/api` prefix on routes | A2 | [x] | `main.ts` (no `setGlobalPrefix`) |
| API-13 | All endpoints documented (payloads, params, schemas, codes) | §2.3.8 | [x] | Swagger decorators |

## BL — Business Logic

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| BL-01 | `subTotal = quantity × rate` | §2.3.2 | [x] | `calculate-invoice-totals.ts` |
| BL-02 | `taxAmount = subTotal × (taxPercent/100)` | §2.3.2 | [x] | `calculate-invoice-totals.ts` |
| BL-03 | `totalAmount = subTotal + taxAmount − discount` | §2.3.2 | [x] | `calculate-invoice-totals.ts` |
| BL-04 | `balanceAmount = totalAmount − totalPaid` | §2.3.2 | [x] | `calculate-invoice-totals.ts` |
| BL-05 | Invoice numbers unique — DB level | §2.3.2 | [x] | schema `@unique` |
| BL-06 | dueDate ≥ invoiceDate — server-side | §2.3.2 | [x] | `IsOnOrAfter` validator |
| BL-07 | New invoices → status Draft, totalPaid=0 | §2.3.2 | [x] | `invoices.service.ts` |
| BL-08 | Overdue derived at read time (not persisted) | §2.3.2 / A3 | [x] | `derive-invoice-status.ts` |
| BL-09 | DB stores only Draft/Pending/Paid | §2.3.2 | [x] | Prisma enum |
| BL-10 | Overdue filterable via SQL predicate on effective status | A3 | [x] | `invoices.repository.ts` |
| BL-11 | "today" is a DATE in configurable APP_TIMEZONE | A4 | [x] | `date.util.ts` `getTodayInTimezone` |
| BL-12 | taxPercent persisted (A5) | A5 | [x] | schema `taxPercent numeric(5,2)` |
| BL-13 | discount is absolute amount, not percent | A5 | [x] | domain + docs |
| BL-14 | Money uses Decimal, never JS float; round tax to 2dp before summing | A12 | [x] | `calculate-invoice-totals.ts` (decimal.js) |
| BL-15 | Decimals serialised as numbers w/ 2dp | A12 | [x] | response DTO mapper |

## DB — Data Model / Database

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| DB-01 | Invoice table w/ all §3.1 fields | §3.1 | [x] | `schema.prisma` |
| DB-02 | Customer embedded on Invoice (A6) | A6 | [x] | `schema.prisma` customer* columns |
| DB-03 | InvoiceItem one-to-many, cascade delete | §3.3 | [x] | `schema.prisma` |
| DB-04 | User table w/ §3.4 fields | §3.4 | [x] | `schema.prisma` |
| DB-05 | UNIQUE on invoiceNumber and User.email | §6 | [x] | `@unique` |
| DB-06 | B-tree indexes on invoiceDate, dueDate, totalAmount | §6 | [x] | `@@index` |
| DB-07 | Composite index (status, dueDate) | §6 | [x] | `@@index([status, dueDate])` |
| DB-08 | pg_trgm + GIN indexes on invoiceNumber, customerFullname | §6 | [x] | migration `enable_pg_trgm` |
| DB-09 | CHECK: dueDate≥invoiceDate, quantity>0, rate>0, taxPercent≥0, totalDiscount≥0 | §6 | [x] | migration CHECK constraints |
| DB-10 | Omit `type` and `invoiceGrossTotal` (A8) | A8 | [x] | schema (absent), documented |

## AUTH — Authentication & Security

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| AUTH-01 | JWT access token auth | §2.3.3 | [x] | `auth` module, `JwtStrategy` |
| AUTH-02 | All /invoices guarded by JWT guard | §2.3.3 | [x] | `@UseGuards(JwtAuthGuard)` |
| AUTH-03 | Token TTL via env, default 3600s | §2.3.3 | [x] | `JWT_EXPIRES_IN` config |
| AUTH-04 | ≥1 default user seeded, documented | §2.3.3 | [x] | `seed.ts`, README |
| AUTH-05 | bcrypt cost ≥ 10 | prompt §7 | [x] | `auth.service.ts` (12) |
| AUTH-06 | passwordHash never returned | prompt §7 | [x] | response DTOs |
| AUTH-07 | Login doesn't reveal if email exists | prompt §7 | [x] | generic `Invalid credentials` |
| AUTH-08 | Duplicate invoice number → 409 (A10) | A10 | [x] | P2002 → ConflictException |
| AUTH-09 | JWT stored in localStorage (A11) | A11 | [x] | `frontend/src/lib/auth.ts` |
| AUTH-10 | Helmet + CORS allow-list from env | prompt §7 | [x] | `main.ts` |
| AUTH-11 | Rate-limit /auth/login (throttler) | prompt §7 | [x] | `@nestjs/throttler` on login |

## ERR — Error Handling

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| ERR-01 | Validation error envelope `{statusCode:400, message:[...], error:"Bad Request"}` | §2.3.5 | [x] | ValidationPipe default |
| ERR-02 | Global exception filter `{statusCode, message, error}` | §2.3.6 | [x] | `all-exceptions.filter.ts` |

## TEST — Testing

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| TEST-01 | Unit test: invoice total calculations (rounding, zero discount, default tax) | §2.3.7 | [x] | `calculate-invoice-totals.spec.ts` |
| TEST-02 | Unit test: Overdue derivation incl. boundary (today≠overdue, yesterday=overdue, Paid never) | §2.3.7 / A4 | [x] | `derive-invoice-status.spec.ts` |
| TEST-03 | Unit test: due-date validation logic | §2.3.7 | [x] | `is-on-or-after.spec.ts` |
| TEST-04 | Unit test: unique invoice number enforcement | §2.3.7 | [x] | `invoices.service.spec.ts` |
| TEST-05 | ≥1 e2e: login → create → appears in list w/ correct totals + Draft | §2.3.7 | [x] | `test/invoices.e2e-spec.ts` |
| TEST-06 | Frontend: login flow | §2.2 | [x] | `LoginPage.test.tsx` |
| TEST-07 | Frontend: list search/filter/sort/pagination | §2.2 | [x] | `InvoiceListPage.test.tsx` |
| TEST-08 | Frontend: create-invoice validation | §2.2 | [x] | `CreateInvoicePage.test.tsx` |

## PKG — Packaging / Docker / Env

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| PKG-01 | `docker compose up` → full working seeded app, zero extra steps | §2.4.2 / §8 | [x] | `docker-compose.yml` + entrypoint |
| PKG-02 | Three services (db, backend, frontend), own Dockerfiles | §8 | [x] | Dockerfiles |
| PKG-03 | Multi-stage builds; backend non-root node:20-alpine | §8 | [x] | `backend/Dockerfile` |
| PKG-04 | Frontend built w/ Vite, served by nginx | §8 | [x] | `frontend/Dockerfile` + `nginx.conf` |
| PKG-05 | db healthcheck (pg_isready); backend depends_on service_healthy | §8 | [x] | `docker-compose.yml` |
| PKG-06 | Backend entrypoint: migrate deploy then seed when SEED_ON_BOOT | §8 | [x] | `backend/docker-entrypoint.sh` |
| PKG-07 | nginx reverse-proxies /api → backend (relative base URL) | §8 | [x] | `frontend/nginx.conf` |
| PKG-08 | Named volume for Postgres | §8 | [x] | `docker-compose.yml` |
| PKG-09 | `.env.example` complete, no real values | §2.4.3 | [x] | `.env.example` |
| PKG-10 | Env validated at startup, fail loudly | §8 | [x] | `config/env.validation.ts` |
| PKG-11 | Zero hardcoded secrets | §2.4.3 | [x] | grep verification |
| PKG-12 | `npm run seed` works standalone, idempotent | §2.3.4 / §9 | [x] | root `package.json` → backend seed |
| PKG-13 | Root scripts: seed, dev, test, lint, typecheck | prompt §2 | [x] | root `package.json` |

## SEED — Seeding

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| SEED-01 | Runnable via `npm run seed` | §2.3.4 | [x] | root + backend package.json |
| SEED-02 | Idempotent (no crash on rerun) | §9 | [x] | `seed.ts` (truncate then insert) |
| SEED-03 | Appendix A record as anchor, status Pending (A7) | A7 | [x] | `seed.ts` |
| SEED-04 | Reuse createdBy UUID as default user id (A7) | A7 | [x] | `seed.ts` |
| SEED-05 | 20–50 additional invoices, mixed statuses/dates/amounts/customers | §2.3.4 / §9 | [x] | `seed.ts` |
| SEED-06 | ≥3 pages at default size; some past-due non-Paid (Overdue naturally) | §9 | [x] | `seed.ts` (40 records) |
| SEED-07 | Fixed random seed for reproducibility | §9 | [x] | `seed.ts` seeded RNG |
| SEED-08 | Dates generated relative to current date (A9) | A9 | [x] | `seed.ts` |

## VA — Value Add

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| VA-01 | GitHub Actions CI: lint → typecheck → test → docker build | prompt §7 | [x] | `.github/workflows/ci.yml` |
| VA-02 | GET `/health` with DB connectivity check | prompt §7 | [x] | `health.controller.ts` |
| VA-03 | Structured logging w/ request correlation ID | prompt §7 | [x] | `correlation-id.middleware.ts` + logger |
| VA-04 | ESLint + Prettier both workspaces, passing | prompt §7 | [x] | config files |
| VA-05 | Test coverage reported in terminal | prompt §7 | [x] | jest `--coverage`, vitest coverage |
| VA-06 | docs/DECISIONS.md as ADRs | prompt §7 | [x] | `docs/DECISIONS.md` |

## DOC — Documentation

| ID | Requirement | Source | Status | Verified by |
|----|-------------|--------|--------|-------------|
| DOC-01 | Project overview + architecture diagram | §4.2 / §10 | [x] | `README.md` |
| DOC-02 | Run instructions with AND without Docker | §4.2 / §10 | [x] | `README.md` |
| DOC-03 | Default login credentials, prominent | §4.2 / §10 | [x] | `README.md` |
| DOC-04 | Seed script instructions | §4.2 / §10 | [x] | `README.md` |
| DOC-05 | Assumptions & design decisions (A1–A12) | §4.2 / §10 | [x] | `README.md` + `DECISIONS.md` |
| DOC-06 | Known limitations / excluded features | §4.2 / §10 | [x] | `README.md` |
| DOC-07 | Ports table, env var table, API summary, Swagger link, test instructions | §10 | [x] | `README.md` |

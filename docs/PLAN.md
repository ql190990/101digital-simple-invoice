# SimpleInvoice — Implementation Plan (Phase 1)

## 1. Architecture overview

A three-tier monorepo (npm workspaces): a React SPA, a NestJS REST API, and a
PostgreSQL 16 database. In Docker, nginx serves the built SPA and reverse-proxies
`/api/*` to the backend, so the browser only ever talks to one origin.

```
┌──────────────┐     /api/* proxy      ┌──────────────┐   Prisma    ┌──────────────┐
│  Browser     │ ───────────────────►  │  NestJS API  │ ─────────►  │ PostgreSQL16 │
│  React SPA   │  (served by nginx)    │  (node:20)   │  (pg_trgm)  │              │
└──────────────┘                       └──────────────┘             └──────────────┘
        ▲   static assets (nginx)              │
        └─────────────────────────────────────┘
```

### Backend layering (clean architecture)

```
Controller  (HTTP + Swagger only, no business logic, no Prisma)
   │
Service     (orchestration: validate, call domain, call repository, map DTOs)
   │
Repository  (Prisma data access ONLY — the only layer importing PrismaService)
   │
Prisma / PostgreSQL

Domain      (pure functions, zero deps: calculateInvoiceTotals, deriveInvoiceStatus)
            ← called by Service, unit-tested with no mocks/DB
```

## 2. Folder structure

```
simple-invoice/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/            # env schema + validation
│   │   ├── common/            # filters, interceptors, middleware, decorators, utils
│   │   ├── prisma/            # PrismaModule + PrismaService
│   │   ├── health/            # GET /health
│   │   ├── auth/              # controller, service, strategy, guard, dto
│   │   ├── users/             # users repository/service (used by auth)
│   │   ├── invoices/
│   │   │   ├── domain/        # pure business functions + specs
│   │   │   ├── dto/
│   │   │   ├── invoices.controller.ts
│   │   │   ├── invoices.service.ts
│   │   │   └── invoices.repository.ts
│   │   └── database/seed/     # seed.ts
│   ├── test/                  # e2e
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── main.tsx, App.tsx
│   │   ├── lib/               # api client, auth storage, query client
│   │   ├── routes/            # AppRoutes, ProtectedRoute
│   │   ├── components/        # UI primitives, layout
│   │   ├── features/invoices/ # api hooks, types, schemas
│   │   ├── pages/             # Login, InvoiceList, InvoiceDetail, CreateInvoice
│   │   └── test/              # setup, MSW handlers
│   ├── Dockerfile
│   └── nginx.conf
├── docs/  (REQUIREMENTS, PLAN, DECISIONS)
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
├── package.json  (workspaces root)
└── README.md
```

## 3. Data model (Prisma)

- **User**: `id` (uuid pk), `email` (unique), `passwordHash`, `fullname`, `createdAt`.
- **Invoice**: `invoiceId` (uuid pk), `invoiceNumber` (unique), `invoiceReference?`,
  `invoiceDate` (date), `dueDate` (date), `currency`, `currencySymbol`, `description?`,
  `status` (enum Draft|Pending|Paid), embedded customer (`customerFullname`,
  `customerEmail`, `customerMobile?`, `customerAddress?`), money columns as
  `Decimal(12,2)`: `invoiceSubTotal`, `totalTax`, `totalDiscount`, `totalAmount`,
  `totalPaid`, `balanceAmount`; `taxPercent Decimal(5,2)` (A5); `createdAt`,
  `createdBy` (uuid fk → User).
- **InvoiceItem**: `id` (uuid pk), `invoiceId` (fk, cascade delete), `name`,
  `quantity` (int), `rate` (Decimal(12,2)).

### Indexes & constraints
- UNIQUE: `Invoice.invoiceNumber`, `User.email`.
- B-tree: `invoiceDate`, `dueDate`, `totalAmount`.
- Composite: `(status, dueDate)` for the Overdue predicate.
- GIN + `pg_trgm` on `invoiceNumber`, `customerFullname` (raw SQL migration).
- CHECK: `dueDate >= invoiceDate`, `quantity > 0`, `rate > 0`, `taxPercent >= 0`,
  `totalDiscount >= 0` (raw SQL migration).

## 4. API contract

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| POST | `/auth/login` | ✗ | `{email, password}` | `{accessToken, tokenType, expiresIn, user}` |
| GET | `/auth/me` | ✓ | — | `UserDto` |
| GET | `/invoices` | ✓ | query params | `{data: InvoiceListItemDto[], paging}` |
| GET | `/invoices/:id` | ✓ | — | `InvoiceDetailDto` |
| POST | `/invoices` | ✓ | `CreateInvoiceDto` | `InvoiceDetailDto` (201) |
| GET | `/health` | ✗ | — | `{status, db}` |

Query defaults: `page=1, pageSize=10 (max 100), sortBy=invoiceDate, ordering=DESC`.
Status filter uses the derived-status SQL predicate (A3). Pagination server-side.

## 5. Business logic (domain, pure, Decimal)

```
subTotal      = Σ(item.quantity × item.rate)
taxAmount     = round2(subTotal × taxPercent / 100)
totalAmount   = subTotal + taxAmount − discount
balanceAmount = totalAmount − totalPaid
deriveInvoiceStatus(status, dueDate, today):
   status !== 'Paid' && dueDate < today  → 'Overdue'
   else                                   → status
```

## 6. Test strategy

- **Backend unit** (Jest): domain totals (rounding, zero discount, default tax),
  overdue derivation + boundary, due-date validator, unique-number handling
  (service maps P2002 → 409).
- **Backend e2e** (Jest + Supertest, real Nest app + test Postgres): login →
  create invoice → GET list shows it with computed totals + Draft; plus 401 without
  token, 409 duplicate number, 400 dueDate<invoiceDate.
- **Frontend** (Vitest + RTL + MSW): login flow, list search/filter/sort/pagination,
  create-invoice validation.

## 7. Ordered task list (mapped to requirement IDs)

1. Root workspace scaffold, `.env.example`, tsconfig, eslint/prettier → PKG-09..13, VA-04
2. Prisma schema + migrations (indexes, pg_trgm, checks) → DB-01..10
3. Config + env validation + Prisma module + health → PKG-10, VA-02
4. Domain functions + unit tests → BL-01..15, TEST-01..03
5. Users + Auth (JWT, guard, bcrypt, throttler) → AUTH-01..11, API-01..02
6. Invoices (dto, repository, service, controller, Swagger) → FR-06..19, API-03..13, BL, ERR
7. Global exception filter, correlation-id logging → ERR-02, VA-03
8. Seed script → SEED-01..08, AUTH-04
9. Backend e2e → TEST-04..05
10. Frontend (Vite, router, auth, pages, forms) → FR-01..20, VR-01..13
11. Frontend tests → TEST-06..08
12. Dockerfiles, nginx, compose, entrypoint → PKG-01..08
13. CI workflow → VA-01
14. README → DOC-01..07
15. Phase 4 verification pass.

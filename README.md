# SimpleInvoice

A full-stack invoicing application built for the **101 Digital** Full-Stack Engineer
assessment. React + TypeScript frontend, NestJS + TypeScript REST API, PostgreSQL 16,
Prisma, JWT auth — packaged so a reviewer can go from `git clone` to a working,
seeded, logged-in app in one command.

> **TL;DR for reviewers**
>
> ```bash
> docker compose up --build
> ```
>
> Then open **http://localhost:8080** and log in with:
>
> | Email                    | Password       |
> | ------------------------ | -------------- |
> | `reviewer@101digital.io` | `Password123!` |
>
> Swagger API docs: **http://localhost:3000/api/docs**

---

## 1. Overview & architecture

Three services orchestrated by Docker Compose. In the container setup, **nginx serves
the built SPA and reverse-proxies `/api/*` to the backend**, so the browser talks to a
single origin (no CORS, no build-time API URL baking).

```
                         ┌─────────────────────────────────────────────┐
                         │                Browser (SPA)                 │
                         │        React + Vite + Tailwind + RQ          │
                         └───────────────┬─────────────────────────────┘
                                         │  http://localhost:8080
                                         ▼
                         ┌─────────────────────────────────────────────┐
                         │  frontend container (nginx :80)              │
                         │  • serves static SPA bundle                  │
                         │  • proxies /api/*  ──────────────┐           │
                         └──────────────────────────────────┼──────────┘
                                                            ▼
                         ┌─────────────────────────────────────────────┐
                         │  backend container (NestJS :3000)            │
                         │  Controller → Service → Repository → Prisma  │
                         │  Pure domain fns: totals, overdue derivation │
                         │  JWT auth · ValidationPipe · Swagger /api/docs│
                         └──────────────────────────────────┬──────────┘
                                                            ▼
                         ┌─────────────────────────────────────────────┐
                         │  db container (postgres:16-alpine)           │
                         │  pg_trgm GIN search · CHECK constraints       │
                         │  named volume: postgres_data                 │
                         └─────────────────────────────────────────────┘
```

### Backend layering (clean architecture)

- **Controller** — HTTP routing + Swagger decorators only. No business logic, never
  imports Prisma.
- **Service** — orchestration: validates, calls pure domain functions, calls the
  repository, maps DTOs.
- **Repository** — the _only_ layer that imports `PrismaService`. Owns query
  translation (search / filter / sort / pagination).
- **Domain** (`backend/src/invoices/domain/`) — pure, dependency-free functions
  `calculateInvoiceTotals()` and `deriveInvoiceStatus()`. These hold the core
  business rules and are unit-tested with no mocks and no DB.

### Tech stack

| Layer    | Technology                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript, Vite, React Router v6, TanStack Query, React Hook Form + Zod, Tailwind CSS                       |
| Backend  | NestJS 10 + TypeScript, Prisma 5, `class-validator`/`class-transformer`, `@nestjs/swagger`, `@nestjs/throttler`, Helmet |
| Database | PostgreSQL 16 (`pg_trgm` extension)                                                                                     |
| Auth     | JWT access token (Passport), bcrypt password hashing                                                                    |
| Tests    | Backend: Jest + Supertest · Frontend: Vitest + React Testing Library + MSW                                              |
| Monorepo | npm workspaces                                                                                                          |

---

## 2. Running the app

### Option A — Docker (recommended, zero manual steps)

Requires Docker + Docker Compose.

```bash
git clone <repo-url> simple-invoice
cd simple-invoice
docker compose up --build
```

This will:

1. Start PostgreSQL and wait until it is **healthy** (`pg_isready`).
2. Start the backend, which on boot runs `prisma migrate deploy` and then **seeds**
   the database (because `SEED_ON_BOOT=true` is the compose default). You do **not**
   need to run any migrate/seed command yourself — see §4 for re-seeding on demand.
3. Start nginx serving the SPA and proxying `/api`.

Open **http://localhost:8080** and log in.

> No `.env` file is required for Docker — `docker-compose.yml` ships sensible
> defaults for every value. To override anything (ports, JWT secret, timezone),
> copy `.env.example` to `.env` and Compose will pick it up.

> ⚠️ **Security note — the compose `JWT_SECRET` is a non-secret DEMO placeholder.**
> `docker-compose.yml` defaults `JWT_SECRET` to a value committed in this repo, so a
> zero-config `docker compose up` works for local review. Because it is public, anyone
> could forge valid tokens with it — it is safe **only** for a throwaway local demo. For
> any shared, hosted, or real deployment you **must** set a real random secret, e.g.
> `JWT_SECRET=$(openssl rand -hex 32)` in your `.env` (the same applies to
> `POSTGRES_PASSWORD` and `SEED_USER_PASSWORD`).

To stop: `docker compose down` (add `-v` to also drop the database volume).

### Option B — Local development (without Docker)

Requires Node 20+ and a local PostgreSQL 16 (with permission to create the
`pg_trgm` extension).

```bash
# 1. Install all workspaces
npm install

# 2. Create the database role + database (skip if they already exist)
sudo -u postgres psql -c "CREATE USER simpleinvoice WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE simpleinvoice OWNER simpleinvoice;"

# 3. Configure environment
cp .env.example .env
#    Edit .env: set DATABASE_URL (matching the password above) and JWT_SECRET (>= 32 chars).

# 4. Generate the Prisma client, apply migrations, and seed
npm run prisma:generate
npm run prisma:migrate        # prisma migrate deploy
npm run seed

# 5. Run backend + frontend together
npm run dev
```

- Backend: http://localhost:3000 (Swagger at http://localhost:3000/api/docs)
- Frontend (Vite dev server): http://localhost:5173 — it proxies `/api` to the
  backend, so log in there with the same credentials.

> **Run the Prisma scripts from the repo root.** The Prisma CLI loads `.env` from the
> working directory, so the root scripts above pass `--schema backend/prisma/schema.prisma`
> and pick up the root `.env`. Running `npm run prisma:migrate --workspace backend`
> instead sets the working directory to `backend/`, where there is no `.env`, and Prisma
> fails with `P1012: Environment variable not found: DATABASE_URL`.

> **The Dockerised database is not reachable from the host.** `docker-compose.yml`
> deliberately does not publish port 5432 (see §8), so these local commands talk to a
> PostgreSQL installed on your machine — not the compose one. To point them at the compose
> database instead, uncomment the `ports:` mapping on the `db` service (use a free host
> port, e.g. `POSTGRES_PORT=5433`, if 5432 is already taken) and update `DATABASE_URL`.

---

## 3. Default login credentials

| Email                    | Password       |
| ------------------------ | -------------- |
| `reviewer@101digital.io` | `Password123!` |

Seeded by `backend/prisma/seed.ts`. Configurable via `SEED_USER_EMAIL` /
`SEED_USER_PASSWORD` env vars.

---

## 4. Seeding the database

The seed inserts **1 default user**, the **Appendix A anchor invoice**, and **40 generated
invoices** (41 total → ≥3 pages at the default page size of 10) with a balanced spread of
statuses, dates, amounts, currencies and customers. A **fixed random seed** (mulberry32)
makes the dataset reproducible across machines.

### With Docker (the normal path)

**Nothing to run — it seeds itself.** `docker compose up` executes `prisma migrate deploy`
and then the seed on backend boot (`SEED_ON_BOOT=true` is the compose default):

```bash
docker compose up -d --build
docker compose logs backend | grep -i seed     # verify
```

On boot the seed runs in **seed-if-empty** mode: if the database already holds data it logs
`Database already seeded — skipping (SEED_IF_EMPTY)` and does **not** truncate. Restarting a
container therefore never wipes your data.

**Re-seed on demand** (destructive: truncates, then re-inserts the fixture set):

```bash
docker compose exec backend node dist-seed/prisma/seed.js
```

**Start completely fresh** (drops the volume, so the next boot seeds again):

```bash
docker compose down -v && docker compose up -d
```

### Without Docker (local PostgreSQL)

Run from the **repo root** so the Prisma CLI picks up the root `.env` (see §2 Option B):

```bash
npm run seed
```

- **Idempotent**: truncates `invoice_items`, `invoices` and `users`
  (`TRUNCATE ... RESTART IDENTITY CASCADE`) then re-inserts, so re-running never trips a
  unique constraint (ADR D6). Unlike the boot path it always reseeds — that is what makes it
  usable as a "reset my data" command.
- Requires migrations to have been applied first (`npm run prisma:migrate`).

---

## 5. Assumptions & design decisions

Full rationale in [`docs/DECISIONS.md`](docs/DECISIONS.md). The most important ones:

- **A1 — Paging shape (spec contradicts itself).** §2.3.1 specifies
  `{ data, paging: { page, pageSize, total } }`; Appendix A shows
  `{ pageNumber, pageSize, totalRecords }`. **§2.3.1 wins** — it is the normative API
  contract; Appendix A is only a seed-data reference. Implemented `page`/`pageSize`/`total`.
- **A3 — Overdue is derived, but filterable & sortable.** `Overdue` is never stored;
  the DB holds only `Draft`/`Pending`/`Paid`. It is derived at read time and the
  `?status=` filter uses a matching SQL predicate on the **effective** status, so what
  you filter always equals what you see:
  - `Overdue` → `status != 'Paid' AND dueDate < today`
  - `Draft` → `status = 'Draft'  AND dueDate >= today`
  - `Pending` → `status = 'Pending' AND dueDate >= today`
  - `Paid` → `status = 'Paid'`
- **A2 — No global `/api` prefix.** Routes are `/auth/login`, `/invoices`, … ; Swagger
  is mounted separately at `/api/docs`.
- **A4 — "today" is a date in one timezone.** `dueDate` is a `DATE`; comparisons are
  date-only, using a configurable `APP_TIMEZONE` (default `UTC`) shared by the domain
  function and the SQL predicate. Boundary tested: due **today** is _not_ overdue.
- **A5 — `taxPercent` persisted; discount is absolute.** Added a `taxPercent`
  column so the input isn't lost. `discount`/`totalDiscount` is an absolute amount
  (Appendix A: subtotal 2000, tax 200 = 10%, discount 20 = absolute).
- **A6 — Customer embedded on Invoice (immutable snapshot).** An invoice is a
  legal/accounting record; it must capture customer details as they were at issue
  time. A normalised FK would let a later customer edit mutate historical invoices.
- **A7 — Appendix A anchor** seeded as persisted `Pending` with its original past due
  date (2026-07-03) so `Overdue` is _derived_ (proving derivation works). Its
  `createdBy` UUID is reused as the default user's id.
- **A8 — Omitted fields.** `type: "INVOICE"` and `invoiceGrossTotal` (duplicates the
  subtotal) are not modelled.
- **A9 — Seed dates are relative to "today"** so all four statuses appear whenever the
  reviewer runs it.
- **A10 — Duplicate invoice number → `409 Conflict`** via a DB unique constraint
  (race-free), mapping Prisma `P2002` to 409 (not 400 — it's a state conflict).
- **A11 — JWT in `localStorage`.** _Tradeoff:_ `localStorage` is XSS-readable; an
  `httpOnly` cookie would be more secure but requires same-site/CSRF handling that is
  disproportionate for this scope. Chosen consciously and documented.
- **A12 — Money never touches JS floats.** All money is `numeric(12,2)` and computed
  with `decimal.js` (Prisma `Decimal`); tax is rounded to 2dp before summing into the
  total; decimals serialise as 2dp numbers.

---

## 6. Known limitations / consciously excluded

Scope discipline is deliberate — the following are **intentionally out of scope** (not
in the spec), and were excluded to keep the solution focused:

- **No refresh tokens / token rotation.** Single short-lived access token only.
- **No RBAC / roles / multi-tenancy.** Any authenticated user can read/create invoices.
- **No password policy or MFA** (explicitly out of scope per the spec).
- **No invoice edit/delete/payment endpoints.** The spec covers list/detail/create only.
- **Create form supports exactly one line item** (per spec), though the schema and API
  model a real one-to-many so multiple items are trivial to add later.
- **JWT in `localStorage`** — see A11 tradeoff above.
- **Password hashing uses `bcryptjs` (pure JS)** — a deliberate choice for portability (no
  native addon / build toolchain needed); it is ~3× slower than the native `bcrypt` binding,
  which is immaterial at this login volume.
- **Seed uses truncate-then-insert**, so running it drops existing invoice/user data by
  design (fine for a demo dataset; not a production migration strategy). On container boot the
  seed runs in seed-if-empty mode and skips a populated DB (see §9 `SEED_ON_BOOT`).
- **No production TLS / secrets manager** — secrets come from env; in a real deployment
  these would come from a managed secret store.

---

## 7. API summary

Base URL: backend root (no `/api` prefix on routes). Full interactive docs at
**`/api/docs`**.

| Method | Endpoint        | Auth | Description                                         |
| ------ | --------------- | ---- | --------------------------------------------------- |
| POST   | `/auth/login`   | ✗    | Authenticate, return JWT                            |
| GET    | `/auth/me`      | ✓    | Current authenticated user                          |
| GET    | `/invoices`     | ✓    | List (search, filter, sort, pagination)             |
| GET    | `/invoices/:id` | ✓    | Invoice detail                                      |
| POST   | `/invoices`     | ✓    | Create invoice (Draft, totals computed server-side) |
| GET    | `/health`       | ✗    | Health check with DB connectivity                   |

The Invoice List screen exposes a **Rows per page** selector (10 / 25 / 50 / 100) that drives
the `pageSize` query param, so the page size is configurable from the UI as well as the API
(spec §2.1.2); changing it returns to page 1.

**`GET /invoices` query params:** `page` (default 1), `pageSize` (default 10, max 100),
`sortBy` (`invoiceDate`|`dueDate`|`totalAmount`, default `invoiceDate`), `ordering`
(`ASC`|`DESC`, default `DESC`), `status` (`Draft`|`Pending`|`Paid`|`Overdue`),
`keyword` (partial, case-insensitive on invoice number OR customer name), `fromDate`,
`toDate` (`YYYY-MM-DD`).

**Response shape:**

```json
{ "data": [ ... ], "paging": { "page": 1, "pageSize": 10, "total": 41 } }
```

**Business logic (server-side only):**

```
subTotal      = Σ(quantity × rate)
taxAmount     = round2(subTotal × taxPercent / 100)
totalAmount   = subTotal + taxAmount − discount
balanceAmount = totalAmount − totalPaid
```

**Error envelopes:**

```json
// Validation (400)
{ "statusCode": 400, "message": ["dueDate must be on or after invoiceDate"], "error": "Bad Request" }
// Other errors (e.g. 404)
{ "statusCode": 404, "message": "Invoice not found", "error": "Not Found" }
```

**`GET /health` response** (public; runs a real `SELECT 1` DB connectivity check):

| Field       | Type                   | Description                                    |
| ----------- | ---------------------- | ---------------------------------------------- |
| `status`    | `"ok"` \| `"degraded"` | `ok` when the DB check passed, else `degraded` |
| `db`        | `"up"` \| `"down"`     | Database reachability                          |
| `uptime`    | number                 | Process uptime in whole seconds                |
| `timestamp` | string                 | ISO-8601 timestamp of the check                |

```json
{ "status": "ok", "db": "up", "uptime": 123, "timestamp": "2026-07-18T00:00:00.000Z" }
```

---

## 8. Exposed ports

| Service          | Container port | Host port (default) | Env override    |
| ---------------- | -------------- | ------------------- | --------------- |
| Frontend (nginx) | 80             | **8080**            | `FRONTEND_PORT` |
| Backend (NestJS) | 3000           | **3000**            | `BACKEND_PORT`  |
| PostgreSQL       | 5432           | **5432**            | `POSTGRES_PORT` |

---

## 9. Environment variables

Copy `.env.example` → `.env`. All keys are documented there; summary:

| Variable                                                        | Default                     | Purpose                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                                                      | `development`               | Runtime mode (`development` \| `production` \| `test`); compose sets `production`                                                                                                                                                    |
| `DATABASE_URL`                                                  | —                           | Prisma Postgres connection string                                                                                                                                                                                                    |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`           | `simpleinvoice`             | DB credentials (compose)                                                                                                                                                                                                             |
| `BACKEND_PORT`                                                  | `3000`                      | API port                                                                                                                                                                                                                             |
| `JWT_SECRET`                                                    | —                           | JWT signing secret (**required**, ≥16 chars)                                                                                                                                                                                         |
| `JWT_EXPIRES_IN`                                                | `3600`                      | Access-token TTL (seconds)                                                                                                                                                                                                           |
| `APP_TIMEZONE`                                                  | `UTC`                       | Timezone for date-only "today" comparisons                                                                                                                                                                                           |
| `ENABLE_SWAGGER`                                                | `true`                      | Gates the interactive API docs at `/api/docs`; set `false` to disable                                                                                                                                                                |
| `CORS_ORIGINS`                                                  | localhost list              | CORS allow-list (unused behind nginx proxy)                                                                                                                                                                                          |
| `MAX_PAGE_SIZE`                                                 | `100`                       | Server-side pagination clamp (1–100). Can only **lower** the ceiling — the DTO already rejects `pageSize > 100` with a 400.                                                                                                          |
| `THROTTLE_TTL` / `THROTTLE_LIMIT`                               | `60` / `100`                | Global rate limiting window/limit (login is stricter: 5/60s)                                                                                                                                                                         |
| `SEED_ON_BOOT`                                                  | `false` (`true` in compose) | Migrate + seed on backend startup. On boot the seed runs in **seed-if-empty** mode — it skips (no truncate) when the DB already holds data, so container restarts don't wipe it. A manual `npm run seed` still truncates and reseeds |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_FULLNAME` | reviewer account            | Default seeded user                                                                                                                                                                                                                  |
| `FRONTEND_PORT`                                                 | `8080`                      | SPA port                                                                                                                                                                                                                             |
| `VITE_API_BASE_URL`                                             | `/api`                      | SPA API base (relative; proxied)                                                                                                                                                                                                     |

The backend **validates env at startup** (`backend/src/config/env.validation.ts`) and
fails loudly with a clear message if anything required is missing or malformed.

---

## 10. Running the tests

```bash
# Everything (backend unit + frontend)
npm run test

# Backend unit tests (Jest, with coverage)
npm run test --workspace backend

# Backend e2e (needs a reachable Postgres via DATABASE_URL + migrations applied)
npm run test:e2e --workspace backend

# Frontend tests (Vitest + RTL + MSW, with coverage)
npm run test --workspace frontend

# Full browser E2E (Playwright) — brings up the Docker stack, runs desktop + mobile flows
# Uses the system Google Chrome; needs Docker. Set E2E_KEEP_STACK=1 to keep the stack up.
npm run test:e2e:pw

# Lint & typecheck across both workspaces
npm run lint
npm run typecheck
```

**What's covered**

- **Domain**: invoice total calculations (rounding, zero discount, default tax, multi-item,
  float-safety), overdue derivation incl. the today/yesterday boundary and "Paid is never
  Overdue", due-date validation.
- **Service**: server-side total computation, unique-number → 409 mapping, not-found,
  pageSize clamping, response envelope.
- **E2E** (Supertest against a real Nest app): 401 without token → login (no
  `passwordHash` leaked) → create invoice (Draft, server totals) → appears in list →
  duplicate number 409 → `dueDate < invoiceDate` 400 with the spec message.
- **Frontend**: login flow (client validation, success redirect, generic error), list
  (search / filter / sort / pagination / navigation), create-invoice validation + live
  totals preview.
- **Browser E2E** (Playwright, `e2e/`): 23 tests across desktop + mobile viewports driving
  the real Docker stack through nginx — auth (redirect/validation/invalid/valid), list
  (search / derived-Overdue filter / sort / server pagination / row→detail), detail
  (fields + totals + not-found), create (validation / server-computed success / duplicate
  409). Logs in once via `storageState` to respect the login rate limit.

---

## 11. Value-add (beyond the spec)

- **GitHub Actions CI** (`.github/workflows/ci.yml`): install → lint → typecheck →
  unit + e2e + frontend tests (with a Postgres service) → build → docker image builds.
- **Playwright browser E2E** (`e2e/`): 23 desktop + mobile tests driving the full Docker
  stack end-to-end (see §10). Run with `npm run test:e2e:pw`.
- **`GET /health`** with a real DB connectivity check.
- **Request correlation IDs** + structured request logging.
- **ESLint + Prettier** configured and passing across both workspaces.
- **Test coverage** reported in the terminal (Jest `--coverage`, Vitest v8 coverage).
- **`pg_trgm` GIN indexes** so `ILIKE` keyword search is index-backed, plus B-tree /
  composite indexes on sort/filter columns and **CHECK constraints** as defence in depth.
- **Lightweight ADRs** in `docs/DECISIONS.md`; a full traceability checklist in
  `docs/REQUIREMENTS.md`; a plan in `docs/PLAN.md`.

---

## 12. Project structure

```
simple-invoice/
├── backend/                # NestJS API
│   ├── prisma/             # schema, migrations, seed.ts
│   └── src/
│       ├── auth/           # JWT login, guard, strategy
│       ├── invoices/       # controller/service/repository + domain/ + dto/
│       ├── users/          # user data access
│       ├── common/         # filter, interceptor, middleware, validators, utils
│       ├── config/         # env schema validation
│       ├── health/         # GET /health
│       └── prisma/         # PrismaModule/Service
├── frontend/               # React SPA (Vite) + nginx.conf + Dockerfile
│   └── src/                # pages, features, components, context, lib, test (MSW)
├── docs/                   # REQUIREMENTS.md, PLAN.md, DECISIONS.md
├── .github/workflows/      # CI
├── docker-compose.yml
├── .env.example
└── package.json            # npm workspaces root
```

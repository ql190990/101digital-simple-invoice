/**
 * Idempotent database seed (SEED-01..08).
 *
 * Strategy (ADR D6): truncate invoice/item/user tables, then insert. A fixed RNG
 * (ADR D7) makes the generated dataset reproducible. The Appendix A record is the
 * anchor, seeded with persisted status `Pending` and its original past due date so
 * that `Overdue` is derived (ADR A7). Additional records spread due dates around
 * the current date (ADR A9) so all four effective statuses appear whenever run.
 *
 * Runnable standalone via `npm run seed` (spec requirement).
 */
import { InvoiceStatus, Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { calculateInvoiceTotals } from '../src/invoices/domain/calculate-invoice-totals';

const prisma = new PrismaClient();

// Anchor identifiers from Appendix A (ADR A7).
const ANCHOR_USER_ID = 'ad1e0902-1928-4345-b513-60c86c94fc91';
const ANCHOR_INVOICE_ID = '099ca7da-a290-40fa-93b9-1c43ae7bb887';
const BCRYPT_COST = 12;
const GENERATED_COUNT = 40;

/** Deterministic PRNG (mulberry32) for reproducible seed data (ADR D7). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260717);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** UTC-midnight Date offset by `days` from today. */
function dateFromToday(days: number): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + days);
  return base;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: 'AUD', symbol: 'AU$' },
  { code: 'USD', symbol: 'US$' },
  { code: 'GBP', symbol: '£' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'EUR', symbol: '€' },
];

const CUSTOMERS: { fullname: string; email: string; mobile: string; address: string }[] = [
  {
    fullname: 'Paul Anderson',
    email: 'paul@example.com',
    mobile: '947717364111',
    address: 'Singapore',
  },
  {
    fullname: 'Aisha Rahman',
    email: 'aisha@example.com',
    mobile: '60123456789',
    address: 'Kuala Lumpur, Malaysia',
  },
  {
    fullname: 'Liam Nguyen',
    email: 'liam@example.com',
    mobile: '84987654321',
    address: 'Ho Chi Minh City, Vietnam',
  },
  {
    fullname: 'Emma Watson',
    email: 'emma@example.com',
    mobile: '447700900123',
    address: 'London, UK',
  },
  {
    fullname: 'Noah Smith',
    email: 'noah@example.com',
    mobile: '14155550100',
    address: 'San Francisco, USA',
  },
  {
    fullname: 'Olivia Brown',
    email: 'olivia@example.com',
    mobile: '61412345678',
    address: 'Sydney, Australia',
  },
  {
    fullname: 'Kanglee Tan',
    email: 'kanglee@example.com',
    mobile: '6591234567',
    address: 'Singapore',
  },
  {
    fullname: 'Sofia Garcia',
    email: 'sofia@example.com',
    mobile: '34600123456',
    address: 'Madrid, Spain',
  },
  {
    fullname: 'Arjun Patel',
    email: 'arjun@example.com',
    mobile: '919812345678',
    address: 'Mumbai, India',
  },
  { fullname: 'Mia Chen', email: 'mia@example.com', mobile: '85291234567', address: 'Hong Kong' },
];

const ITEM_NAMES = [
  'Honda RC150',
  'Consulting Services',
  'Web Design Package',
  'Cloud Hosting (annual)',
  'Marketing Retainer',
  'Hardware Bundle',
  'Software License',
  'Training Workshop',
  'Maintenance Plan',
  'Office Supplies',
];

const PERSISTED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.Draft,
  InvoiceStatus.Pending,
  InvoiceStatus.Paid,
];

async function truncate(): Promise<void> {
  // Order respects FKs; RESTART IDENTITY + CASCADE keeps it clean and repeatable.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "invoice_items", "invoices", "users" RESTART IDENTITY CASCADE;',
  );
}

async function seedUser(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL ?? 'reviewer@101digital.io';
  const password = process.env.SEED_USER_PASSWORD ?? 'Password123!';
  const fullname = process.env.SEED_USER_FULLNAME ?? 'Reviewer';
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  // Reuse Appendix A createdBy UUID as the default user id (ADR A7).
  await prisma.user.create({
    data: { id: ANCHOR_USER_ID, email, passwordHash, fullname },
  });
  // eslint-disable-next-line no-console
  console.log(`Seeded user: ${email} (password documented in README)`);
}

async function seedAnchorInvoice(): Promise<void> {
  // Appendix A record. Persisted as Pending with its original past due date so
  // Overdue is derived at read time (ADR A7).
  const items = [{ name: 'Honda RC150', quantity: 2, rate: new Prisma.Decimal(1000) }];
  const totals = calculateInvoiceTotals({
    items: items.map((i) => ({ quantity: i.quantity, rate: i.rate.toString() })),
    taxPercent: 10,
    discount: 20,
    totalPaid: 1451.34,
  });

  await prisma.invoice.create({
    data: {
      invoiceId: ANCHOR_INVOICE_ID,
      invoiceNumber: 'IV1780488206995',
      invoiceReference: '#5721662',
      invoiceDate: new Date('2026-06-03T00:00:00.000Z'),
      dueDate: new Date('2026-07-03T00:00:00.000Z'),
      currency: 'AUD',
      currencySymbol: 'AU$',
      description: 'Invoice is issued to Kanglee',
      customerFullname: 'Paul',
      customerEmail: 'paul@101digital.io',
      customerMobile: '947717364111',
      customerAddress: 'Singapore',
      status: InvoiceStatus.Pending,
      taxPercent: new Prisma.Decimal(10),
      invoiceSubTotal: new Prisma.Decimal(totals.subTotal.toString()),
      totalTax: new Prisma.Decimal(totals.taxAmount.toString()),
      totalDiscount: new Prisma.Decimal(20),
      totalAmount: new Prisma.Decimal(totals.totalAmount.toString()),
      totalPaid: new Prisma.Decimal(1451.34),
      balanceAmount: new Prisma.Decimal(totals.balanceAmount.toString()),
      createdBy: ANCHOR_USER_ID,
      items: {
        create: items.map((i) => ({ name: i.name, quantity: i.quantity, rate: i.rate })),
      },
    },
  });
  // eslint-disable-next-line no-console
  console.log('Seeded anchor invoice IV1780488206995 (Pending → derives Overdue)');
}

async function seedGeneratedInvoices(): Promise<void> {
  for (let i = 0; i < GENERATED_COUNT; i++) {
    const customer = pick(CUSTOMERS);
    const currency = pick(CURRENCIES);
    const status = pick(PERSISTED_STATUSES);

    // Anchor the due date directly relative to today (ADR A9) so the effective
    // status mix is balanced regardless of when the seed runs: roughly a third of
    // due dates fall in the past (→ Overdue for non-Paid) and two thirds ahead.
    const dueOffset = randomInt(-35, 70);
    const dueDate = dateFromToday(dueOffset);
    // Invoice date is a term (10..40 days) before the due date.
    const term = randomInt(10, 40);
    const invoiceDate = new Date(dueDate);
    invoiceDate.setUTCDate(invoiceDate.getUTCDate() - term);

    const quantity = randomInt(1, 10);
    const rate = randomInt(50, 5000);
    const taxPercent = pick([0, 5, 7, 10, 15]);
    const discount = pick([0, 0, 0, 10, 25, 50, 100]);

    const totals = calculateInvoiceTotals({
      items: [{ quantity, rate }],
      taxPercent,
      discount,
      totalPaid: 0,
    });

    // For Paid invoices, mark as fully paid so balance is zero and realistic.
    const isPaid = status === InvoiceStatus.Paid;
    const totalPaid = isPaid ? totals.totalAmount.toString() : '0';
    const balance = isPaid ? '0' : totals.balanceAmount.toString();

    const invoiceNumber = `INV-${dateKey(invoiceDate).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceReference: rand() > 0.5 ? `REF-${randomInt(100000, 999999)}` : null,
        invoiceDate,
        dueDate,
        currency: currency.code,
        currencySymbol: currency.symbol,
        description: `Invoice for ${customer.fullname}`,
        customerFullname: customer.fullname,
        customerEmail: customer.email,
        customerMobile: customer.mobile,
        customerAddress: customer.address,
        status,
        taxPercent: new Prisma.Decimal(taxPercent),
        invoiceSubTotal: new Prisma.Decimal(totals.subTotal.toString()),
        totalTax: new Prisma.Decimal(totals.taxAmount.toString()),
        totalDiscount: new Prisma.Decimal(discount),
        totalAmount: new Prisma.Decimal(totals.totalAmount.toString()),
        totalPaid: new Prisma.Decimal(totalPaid),
        balanceAmount: new Prisma.Decimal(balance),
        createdBy: ANCHOR_USER_ID,
        items: {
          create: [{ name: pick(ITEM_NAMES), quantity, rate: new Prisma.Decimal(rate) }],
        },
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${GENERATED_COUNT} additional invoices (mixed statuses/dates/amounts)`);
}

async function main(): Promise<void> {
  // Seed-if-empty guard (CICD H-2): when SEED_IF_EMPTY=true (used by the container
  // entrypoint on boot) and the database already holds data, skip entirely so a
  // restart never truncates a populated database. A manual `npm run seed` leaves
  // SEED_IF_EMPTY unset and keeps the truncate-and-reseed reset behaviour (ADR D6).
  if (process.env.SEED_IF_EMPTY === 'true') {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      // eslint-disable-next-line no-console
      console.log('Database already seeded — skipping (SEED_IF_EMPTY)');
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seeding database...');
  await truncate();
  await seedUser();
  await seedAnchorInvoice();
  await seedGeneratedInvoices();
  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

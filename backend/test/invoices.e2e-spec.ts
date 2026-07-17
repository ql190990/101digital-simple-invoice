import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * End-to-end workflow (TEST-05): log in → create an invoice → confirm it appears
 * in GET /invoices with the correct server-computed totals and Draft status.
 * Also asserts 401 (no token), 409 (duplicate number) and 400 (dueDate<invoiceDate).
 *
 * Requires a reachable PostgreSQL (DATABASE_URL) with migrations applied. In CI a
 * postgres service is provided and migrations run before this suite.
 */
const TEST_USER = {
  id: 'ad1e0902-1928-4345-b513-60c86c94fc91',
  email: 'e2e-reviewer@101digital.io',
  password: 'Password123!',
  fullname: 'E2E Reviewer',
};

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // Clean slate + seed a single known user for the login step.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "invoice_items", "invoices", "users" RESTART IDENTITY CASCADE;',
    );
    await prisma.user.create({
      data: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: await bcrypt.hash(TEST_USER.password, 12),
        fullname: TEST_USER.fullname,
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "invoice_items", "invoices", "users" RESTART IDENTITY CASCADE;',
    );
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects protected routes without a token (401)', async () => {
    await request(app.getHttpServer()).get('/invoices').expect(401);
  });

  it('logs in and returns a JWT (no passwordHash leaked)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    token = res.body.accessToken;
  });

  it('returns a generic error on wrong password (401)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: 'wrong' })
      .expect(401);
  });

  it('creates an invoice with server-computed totals and Draft status (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerFullname: 'Paul',
        customerEmail: 'paul@101digital.io',
        invoiceNumber: 'E2E-INV-001',
        invoiceDate: '2026-06-03',
        // Future due date so the effective status stays Draft (not derived Overdue).
        dueDate: '2999-12-31',
        currency: 'AUD',
        currencySymbol: 'AU$',
        taxPercent: 10,
        discount: 20,
        items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
      })
      .expect(201);

    expect(res.body.status).toBe('Draft'); // new invoices are always Draft
    expect(res.body.invoiceSubTotal).toBe(2000);
    expect(res.body.totalTax).toBe(200);
    expect(res.body.totalAmount).toBe(2180);
    expect(res.body.totalPaid).toBe(0);
    expect(res.body.balanceAmount).toBe(2180);
  });

  it('lists the created invoice via GET /invoices', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices?keyword=E2E-INV-001')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.paging.total).toBe(1);
    expect(res.body.data[0].invoiceNumber).toBe('E2E-INV-001');
    expect(res.body.data[0].totalAmount).toBe(2180);
  });

  it('rejects a duplicate invoice number with 409', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerFullname: 'Paul',
        customerEmail: 'paul@101digital.io',
        invoiceNumber: 'E2E-INV-001',
        invoiceDate: '2026-06-03',
        dueDate: '2026-07-03',
        currency: 'AUD',
        items: [{ name: 'Item', quantity: 1, rate: 10 }],
      })
      .expect(409);
  });

  it('rejects dueDate before invoiceDate with 400 and the spec message', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerFullname: 'Paul',
        customerEmail: 'paul@101digital.io',
        invoiceNumber: 'E2E-INV-002',
        invoiceDate: '2026-07-03',
        dueDate: '2026-06-03',
        currency: 'AUD',
        items: [{ name: 'Item', quantity: 1, rate: 10 }],
      })
      .expect(400);

    expect(res.body.message).toContain('dueDate must be on or after invoiceDate');
    expect(res.body.error).toBe('Bad Request');
  });
});

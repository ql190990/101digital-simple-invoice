import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EffectiveStatusFilter,
  InvoiceSortBy,
  ListInvoicesDto,
  SortOrdering,
} from './dto/list-invoices.dto';
import { CreateInvoiceData, InvoicesRepository } from './invoices.repository';

/**
 * Unit tests for the repository's query translation. These pin the A3 invariant:
 * `statusPredicate()` (SQL) must stay in lockstep with `deriveInvoiceStatus()`
 * (the pure domain function). We exercise the public `findMany()` and capture the
 * `where` clause handed to Prisma — no database required.
 */
describe('InvoicesRepository', () => {
  // A fixed "today" so predicate assertions are deterministic.
  const TODAY = new Date(Date.UTC(2026, 6, 18)); // 2026-07-18

  let prisma: {
    invoice: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let repository: InvoicesRepository;

  beforeEach(() => {
    prisma = {
      invoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        // findMany/count return sentinels; $transaction resolves the real tuple.
        findMany: jest.fn().mockReturnValue('findMany-promise'),
        count: jest.fn().mockReturnValue('count-promise'),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    repository = new InvoicesRepository(prisma as unknown as PrismaService);
  });

  function makeQuery(overrides: Partial<ListInvoicesDto> = {}): ListInvoicesDto {
    return {
      page: 1,
      pageSize: 10,
      sortBy: InvoiceSortBy.invoiceDate,
      ordering: SortOrdering.DESC,
      ...overrides,
    } as ListInvoicesDto;
  }

  /** Run findMany and return the `where` clause passed to prisma.invoice.findMany. */
  async function whereFor(overrides: Partial<ListInvoicesDto> = {}): Promise<Prisma.InvoiceWhereInput> {
    await repository.findMany(makeQuery(overrides), TODAY);
    return prisma.invoice.findMany.mock.calls[0][0].where as Prisma.InvoiceWhereInput;
  }

  describe('statusPredicate (mirrors deriveInvoiceStatus, ADR A3)', () => {
    it('Overdue → status != Paid AND dueDate < today', async () => {
      const where = await whereFor({ status: EffectiveStatusFilter.Overdue });
      expect(where).toEqual({ AND: [{ status: { not: 'Paid' }, dueDate: { lt: TODAY } }] });
    });

    it('Draft → status = Draft AND dueDate >= today', async () => {
      const where = await whereFor({ status: EffectiveStatusFilter.Draft });
      expect(where).toEqual({ AND: [{ status: 'Draft', dueDate: { gte: TODAY } }] });
    });

    it('Pending → status = Pending AND dueDate >= today', async () => {
      const where = await whereFor({ status: EffectiveStatusFilter.Pending });
      expect(where).toEqual({ AND: [{ status: 'Pending', dueDate: { gte: TODAY } }] });
    });

    it('Paid → status = Paid (no date constraint)', async () => {
      const where = await whereFor({ status: EffectiveStatusFilter.Paid });
      expect(where).toEqual({ AND: [{ status: 'Paid' }] });
    });
  });

  describe('keyword search (ILIKE on number OR customer name, ADR A8)', () => {
    it('builds a case-insensitive OR on invoiceNumber and customerFullname', async () => {
      const where = await whereFor({ keyword: 'Paul' });
      expect(where).toEqual({
        AND: [
          {
            OR: [
              { invoiceNumber: { contains: 'Paul', mode: 'insensitive' } },
              { customerFullname: { contains: 'Paul', mode: 'insensitive' } },
            ],
          },
        ],
      });
    });

    it('trims surrounding whitespace before matching', async () => {
      const where = await whereFor({ keyword: '  Paul  ' });
      const or = (where.AND as Prisma.InvoiceWhereInput[])[0].OR as Prisma.InvoiceWhereInput[];
      expect(or[0]).toEqual({ invoiceNumber: { contains: 'Paul', mode: 'insensitive' } });
    });

    it('ignores a whitespace-only keyword', async () => {
      const where = await whereFor({ keyword: '   ' });
      expect(where).toEqual({});
    });
  });

  describe('date range filter', () => {
    it('fromDate → invoiceDate gte UTC-midnight of that day', async () => {
      const where = await whereFor({ fromDate: '2026-01-01' });
      expect(where).toEqual({
        AND: [{ invoiceDate: { gte: new Date('2026-01-01T00:00:00.000Z') } }],
      });
    });

    it('toDate → invoiceDate lte UTC-midnight of that day', async () => {
      const where = await whereFor({ toDate: '2026-12-31' });
      expect(where).toEqual({
        AND: [{ invoiceDate: { lte: new Date('2026-12-31T00:00:00.000Z') } }],
      });
    });
  });

  describe('composition & defaults', () => {
    it('combines keyword + status + date into a single AND', async () => {
      const where = await whereFor({
        keyword: 'acme',
        status: EffectiveStatusFilter.Overdue,
        fromDate: '2026-01-01',
      });
      expect((where.AND as Prisma.InvoiceWhereInput[]).length).toBe(3);
    });

    it('returns an empty where when no filters are supplied', async () => {
      const where = await whereFor();
      expect(where).toEqual({});
    });
  });

  describe('sorting & pagination', () => {
    it('maps sortBy/ordering to Prisma orderBy', async () => {
      await repository.findMany(
        makeQuery({ sortBy: InvoiceSortBy.totalAmount, ordering: SortOrdering.ASC }),
        TODAY,
      );
      expect(prisma.invoice.findMany.mock.calls[0][0].orderBy).toEqual({ totalAmount: 'asc' });
    });

    it('translates page/pageSize into skip/take', async () => {
      await repository.findMany(makeQuery({ page: 3, pageSize: 20 }), TODAY);
      const args = prisma.invoice.findMany.mock.calls[0][0];
      expect(args.skip).toBe(40); // (3 - 1) * 20
      expect(args.take).toBe(20);
    });

    it('returns rows and total from the $transaction tuple', async () => {
      prisma.$transaction.mockResolvedValueOnce([[{ invoiceId: 'x' }], 7]);
      const result = await repository.findMany(makeQuery(), TODAY);
      expect(result).toEqual({ rows: [{ invoiceId: 'x' }], total: 7 });
    });
  });

  describe('create & findById', () => {
    it('create() inserts nested items and includes them in the result', async () => {
      prisma.invoice.create.mockResolvedValue({ invoiceId: 'new', items: [] });
      const data = {
        invoiceNumber: 'INV-1',
        invoiceReference: null,
        invoiceDate: new Date('2026-06-03T00:00:00.000Z'),
        dueDate: new Date('2026-07-03T00:00:00.000Z'),
        currency: 'AUD',
        currencySymbol: 'AU$',
        description: null,
        customerFullname: 'Paul',
        customerEmail: 'paul@example.com',
        customerMobile: null,
        customerAddress: null,
        taxPercent: new Prisma.Decimal(10),
        invoiceSubTotal: new Prisma.Decimal(2000),
        totalTax: new Prisma.Decimal(200),
        totalDiscount: new Prisma.Decimal(20),
        totalAmount: new Prisma.Decimal(2180),
        totalPaid: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(2180),
        createdBy: 'user-1',
        items: [{ name: 'Honda RC150', quantity: 2, rate: new Prisma.Decimal(1000) }],
      } satisfies CreateInvoiceData;

      await repository.create(data);

      const arg = prisma.invoice.create.mock.calls[0][0];
      expect(arg.include).toEqual({ items: true });
      expect(arg.data.items).toEqual({ create: data.items });
      expect(arg.data.invoiceNumber).toBe('INV-1');
    });

    it('findById() queries by invoiceId and includes items', () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      void repository.findById('abc');
      expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { invoiceId: 'abc' },
        include: { items: true },
      });
    });
  });
});

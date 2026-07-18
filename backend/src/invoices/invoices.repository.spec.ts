import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { deriveInvoiceStatus } from './domain/derive-invoice-status';
import { PersistedStatus } from './domain/invoice-status';
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
  };
  let repository: InvoicesRepository;

  beforeEach(() => {
    prisma = {
      invoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        // findMany/count are awaited concurrently via Promise.all (no $transaction).
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
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
  async function whereFor(
    overrides: Partial<ListInvoicesDto> = {},
  ): Promise<Prisma.InvoiceWhereInput> {
    await repository.findMany(makeQuery(overrides), TODAY);
    return prisma.invoice.findMany.mock.calls[0][0].where as Prisma.InvoiceWhereInput;
  }

  describe('statusPredicate (mirrors deriveInvoiceStatus, ADR A3)', () => {
    it('Overdue → status IN [Draft, Pending] AND dueDate < today', async () => {
      const where = await whereFor({ status: EffectiveStatusFilter.Overdue });
      expect(where).toEqual({
        AND: [{ status: { in: ['Draft', 'Pending'] }, dueDate: { lt: TODAY } }],
      });
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

  describe('A3 lockstep: statusPredicate agrees with deriveInvoiceStatus (Test M1)', () => {
    // Apply the (deliberately simple) predicate shapes statusPredicate emits to an
    // in-memory row. Understands exactly the comparators the predicate uses: a
    // status equality or `{ in: [...] }`, and dueDate `{ lt }` / `{ gte }`.
    function predicateSelects(
      predicate: Prisma.InvoiceWhereInput,
      row: { status: PersistedStatus; dueDate: Date },
    ): boolean {
      const statusCond = predicate.status;
      if (typeof statusCond === 'string') {
        if (row.status !== statusCond) return false;
      } else if (statusCond && typeof statusCond === 'object' && 'in' in statusCond) {
        const inList = (statusCond as { in?: readonly string[] }).in ?? [];
        if (!inList.includes(row.status)) return false;
      }
      const dueCond = predicate.dueDate as unknown as { lt?: Date; gte?: Date } | undefined;
      if (dueCond?.lt !== undefined && !(row.dueDate.getTime() < dueCond.lt.getTime())) {
        return false;
      }
      if (dueCond?.gte !== undefined && !(row.dueDate.getTime() >= dueCond.gte.getTime())) {
        return false;
      }
      return true;
    }

    // Matrix: every persisted status × a relative due date around TODAY. The
    // yesterday/today/tomorrow triple pins the "due today is NOT overdue" boundary.
    const statuses: PersistedStatus[] = ['Draft', 'Pending', 'Paid'];
    const dueDates = [
      new Date(Date.UTC(2026, 6, 17)), // yesterday
      new Date(Date.UTC(2026, 6, 18)), // today (=== TODAY)
      new Date(Date.UTC(2026, 6, 19)), // tomorrow
    ];
    const rows = statuses.flatMap((status) => dueDates.map((dueDate) => ({ status, dueDate })));

    it.each(Object.values(EffectiveStatusFilter))(
      'predicate for %s selects exactly the rows deriveInvoiceStatus marks as that status',
      async (filter) => {
        const where = await whereFor({ status: filter });
        const predicate = (where.AND as Prisma.InvoiceWhereInput[])[0];

        const selectedBySql = rows.filter((row) => predicateSelects(predicate, row));
        const selectedByDomain = rows.filter(
          // EffectiveStatusFilter is a nominal enum; compare on the string value.
          (row) => deriveInvoiceStatus(row.status, row.dueDate, TODAY) === (filter as string),
        );

        expect(selectedBySql).toEqual(selectedByDomain);
        // Sanity: the matrix genuinely exercises this filter.
        expect(selectedByDomain.length).toBeGreaterThan(0);
      },
    );
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
    it('maps sortBy/ordering to a Prisma orderBy array', async () => {
      await repository.findMany(
        makeQuery({ sortBy: InvoiceSortBy.totalAmount, ordering: SortOrdering.ASC }),
        TODAY,
      );
      expect(prisma.invoice.findMany.mock.calls[0][0].orderBy).toEqual([
        { totalAmount: 'asc' },
        { invoiceId: 'asc' },
      ]);
    });

    it('appends invoiceId as a deterministic pagination tiebreaker (Arch H1)', async () => {
      await repository.findMany(
        makeQuery({ sortBy: InvoiceSortBy.invoiceDate, ordering: SortOrdering.DESC }),
        TODAY,
      );
      const orderBy = prisma.invoice.findMany.mock.calls[0][0].orderBy;
      expect(Array.isArray(orderBy)).toBe(true);
      // The unique key comes last and shares the primary sort's direction.
      expect(orderBy).toEqual([{ invoiceDate: 'desc' }, { invoiceId: 'desc' }]);
      expect(orderBy[orderBy.length - 1]).toEqual({ invoiceId: 'desc' });
    });

    it('translates page/pageSize into skip/take', async () => {
      await repository.findMany(makeQuery({ page: 3, pageSize: 20 }), TODAY);
      const args = prisma.invoice.findMany.mock.calls[0][0];
      expect(args.skip).toBe(40); // (3 - 1) * 20
      expect(args.take).toBe(20);
    });

    it('returns rows and total from concurrent findMany + count', async () => {
      prisma.invoice.findMany.mockResolvedValueOnce([{ invoiceId: 'x' }]);
      prisma.invoice.count.mockResolvedValueOnce(7);
      const result = await repository.findMany(makeQuery(), TODAY);
      expect(result).toEqual({ rows: [{ invoiceId: 'x' }], total: 7 });
    });
  });

  describe('create & findById', () => {
    it('create() converts domain money values to Prisma.Decimal and nests items', async () => {
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
        // Mixed domain inputs: decimal.js Decimal, number, and string.
        taxPercent: 10,
        invoiceSubTotal: new Decimal('2000'),
        totalTax: '200',
        totalDiscount: 20,
        totalAmount: new Decimal('2180'),
        totalPaid: 0,
        balanceAmount: '2180',
        createdBy: 'user-1',
        items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
      } satisfies CreateInvoiceData;

      await repository.create(data);

      const arg = prisma.invoice.create.mock.calls[0][0];
      expect(arg.include).toEqual({ items: true });
      expect(arg.data.invoiceNumber).toBe('INV-1');
      // Every money field is converted to a Prisma.Decimal regardless of input type.
      expect(arg.data.totalAmount).toBeInstanceOf(Prisma.Decimal);
      expect(arg.data.totalAmount.toString()).toBe('2180');
      expect(arg.data.invoiceSubTotal.toString()).toBe('2000');
      expect(arg.data.taxPercent.toString()).toBe('10');
      expect(arg.data.totalPaid.toString()).toBe('0');
      // Items are re-created with a Prisma.Decimal rate.
      expect(arg.data.items.create[0].rate).toBeInstanceOf(Prisma.Decimal);
      expect(arg.data.items.create[0]).toEqual({
        name: 'Honda RC150',
        quantity: 2,
        rate: new Prisma.Decimal('1000'),
      });
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

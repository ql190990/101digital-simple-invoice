import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoicesRepository, InvoiceWithItems } from './invoices.repository';
import { InvoicesService } from './invoices.service';

function anchorEntity(overrides: Partial<InvoiceWithItems> = {}): InvoiceWithItems {
  return {
    invoiceId: '099ca7da-a290-40fa-93b9-1c43ae7bb887',
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
    status: 'Pending',
    invoiceSubTotal: new Prisma.Decimal('2000.00'),
    taxPercent: new Prisma.Decimal('10.00'),
    totalTax: new Prisma.Decimal('200.00'),
    totalDiscount: new Prisma.Decimal('20.00'),
    totalAmount: new Prisma.Decimal('2180.00'),
    totalPaid: new Prisma.Decimal('1451.34'),
    balanceAmount: new Prisma.Decimal('728.66'),
    createdAt: new Date('2026-06-03T12:03:26.995Z'),
    createdBy: 'ad1e0902-1928-4345-b513-60c86c94fc91',
    items: [
      {
        id: 'b1c2d3e4-0000-0000-0000-000000000001',
        invoiceId: '099ca7da-a290-40fa-93b9-1c43ae7bb887',
        name: 'Honda RC150',
        quantity: 2,
        rate: new Prisma.Decimal('1000.00'),
      },
    ],
    ...overrides,
  };
}

const validDto: CreateInvoiceDto = {
  customerFullname: 'Paul',
  customerEmail: 'paul@101digital.io',
  invoiceNumber: 'IV-NEW-1',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repository: jest.Mocked<InvoicesRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: InvoicesRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findMany: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) =>
              key === 'APP_TIMEZONE' ? 'UTC' : key === 'MAX_PAGE_SIZE' ? 100 : def,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(InvoicesService);
    repository = moduleRef.get(InvoicesRepository);
  });

  describe('create', () => {
    it('persists server-computed totals and returns them', async () => {
      repository.create.mockResolvedValue(anchorEntity({ status: 'Draft' }));
      const result = await service.create(validDto, 'user-1');

      // Verify the repository received server-side computed decimals.
      const arg = repository.create.mock.calls[0][0];
      // No discount supplied → total = 2000 + 200 tax − 0 = 2200.
      expect(arg.invoiceSubTotal.toString()).toBe('2000');
      expect(arg.totalTax.toString()).toBe('200');
      expect(arg.totalAmount.toString()).toBe('2200');
      expect(arg.totalPaid.toString()).toBe('0');
      expect(result.invoiceNumber).toBe('IV1780488206995');
    });

    it('maps a duplicate invoice number (P2002) to 409 Conflict', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      repository.create.mockRejectedValue(p2002);

      await expect(service.create(validDto, 'user-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unknown repository errors', async () => {
      repository.create.mockRejectedValue(new Error('db down'));
      await expect(service.create(validDto, 'user-1')).rejects.toThrow('db down');
    });
  });

  describe('findOne', () => {
    it('throws NotFound with the spec message when missing', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing')).rejects.toThrow('Invoice not found');
    });

    it('returns the detail with money serialised to 2dp numbers', async () => {
      repository.findById.mockResolvedValue(anchorEntity());
      const result = await service.findOne('099ca7da-a290-40fa-93b9-1c43ae7bb887');
      expect(result.totalAmount).toBe(2180);
      expect(result.balanceAmount).toBe(728.66);
    });
  });

  describe('findMany', () => {
    it('clamps pageSize to the configured maximum', async () => {
      repository.findMany.mockResolvedValue({ rows: [], total: 0 });
      await service.findMany({
        page: 1,
        pageSize: 999,
        sortBy: 'invoiceDate',
        ordering: 'DESC',
      } as never);

      const passedQuery = repository.findMany.mock.calls[0][0];
      expect(passedQuery.pageSize).toBe(100);
    });

    it('returns the { data, paging } envelope', async () => {
      repository.findMany.mockResolvedValue({ rows: [anchorEntity()], total: 1 });
      const result = await service.findMany({
        page: 1,
        pageSize: 10,
        sortBy: 'invoiceDate',
        ordering: 'DESC',
      } as never);

      expect(result.paging).toEqual({ page: 1, pageSize: 10, total: 1 });
      expect(result.data).toHaveLength(1);
    });
  });
});

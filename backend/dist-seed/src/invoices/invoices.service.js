"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const date_util_1 = require("../common/utils/date.util");
const calculate_invoice_totals_1 = require("./domain/calculate-invoice-totals");
const invoice_response_dto_1 = require("./dto/invoice-response.dto");
const invoices_repository_1 = require("./invoices.repository");
const DEFAULT_TAX_PERCENT = 10;
const DEFAULT_DISCOUNT = 0;
const DEFAULT_CURRENCY_SYMBOL = '';
let InvoicesService = class InvoicesService {
    repository;
    config;
    constructor(repository, config) {
        this.repository = repository;
        this.config = config;
    }
    get timezone() {
        return this.config.get('APP_TIMEZONE', 'UTC');
    }
    get maxPageSize() {
        return this.config.get('MAX_PAGE_SIZE', 100);
    }
    async create(dto, userId) {
        const taxPercent = dto.taxPercent ?? DEFAULT_TAX_PERCENT;
        const discount = dto.discount ?? DEFAULT_DISCOUNT;
        const totals = (0, calculate_invoice_totals_1.calculateInvoiceTotals)({
            items: dto.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
            taxPercent,
            discount,
            totalPaid: 0,
        });
        try {
            const created = await this.repository.create({
                invoiceNumber: dto.invoiceNumber,
                invoiceReference: dto.invoiceReference ?? null,
                invoiceDate: new Date(`${dto.invoiceDate}T00:00:00.000Z`),
                dueDate: new Date(`${dto.dueDate}T00:00:00.000Z`),
                currency: dto.currency,
                currencySymbol: dto.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL,
                description: dto.description ?? null,
                customerFullname: dto.customerFullname,
                customerEmail: dto.customerEmail,
                customerMobile: dto.customerMobile ?? null,
                customerAddress: dto.customerAddress ?? null,
                taxPercent: new client_1.Prisma.Decimal(taxPercent),
                invoiceSubTotal: new client_1.Prisma.Decimal(totals.subTotal.toString()),
                totalTax: new client_1.Prisma.Decimal(totals.taxAmount.toString()),
                totalDiscount: new client_1.Prisma.Decimal(discount),
                totalAmount: new client_1.Prisma.Decimal(totals.totalAmount.toString()),
                totalPaid: new client_1.Prisma.Decimal(0),
                balanceAmount: new client_1.Prisma.Decimal(totals.balanceAmount.toString()),
                createdBy: userId,
                items: dto.items.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    rate: new client_1.Prisma.Decimal(i.rate),
                })),
            });
            return invoice_response_dto_1.InvoiceDetailDto.fromEntity(created, (0, date_util_1.getTodayInTimezone)(this.timezone));
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException(`Invoice number "${dto.invoiceNumber}" already exists`);
            }
            throw error;
        }
    }
    async findOne(invoiceId) {
        const invoice = await this.repository.findById(invoiceId);
        if (!invoice) {
            throw new common_1.NotFoundException('Invoice not found');
        }
        return invoice_response_dto_1.InvoiceDetailDto.fromEntity(invoice, (0, date_util_1.getTodayInTimezone)(this.timezone));
    }
    async findMany(query) {
        const pageSize = Math.min(query.pageSize, this.maxPageSize);
        const effectiveQuery = { ...query, pageSize };
        const today = (0, date_util_1.getTodayInTimezone)(this.timezone);
        const { rows, total } = await this.repository.findMany(effectiveQuery, today);
        return {
            data: rows.map((row) => invoice_response_dto_1.InvoiceListItemDto.fromEntity(row, today)),
            paging: {
                page: effectiveQuery.page,
                pageSize,
                total,
            },
        };
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [invoices_repository_1.InvoicesRepository,
        config_1.ConfigService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map
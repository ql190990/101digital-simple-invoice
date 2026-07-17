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
exports.InvoicesRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const list_invoices_dto_1 = require("./dto/list-invoices.dto");
const SORT_FIELD_MAP = {
    [list_invoices_dto_1.InvoiceSortBy.invoiceDate]: 'invoiceDate',
    [list_invoices_dto_1.InvoiceSortBy.dueDate]: 'dueDate',
    [list_invoices_dto_1.InvoiceSortBy.totalAmount]: 'totalAmount',
};
let InvoicesRepository = class InvoicesRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.invoice.create({
            data: {
                invoiceNumber: data.invoiceNumber,
                invoiceReference: data.invoiceReference,
                invoiceDate: data.invoiceDate,
                dueDate: data.dueDate,
                currency: data.currency,
                currencySymbol: data.currencySymbol,
                description: data.description,
                customerFullname: data.customerFullname,
                customerEmail: data.customerEmail,
                customerMobile: data.customerMobile,
                customerAddress: data.customerAddress,
                taxPercent: data.taxPercent,
                invoiceSubTotal: data.invoiceSubTotal,
                totalTax: data.totalTax,
                totalDiscount: data.totalDiscount,
                totalAmount: data.totalAmount,
                totalPaid: data.totalPaid,
                balanceAmount: data.balanceAmount,
                createdBy: data.createdBy,
                items: { create: data.items },
            },
            include: { items: true },
        });
    }
    findById(invoiceId) {
        return this.prisma.invoice.findUnique({
            where: { invoiceId },
            include: { items: true },
        });
    }
    async findMany(query, today) {
        const where = this.buildWhere(query, today);
        const orderBy = {
            [SORT_FIELD_MAP[query.sortBy]]: query.ordering === list_invoices_dto_1.SortOrdering.ASC ? 'asc' : 'desc',
        };
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.invoice.findMany({
                where,
                orderBy,
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.invoice.count({ where }),
        ]);
        return { rows, total };
    }
    buildWhere(query, today) {
        const and = [];
        if (query.keyword && query.keyword.trim().length > 0) {
            const keyword = query.keyword.trim();
            and.push({
                OR: [
                    { invoiceNumber: { contains: keyword, mode: 'insensitive' } },
                    { customerFullname: { contains: keyword, mode: 'insensitive' } },
                ],
            });
        }
        if (query.status) {
            and.push(this.statusPredicate(query.status, today));
        }
        if (query.fromDate) {
            and.push({ invoiceDate: { gte: new Date(`${query.fromDate}T00:00:00.000Z`) } });
        }
        if (query.toDate) {
            and.push({ invoiceDate: { lte: new Date(`${query.toDate}T00:00:00.000Z`) } });
        }
        return and.length > 0 ? { AND: and } : {};
    }
    statusPredicate(status, today) {
        switch (status) {
            case list_invoices_dto_1.EffectiveStatusFilter.Overdue:
                return { status: { not: 'Paid' }, dueDate: { lt: today } };
            case list_invoices_dto_1.EffectiveStatusFilter.Draft:
                return { status: 'Draft', dueDate: { gte: today } };
            case list_invoices_dto_1.EffectiveStatusFilter.Pending:
                return { status: 'Pending', dueDate: { gte: today } };
            case list_invoices_dto_1.EffectiveStatusFilter.Paid:
                return { status: 'Paid' };
            default: {
                const _exhaustive = status;
                return _exhaustive;
            }
        }
    }
};
exports.InvoicesRepository = InvoicesRepository;
exports.InvoicesRepository = InvoicesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesRepository);
//# sourceMappingURL=invoices.repository.js.map
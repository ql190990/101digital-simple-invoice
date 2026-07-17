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
exports.InvoiceListItemDto = exports.InvoiceDetailDto = exports.InvoiceItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const decimal_util_1 = require("../../common/utils/decimal.util");
const date_util_1 = require("../../common/utils/date.util");
const derive_invoice_status_1 = require("../domain/derive-invoice-status");
const invoice_status_1 = require("../domain/invoice-status");
class InvoiceItemDto {
    id;
    name;
    quantity;
    rate;
    static fromEntity(item) {
        return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            rate: (0, decimal_util_1.toMoneyNumber)(item.rate),
        };
    }
}
exports.InvoiceItemDto = InvoiceItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Honda RC150' }),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000, description: '2 decimal places' }),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "rate", void 0);
class InvoiceDetailDto {
    invoiceId;
    invoiceNumber;
    invoiceReference;
    invoiceDate;
    dueDate;
    currency;
    currencySymbol;
    description;
    customerFullname;
    customerEmail;
    customerMobile;
    customerAddress;
    status;
    invoiceSubTotal;
    taxPercent;
    totalTax;
    totalDiscount;
    totalAmount;
    totalPaid;
    balanceAmount;
    items;
    createdAt;
    createdBy;
    static fromEntity(invoice, today) {
        return {
            invoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            invoiceReference: invoice.invoiceReference,
            invoiceDate: (0, date_util_1.formatDateKey)(invoice.invoiceDate),
            dueDate: (0, date_util_1.formatDateKey)(invoice.dueDate),
            currency: invoice.currency,
            currencySymbol: invoice.currencySymbol,
            description: invoice.description,
            customerFullname: invoice.customerFullname,
            customerEmail: invoice.customerEmail,
            customerMobile: invoice.customerMobile,
            customerAddress: invoice.customerAddress,
            status: (0, derive_invoice_status_1.deriveInvoiceStatus)(invoice.status, invoice.dueDate, today),
            invoiceSubTotal: (0, decimal_util_1.toMoneyNumber)(invoice.invoiceSubTotal),
            taxPercent: (0, decimal_util_1.toMoneyNumber)(invoice.taxPercent),
            totalTax: (0, decimal_util_1.toMoneyNumber)(invoice.totalTax),
            totalDiscount: (0, decimal_util_1.toMoneyNumber)(invoice.totalDiscount),
            totalAmount: (0, decimal_util_1.toMoneyNumber)(invoice.totalAmount),
            totalPaid: (0, decimal_util_1.toMoneyNumber)(invoice.totalPaid),
            balanceAmount: (0, decimal_util_1.toMoneyNumber)(invoice.balanceAmount),
            items: (invoice.items ?? []).map(InvoiceItemDto.fromEntity),
            createdAt: invoice.createdAt.toISOString(),
            createdBy: invoice.createdBy,
        };
    }
}
exports.InvoiceDetailDto = InvoiceDetailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IV1780488206995' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '#5721662', nullable: true }),
    __metadata("design:type", Object)
], InvoiceDetailDto.prototype, "invoiceReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-03' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "invoiceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AUD' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AU$' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "currencySymbol", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], InvoiceDetailDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Paul' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "customerFullname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'paul@101digital.io' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], InvoiceDetailDto.prototype, "customerMobile", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], InvoiceDetailDto.prototype, "customerAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: invoice_status_1.EFFECTIVE_STATUSES, example: 'Overdue' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2000 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "invoiceSubTotal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "taxPercent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 200 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "totalTax", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 20 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "totalDiscount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2180 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1451.34 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "totalPaid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 728.66 }),
    __metadata("design:type", Number)
], InvoiceDetailDto.prototype, "balanceAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [InvoiceItemDto] }),
    __metadata("design:type", Array)
], InvoiceDetailDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: String, format: 'date-time' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], InvoiceDetailDto.prototype, "createdBy", void 0);
class InvoiceListItemDto {
    invoiceId;
    invoiceNumber;
    customerFullname;
    invoiceDate;
    dueDate;
    totalAmount;
    currency;
    currencySymbol;
    status;
    static fromEntity(invoice, today) {
        return {
            invoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            customerFullname: invoice.customerFullname,
            invoiceDate: (0, date_util_1.formatDateKey)(invoice.invoiceDate),
            dueDate: (0, date_util_1.formatDateKey)(invoice.dueDate),
            totalAmount: (0, decimal_util_1.toMoneyNumber)(invoice.totalAmount),
            currency: invoice.currency,
            currencySymbol: invoice.currencySymbol,
            status: (0, derive_invoice_status_1.deriveInvoiceStatus)(invoice.status, invoice.dueDate, today),
        };
    }
}
exports.InvoiceListItemDto = InvoiceListItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IV1780488206995' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Paul' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "customerFullname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-03' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "invoiceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2180 }),
    __metadata("design:type", Number)
], InvoiceListItemDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AUD' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AU$' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "currencySymbol", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: invoice_status_1.EFFECTIVE_STATUSES, example: 'Overdue' }),
    __metadata("design:type", String)
], InvoiceListItemDto.prototype, "status", void 0);
//# sourceMappingURL=invoice-response.dto.js.map
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
exports.ListInvoicesDto = exports.EffectiveStatusFilter = exports.SortOrdering = exports.InvoiceSortBy = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var InvoiceSortBy;
(function (InvoiceSortBy) {
    InvoiceSortBy["invoiceDate"] = "invoiceDate";
    InvoiceSortBy["dueDate"] = "dueDate";
    InvoiceSortBy["totalAmount"] = "totalAmount";
})(InvoiceSortBy || (exports.InvoiceSortBy = InvoiceSortBy = {}));
var SortOrdering;
(function (SortOrdering) {
    SortOrdering["ASC"] = "ASC";
    SortOrdering["DESC"] = "DESC";
})(SortOrdering || (exports.SortOrdering = SortOrdering = {}));
var EffectiveStatusFilter;
(function (EffectiveStatusFilter) {
    EffectiveStatusFilter["Draft"] = "Draft";
    EffectiveStatusFilter["Pending"] = "Pending";
    EffectiveStatusFilter["Paid"] = "Paid";
    EffectiveStatusFilter["Overdue"] = "Overdue";
})(EffectiveStatusFilter || (exports.EffectiveStatusFilter = EffectiveStatusFilter = {}));
class ListInvoicesDto {
    page = 1;
    pageSize = 10;
    sortBy = InvoiceSortBy.invoiceDate;
    ordering = SortOrdering.DESC;
    status;
    keyword;
    fromDate;
    toDate;
}
exports.ListInvoicesDto = ListInvoicesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1, default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], ListInvoicesDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1, maximum: 100, default: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListInvoicesDto.prototype, "pageSize", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: InvoiceSortBy, default: InvoiceSortBy.invoiceDate }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InvoiceSortBy),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: SortOrdering, default: SortOrdering.DESC }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)),
    (0, class_validator_1.IsEnum)(SortOrdering),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "ordering", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: EffectiveStatusFilter, description: 'Filter by effective status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(EffectiveStatusFilter),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Partial, case-insensitive match on number or customer name',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "keyword", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01', description: 'invoiceDate on/after (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31', description: 'invoiceDate on/before (YYYY-MM-DD)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListInvoicesDto.prototype, "toDate", void 0);
//# sourceMappingURL=list-invoices.dto.js.map
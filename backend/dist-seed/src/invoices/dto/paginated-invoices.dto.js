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
exports.PaginatedInvoicesDto = exports.PagingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const invoice_response_dto_1 = require("./invoice-response.dto");
class PagingDto {
    page;
    pageSize;
    total;
}
exports.PagingDto = PagingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Current page (starts at 1)' }),
    __metadata("design:type", Number)
], PagingDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    __metadata("design:type", Number)
], PagingDto.prototype, "pageSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 41, description: 'Total matching records' }),
    __metadata("design:type", Number)
], PagingDto.prototype, "total", void 0);
class PaginatedInvoicesDto {
    data;
    paging;
}
exports.PaginatedInvoicesDto = PaginatedInvoicesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [invoice_response_dto_1.InvoiceListItemDto] }),
    __metadata("design:type", Array)
], PaginatedInvoicesDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: PagingDto }),
    __metadata("design:type", PagingDto)
], PaginatedInvoicesDto.prototype, "paging", void 0);
//# sourceMappingURL=paginated-invoices.dto.js.map
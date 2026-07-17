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
exports.CreateInvoiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const is_on_or_after_validator_1 = require("../../common/validators/is-on-or-after.validator");
const create_invoice_item_dto_1 = require("./create-invoice-item.dto");
class CreateInvoiceDto {
    customerFullname;
    customerEmail;
    customerMobile;
    customerAddress;
    invoiceNumber;
    invoiceReference;
    invoiceDate;
    dueDate;
    currency;
    currencySymbol;
    description;
    taxPercent;
    discount;
    items;
}
exports.CreateInvoiceDto = CreateInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Paul' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'customerFullname should not be empty' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "customerFullname", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'paul@101digital.io' }),
    (0, class_validator_1.IsEmail)({}, { message: 'customerEmail must be a valid email address' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '947717364111' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "customerMobile", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Singapore' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "customerAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'IV1780488206995', description: 'Unique, user-provided' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'invoiceNumber should not be empty' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '#5721662', description: 'Optional external reference' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-03', description: 'YYYY-MM-DD' }),
    (0, class_validator_1.IsDateString)({}, { message: 'invoiceDate must be a valid date (YYYY-MM-DD)' }),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-03', description: 'YYYY-MM-DD, must be ≥ invoiceDate' }),
    (0, class_validator_1.IsDateString)({}, { message: 'dueDate must be a valid date (YYYY-MM-DD)' }),
    (0, is_on_or_after_validator_1.IsOnOrAfter)('invoiceDate'),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AUD', description: 'ISO 4217 currency code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'currency should not be empty' }),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'AU$', description: 'Display symbol' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "currencySymbol", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Invoice is issued to Kanglee' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, default: 10, description: 'Tax percent, non-negative' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0, { message: 'taxPercent must not be negative' }),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "taxPercent", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20, default: 0, description: 'Absolute discount amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0, { message: 'discount must not be negative' }),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "discount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [create_invoice_item_dto_1.CreateInvoiceItemDto], description: 'Line items (one required)' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'at least one item is required' }),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_invoice_item_dto_1.CreateInvoiceItemDto),
    __metadata("design:type", Array)
], CreateInvoiceDto.prototype, "items", void 0);
//# sourceMappingURL=create-invoice.dto.js.map
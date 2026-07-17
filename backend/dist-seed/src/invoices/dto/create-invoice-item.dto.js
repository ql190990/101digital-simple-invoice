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
exports.CreateInvoiceItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateInvoiceItemDto {
    name;
    quantity;
    rate;
}
exports.CreateInvoiceItemDto = CreateInvoiceItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Honda RC150', description: 'Line item name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'item name should not be empty' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateInvoiceItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2, description: 'Quantity — positive integer' }),
    (0, class_validator_1.IsInt)({ message: 'quantity must be an integer' }),
    (0, class_validator_1.IsPositive)({ message: 'quantity must be a positive integer' }),
    __metadata("design:type", Number)
], CreateInvoiceItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1000, description: 'Unit rate — positive number' }),
    (0, class_validator_1.IsPositive)({ message: 'rate must be a positive number' }),
    __metadata("design:type", Number)
], CreateInvoiceItemDto.prototype, "rate", void 0);
//# sourceMappingURL=create-invoice-item.dto.js.map
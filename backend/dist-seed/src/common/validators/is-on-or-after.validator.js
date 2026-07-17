"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsOnOrAfterConstraint = void 0;
exports.IsOnOrAfter = IsOnOrAfter;
const class_validator_1 = require("class-validator");
let IsOnOrAfterConstraint = class IsOnOrAfterConstraint {
    validate(value, args) {
        const [relatedPropertyName] = args.constraints;
        const relatedValue = args.object[relatedPropertyName];
        if (typeof value !== 'string' || typeof relatedValue !== 'string') {
            return true;
        }
        const target = toDateOnly(value);
        const other = toDateOnly(relatedValue);
        if (target === null || other === null) {
            return true;
        }
        return target >= other;
    }
    defaultMessage(args) {
        const [relatedPropertyName] = args.constraints;
        return `${args.property} must be on or after ${relatedPropertyName}`;
    }
};
exports.IsOnOrAfterConstraint = IsOnOrAfterConstraint;
exports.IsOnOrAfterConstraint = IsOnOrAfterConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isOnOrAfter', async: false })
], IsOnOrAfterConstraint);
function toDateOnly(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}
function IsOnOrAfter(property, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isOnOrAfter',
            target: object.constructor,
            propertyName,
            constraints: [property],
            options: validationOptions,
            validator: IsOnOrAfterConstraint,
        });
    };
}
//# sourceMappingURL=is-on-or-after.validator.js.map
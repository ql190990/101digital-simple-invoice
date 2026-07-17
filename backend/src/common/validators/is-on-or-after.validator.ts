import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validates that a date-string property is on or after another date-string
 * property on the same object. Compares calendar dates only.
 *
 * Produces the spec's exact message shape (BL-06):
 *   "dueDate must be on or after invoiceDate"
 */
@ValidatorConstraint({ name: 'isOnOrAfter', async: false })
export class IsOnOrAfterConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as [string];
    const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];

    if (typeof value !== 'string' || typeof relatedValue !== 'string') {
      // Let @IsDateString on each field surface its own error.
      return true;
    }

    const target = toDateOnly(value);
    const other = toDateOnly(relatedValue);
    if (target === null || other === null) {
      return true;
    }
    return target >= other;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as [string];
    return `${args.property} must be on or after ${relatedPropertyName}`;
  }
}

function toDateOnly(value: string): number | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

export function IsOnOrAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isOnOrAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsOnOrAfterConstraint,
    });
  };
}

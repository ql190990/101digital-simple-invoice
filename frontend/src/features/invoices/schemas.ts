import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Client-side create-invoice validation, mirroring the server rules (VR-01..13).
 * The server remains the authority for totals and uniqueness.
 */
export const createInvoiceSchema = z
  .object({
    customerFullname: z.string().min(1, 'Customer name is required'),
    customerEmail: z.string().min(1, 'Customer email is required').email('Enter a valid email'),
    customerMobile: z.string().optional(),
    customerAddress: z.string().optional(),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceReference: z.string().optional(),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.string().min(1, 'Currency is required'),
    currencySymbol: z.string().optional(),
    description: z.string().optional(),
    taxPercent: z.coerce.number().min(0, 'Tax must not be negative'),
    discount: z.coerce.number().min(0, 'Discount must not be negative'),
    itemName: z.string().min(1, 'Item name is required'),
    itemQuantity: z.coerce
      .number({ invalid_type_error: 'Quantity is required' })
      .int('Quantity must be a whole number')
      .positive('Quantity must be positive'),
    itemRate: z.coerce
      .number({ invalid_type_error: 'Rate is required' })
      .positive('Rate must be positive'),
  })
  .refine((data) => !data.invoiceDate || !data.dueDate || data.dueDate >= data.invoiceDate, {
    message: 'Due date must be on or after invoice date',
    path: ['dueDate'],
  });

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

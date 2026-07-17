import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { useCreateInvoice } from '../features/invoices/api';
import { createInvoiceSchema, type CreateInvoiceFormValues } from '../features/invoices/schemas';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';

const today = new Date().toISOString().slice(0, 10);

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const createInvoice = useCreateInvoice();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: 'AUD',
      currencySymbol: 'AU$',
      taxPercent: 10,
      discount: 0,
      itemQuantity: 1,
      invoiceDate: today,
      dueDate: today,
    },
  });

  // Live client-side preview only. The server computes the persisted values (FR-19).
  const qty = Number(watch('itemQuantity')) || 0;
  const rate = Number(watch('itemRate')) || 0;
  const taxPercent = Number(watch('taxPercent')) || 0;
  const discount = Number(watch('discount')) || 0;
  const symbol = watch('currencySymbol') || '';

  const preview = useMemo(() => {
    const subTotal = qty * rate;
    const tax = Math.round(subTotal * (taxPercent / 100) * 100) / 100;
    const total = subTotal + tax - discount;
    return { subTotal, tax, total };
  }, [qty, rate, taxPercent, discount]);

  const onSubmit = async (values: CreateInvoiceFormValues) => {
    try {
      const created = await createInvoice.mutateAsync({
        customerFullname: values.customerFullname,
        customerEmail: values.customerEmail,
        customerMobile: values.customerMobile || undefined,
        customerAddress: values.customerAddress || undefined,
        invoiceNumber: values.invoiceNumber,
        invoiceReference: values.invoiceReference || undefined,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        currency: values.currency,
        currencySymbol: values.currencySymbol || undefined,
        description: values.description || undefined,
        taxPercent: values.taxPercent,
        discount: values.discount,
        items: [{ name: values.itemName, quantity: values.itemQuantity, rate: values.itemRate }],
      });
      notify(`Invoice ${created.invoiceNumber} created`, 'success');
      navigate('/', { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create invoice');
      // Surface duplicate invoice number (409) on the field.
      if (message.toLowerCase().includes('already exists')) {
        setError('invoiceNumber', { message });
      }
      notify(message, 'error');
    }
  };

  const field =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
  const errText = 'mt-1 text-xs text-red-600';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link to="/" className="text-sm font-medium text-brand-600">
          ← Back to invoices
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Create invoice</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Customer */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Customer</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="customerFullname"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Name *
              </label>
              <input id="customerFullname" className={field} {...register('customerFullname')} />
              {errors.customerFullname && (
                <p className={errText}>{errors.customerFullname.message}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="customerEmail"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email *
              </label>
              <input
                id="customerEmail"
                type="email"
                className={field}
                {...register('customerEmail')}
              />
              {errors.customerEmail && <p className={errText}>{errors.customerEmail.message}</p>}
            </div>
            <div>
              <label
                htmlFor="customerMobile"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Mobile
              </label>
              <input id="customerMobile" className={field} {...register('customerMobile')} />
            </div>
            <div>
              <label
                htmlFor="customerAddress"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Address
              </label>
              <input id="customerAddress" className={field} {...register('customerAddress')} />
            </div>
          </div>
        </fieldset>

        {/* Invoice */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Invoice</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="invoiceNumber"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Invoice number *
              </label>
              <input id="invoiceNumber" className={field} {...register('invoiceNumber')} />
              {errors.invoiceNumber && <p className={errText}>{errors.invoiceNumber.message}</p>}
            </div>
            <div>
              <label
                htmlFor="invoiceReference"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Reference
              </label>
              <input id="invoiceReference" className={field} {...register('invoiceReference')} />
            </div>
            <div>
              <label
                htmlFor="invoiceDate"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Invoice date *
              </label>
              <input id="invoiceDate" type="date" className={field} {...register('invoiceDate')} />
              {errors.invoiceDate && <p className={errText}>{errors.invoiceDate.message}</p>}
            </div>
            <div>
              <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-slate-700">
                Due date *
              </label>
              <input id="dueDate" type="date" className={field} {...register('dueDate')} />
              {errors.dueDate && <p className={errText}>{errors.dueDate.message}</p>}
            </div>
            <div>
              <label htmlFor="currency" className="mb-1 block text-sm font-medium text-slate-700">
                Currency *
              </label>
              <input id="currency" className={field} {...register('currency')} />
              {errors.currency && <p className={errText}>{errors.currency.message}</p>}
            </div>
            <div>
              <label
                htmlFor="currencySymbol"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Currency symbol
              </label>
              <input id="currencySymbol" className={field} {...register('currencySymbol')} />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <input id="description" className={field} {...register('description')} />
            </div>
          </div>
        </fieldset>

        {/* Line item + amounts */}
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Line item</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label htmlFor="itemName" className="mb-1 block text-sm font-medium text-slate-700">
                Item name *
              </label>
              <input id="itemName" className={field} {...register('itemName')} />
              {errors.itemName && <p className={errText}>{errors.itemName.message}</p>}
            </div>
            <div>
              <label
                htmlFor="itemQuantity"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Quantity *
              </label>
              <input
                id="itemQuantity"
                type="number"
                min={1}
                step={1}
                className={field}
                {...register('itemQuantity')}
              />
              {errors.itemQuantity && <p className={errText}>{errors.itemQuantity.message}</p>}
            </div>
            <div>
              <label htmlFor="itemRate" className="mb-1 block text-sm font-medium text-slate-700">
                Rate *
              </label>
              <input
                id="itemRate"
                type="number"
                min={0}
                step="0.01"
                className={field}
                {...register('itemRate')}
              />
              {errors.itemRate && <p className={errText}>{errors.itemRate.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:col-span-1">
              <div>
                <label
                  htmlFor="taxPercent"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Tax %
                </label>
                <input
                  id="taxPercent"
                  type="number"
                  min={0}
                  step="0.01"
                  className={field}
                  {...register('taxPercent')}
                />
                {errors.taxPercent && <p className={errText}>{errors.taxPercent.message}</p>}
              </div>
              <div>
                <label htmlFor="discount" className="mb-1 block text-sm font-medium text-slate-700">
                  Discount
                </label>
                <input
                  id="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  className={field}
                  {...register('discount')}
                />
                {errors.discount && <p className={errText}>{errors.discount.message}</p>}
              </div>
            </div>
          </div>

          {/* Live preview (server is the source of truth). */}
          <div className="rounded-lg bg-slate-50 p-4 text-sm" data-testid="totals-preview">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Preview (server recalculates on save)
            </p>
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{formatMoney(preview.subTotal, symbol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span className="font-medium">{formatMoney(preview.tax, symbol)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
              <span>Total</span>
              <span>{formatMoney(preview.total, symbol)}</span>
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <Link
            to="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}

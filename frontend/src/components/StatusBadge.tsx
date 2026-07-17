import clsx from 'clsx';
import type { EffectiveStatus } from '../features/invoices/types';

const STYLES: Record<EffectiveStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  Paid: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Overdue: 'bg-red-100 text-red-800 ring-red-200',
};

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

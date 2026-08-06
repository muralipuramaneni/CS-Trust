import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconCheck, IconEdit, IconTrash, IconUser, IconUserPlus, IconX } from './icons';
import { cn } from '../../utils/cn';

export const tableActionBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

export function IconActionButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={cn(tableActionBtnClass, className)} {...props}>
      {children}
    </button>
  );
}

/** Icon-only row actions for admin data tables */
export function TableRowActions({
  onEdit,
  onDelete,
  onAssign,
  assignLabel = 'Assign',
  assignVariant = 'add',
  className,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  assignLabel?: string;
  /** `add` = user+ (not assigned); `change` = user (already assigned) */
  assignVariant?: 'add' | 'change';
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      {onAssign ? (
        <IconActionButton aria-label={assignLabel} title={assignLabel} onClick={onAssign}>
          {assignVariant === 'change' ? (
            <IconUser className="h-4 w-4" />
          ) : (
            <IconUserPlus className="h-4 w-4" />
          )}
        </IconActionButton>
      ) : null}
      {onEdit ? (
        <IconActionButton aria-label="Edit" title="Edit" onClick={onEdit}>
          <IconEdit className="h-4 w-4" />
        </IconActionButton>
      ) : null}
      {onDelete ? (
        <IconActionButton
          aria-label="Delete"
          title="Delete"
          className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
          onClick={onDelete}
        >
          <IconTrash className="h-4 w-4" />
        </IconActionButton>
      ) : null}
    </div>
  );
}

export function LeaveReviewActions({
  onApprove,
  onReject,
  className,
}: {
  onApprove: () => void;
  onReject: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      <IconActionButton
        aria-label="Approve"
        title="Approve"
        className="hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
        onClick={onApprove}
      >
        <IconCheck className="h-4 w-4" />
      </IconActionButton>
      <IconActionButton
        aria-label="Reject"
        title="Reject"
        className="hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
        onClick={onReject}
      >
        <IconX className="h-4 w-4" />
      </IconActionButton>
    </div>
  );
}

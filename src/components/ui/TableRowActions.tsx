import { IconEdit, IconTrash } from './icons';
import { cn } from '../../utils/cn';

const actionBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

/** Icon-only edit + delete for admin data tables */
export function TableRowActions({
  onEdit,
  onDelete,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      <button type="button" className={actionBtn} aria-label="Edit" onClick={onEdit}>
        <IconEdit className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(actionBtn, 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300')}
        aria-label="Delete"
        onClick={onDelete}
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  );
}

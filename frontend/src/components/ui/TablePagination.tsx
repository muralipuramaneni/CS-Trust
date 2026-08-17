import { IconChevronLeft, IconChevronRight } from './icons';
import { TABLE_PAGE_SIZE } from '../../hooks/useTablePagination';

export function TablePagination({
  totalCount,
  page,
  totalPages,
  rangeFrom,
  rangeTo,
  onPageChange,
  label = 'records',
}: {
  totalCount: number;
  page: number;
  totalPages: number;
  rangeFrom: number;
  rangeTo: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalCount <= TABLE_PAGE_SIZE) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {rangeFrom}–{rangeTo}
        </span>{' '}
        of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{totalCount}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-[4.5rem] text-center text-xs font-medium text-slate-600 dark:text-slate-300">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Next page"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

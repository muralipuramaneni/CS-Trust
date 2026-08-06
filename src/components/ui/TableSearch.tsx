import { IconSearch } from './icons';
import { cn } from '../../utils/cn';

/** Compact search control for page header (beside action buttons) */
export function TableSearch({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('relative block w-full min-w-0 sm:w-56 md:w-64', className)}>
      <span className="sr-only">Search table</span>
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-500/15 sm:h-10"
      />
    </label>
  );
}

export function matchesSearch(search: string, ...parts: Array<string | number | undefined | null>) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return parts
    .filter((p) => p !== undefined && p !== null && String(p).length > 0)
    .map((p) => String(p).toLowerCase())
    .join(' ')
    .includes(q);
}

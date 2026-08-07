import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type DataTableHeader = string | { label: string; className?: string };

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: DataTableHeader[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Horizontal scroll only when columns need it — don't force a vertical scroll rail
        'w-full max-w-full overflow-x-auto overflow-y-clip rounded-lg bg-white',
        'dark:bg-slate-900/90',
        className,
      )}
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-200/90 dark:bg-slate-800">
            {headers.map((header) => {
              const label = typeof header === 'string' ? header : header.label;
              const headerClass = typeof header === 'string' ? undefined : header.className;
              return (
                <th
                  key={label}
                  className={cn(
                    'px-4 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200',
                    headerClass,
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody
          className={cn(
            '[&>tr:nth-child(even)]:bg-slate-50/90 dark:[&>tr:nth-child(even)]:bg-slate-800/40',
            '[&>tr:nth-child(odd)]:bg-white dark:[&>tr:nth-child(odd)]:bg-transparent',
            '[&>tr]:transition-colors [&>tr]:duration-150',
            // Cell backgrounds so hover wins over zebra striping
            '[&>tr:hover>td]:bg-sky-50 dark:[&>tr:hover>td]:bg-sky-500/10',
          )}
        >
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-0 px-4 py-3.5 text-slate-600 transition-colors dark:text-slate-300',
        className,
      )}
    >
      {children}
    </td>
  );
}

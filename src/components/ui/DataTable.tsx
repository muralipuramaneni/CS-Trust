import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full max-w-full overflow-x-auto rounded-lg bg-white',
        'dark:bg-slate-900/90',
        className,
      )}
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-200/90 dark:bg-slate-800">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-slate-50/90 dark:[&>tr:nth-child(even)]:bg-slate-800/40 [&>tr:nth-child(odd)]:bg-white dark:[&>tr:nth-child(odd)]:bg-transparent">
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

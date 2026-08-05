import type { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export function Label({
  children,
  required = false,
  className = '',
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        'mb-1.5 inline-flex items-baseline gap-1 text-[0.8rem] font-medium text-slate-700 dark:text-slate-300',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="font-semibold text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  error:
    'border-danger/20 bg-danger-soft text-danger dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-200',
} as const;

export function Alert({ variant = 'error', title, children, className }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-lg border px-4 py-3 text-sm leading-relaxed',
        variantStyles[variant],
        className,
      )}
    >
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className = '', id, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      className={cn(
        'h-11 w-full rounded-lg border bg-white px-3.5 text-[0.9rem] text-ink transition-all duration-200',
        'placeholder:text-slate-400',
        'hover:border-slate-300',
        'focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500',
        'dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/20',
        hasError
          ? 'border-danger bg-danger-soft/40 focus:border-danger focus:ring-danger/15 dark:bg-red-950/40'
          : 'border-slate-200',
        className,
      )}
      {...props}
    />
  );
});

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Button hierarchy (use only one primary in an action group):
 * - primary     → main page action
 * - secondary   → alternative action
 * - outline     → less important action
 * - ghost       → low-priority (e.g. Cancel)
 * - destructive → delete / reject / remove
 *
 * Specs: 44px mobile / 40px desktop, radius 8px, px 16px, icon–label gap 8px
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  /** @deprecated Use `outline` */
  | 'outline-brand';

export type ButtonSize = 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Reserved for API stability; size follows design-system heights (44 / 40). */
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700',
  secondary:
    'border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200/90 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:border-slate-500',
  outline:
    'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:border-slate-500',
  ghost:
    'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
  destructive:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
  'outline-brand':
    'border border-brand-300 bg-transparent text-brand-700 hover:bg-brand-50 hover:border-brand-400 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-orange-950/40',
};

export function Button({
  variant = 'primary',
  size: _size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  void _size;

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        // Specs: mobile 44px, desktop 40px; radius 8px; px 16px; gap 8px
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold tracking-wide transition-all duration-200 sm:h-10',
        // Icons 18px
        '[&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem] [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.99]',
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

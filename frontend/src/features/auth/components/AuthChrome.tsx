import { Link } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import type { FormEvent, ReactNode } from 'react';

/** Sky text link — attachment “Forgot password?” */
export function AuthTextLink({
  to,
  children,
  className,
}: {
  to: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'text-sm font-medium text-sky-600 transition hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-sm dark:focus-visible:ring-offset-slate-900',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Peach/orange outlined pill — e.g. “Sign in” */
export function AuthPillLink({
  to,
  children,
  className,
}: {
  to: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-lg border border-[#ff8a3d] bg-white px-4 text-sm font-semibold text-[#ff6a00] transition hover:bg-orange-50 dark:border-orange-500/50 dark:bg-slate-900 dark:hover:bg-orange-950/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Attachment action row (e.g. Forgot password / Back to sign in) */
export function AuthActionsRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {children}
    </div>
  );
}

export function AuthHelperCard({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pt-1 text-center">
      <div className="text-xs text-slate-500 dark:text-slate-400">{title}</div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function AuthDemoPill({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-orange-400 dark:hover:text-orange-300"
    >
      {children}
    </button>
  );
}

export function AuthForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
    </div>
  );
}

export const authPrimaryButtonClass = 'mt-0.5';

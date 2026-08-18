import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '../../utils/cn';
import {
  progressBarGradient,
  progressBarLogoGradient,
  progressLevel,
  progressRingStops,
  progressTrackClass,
} from '../../utils/progress';

export function Card({
  children,
  className,
  hover = false,
  padding = 'md',
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const pads = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.03),0_12px_32px_-12px_rgba(15,23,42,0.12)] backdrop-blur-sm',
        'dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_1px_0_rgba(255,255,255,0.04),0_16px_40px_-16px_rgba(0,0,0,0.55)]',
        hover &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_20px_40px_-16px_rgba(15,23,42,0.18)] dark:hover:border-slate-600 dark:hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.65)]',
        pads[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
  accent = 'brand',
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { label: string; positive?: boolean };
  icon?: ReactNode;
  accent?: 'brand' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
}) {
  const accents = {
    brand: {
      soft: 'from-orange-50/90 to-white dark:from-orange-950/50 dark:to-slate-900',
      icon: 'bg-orange-100 text-orange-700 ring-orange-200/70 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
      bar: 'bg-brand-500',
    },
    sky: {
      soft: 'from-sky-50/90 to-white dark:from-sky-950/40 dark:to-slate-900',
      icon: 'bg-sky-100 text-sky-700 ring-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
      bar: 'bg-sky-500',
    },
    emerald: {
      soft: 'from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-slate-900',
      icon: 'bg-emerald-100 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
      bar: 'bg-emerald-500',
    },
    amber: {
      soft: 'from-amber-50/90 to-white dark:from-amber-950/40 dark:to-slate-900',
      icon: 'bg-amber-100 text-amber-800 ring-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
      bar: 'bg-amber-500',
    },
    rose: {
      soft: 'from-rose-50/90 to-white dark:from-rose-950/40 dark:to-slate-900',
      icon: 'bg-rose-100 text-rose-700 ring-rose-200/70 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
      bar: 'bg-rose-500',
    },
    slate: {
      soft: 'from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      icon: 'bg-slate-100 text-slate-700 ring-slate-200/70 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600',
      bar: 'bg-slate-500',
    },
  }[accent];

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-0',
        `bg-gradient-to-br ${accents.soft}`,
        className,
      )}
      hover
      padding="none"
    >
      <div className={cn('absolute inset-x-0 top-0 h-0.5 opacity-80', accents.bar)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {icon ? (
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset',
                accents.icon,
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <p className="mt-2.5 text-[1.75rem] font-bold leading-none tracking-tight text-slate-900 sm:text-[2rem] dark:text-slate-50">
          {value}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center rounded-lg px-2 py-0.5 text-[0.7rem] font-semibold',
                trend.positive !== false
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
              )}
            >
              {trend.label}
            </span>
          ) : null}
          {hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
      </div>
    </Card>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info';
}) {
  const tones = {
    neutral:
      'bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600',
    success:
      'bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25',
    warning:
      'bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25',
    danger:
      'bg-red-50 text-red-700 ring-red-200/80 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25',
    brand:
      'bg-orange-50 text-orange-700 ring-orange-200/80 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/25',
    info: 'bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  readOnly,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  readOnly?: boolean;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex w-full flex-col gap-3 sm:mb-7 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] lg:text-[1.85rem] dark:text-slate-50">
            {title}
          </h1>
          {readOnly ? <Badge tone="info">View only</Badge> : null}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <EmptyState message={typeof children === 'string' ? children : 'No data found'} />;
}

/** Shared empty section: light logo watermark + message */
export function EmptyState({
  message = 'No data found',
  className,
  children,
}: {
  message?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'relative flex min-h-[11rem] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-10',
        'dark:border-slate-700 dark:bg-slate-900/50',
        className,
      )}
    >
      <img
        src="/images/cs-trust-logo.png"
        alt=""
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 z-0',
          'h-32 w-32 -translate-x-1/2 -translate-y-1/2 select-none object-contain sm:h-40 sm:w-40',
          /* Fade + lift dark logo plate so emblem reads as light gray watermark */
          'opacity-10 grayscale brightness-[2.8] contrast-75',
          'dark:opacity-10 dark:brightness-[2.2]',
        )}
      />
      <p className="relative z-[1] text-sm font-medium tracking-tight text-slate-400 dark:text-slate-500">
        {message}
      </p>
      {children ? <div className="relative z-[1] mt-3">{children}</div> : null}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const level = progressLevel(clamped);
  const stops = progressRingStops[level];
  const reactId = useId().replace(/:/g, '');
  const gradId = `progress-ring-${reactId}`;
  const center = size / 2;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 block -rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops.from} />
            {stops.via ? <stop offset="50%" stopColor={stops.via} /> : null}
            <stop offset="100%" stopColor={stops.to} />
          </linearGradient>
        </defs>
        {/* Solid gray track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200 dark:text-slate-600"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-bold leading-none text-slate-800 dark:text-slate-100">
        {clamped}%
      </span>
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  trackClassName,
  /** `logo` = continuous orange→blue (emblem). `level` = health-tinted variant of same palette. */
  variant = 'logo',
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  variant?: 'logo' | 'level';
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const level = progressLevel(clamped);
  const fillGradient =
    variant === 'logo' ? progressBarLogoGradient : progressBarGradient[level];

  return (
    <div
      className={cn(progressTrackClass, trackClassName, className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out',
          fillGradient,
          clamped > 0 &&
            'shadow-[0_0_10px_-1px_rgba(0,114,188,0.35),0_0_6px_-2px_rgba(245,130,32,0.25)]',
        )}
        style={{ width: `${clamped}%` }}
      >
        {/* Soft top sheen for a glassy, sleek fill */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './icons';
import { cn } from '../../utils/cn';
import { localDateKey } from '../../utils/date';

export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type CalendarDayTone = 'success' | 'warning' | 'info' | 'brand' | 'neutral';

export type CalendarDayMeta = {
  tone?: CalendarDayTone;
  label?: string;
  count?: number;
};

const toneDot: Record<CalendarDayTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  brand: 'bg-brand-500',
  neutral: 'bg-slate-400',
};

const toneLabel: Record<CalendarDayTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-sky-700 dark:text-sky-400',
  brand: 'text-brand-700 dark:text-brand-300',
  neutral: 'text-slate-500 dark:text-slate-400',
};

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function MonthCalendar({
  monthDate,
  onMonthChange,
  selectedDate,
  onSelectDate,
  title,
  subtitle = 'Pick a day',
  getDayMeta,
  legend,
  className,
}: {
  monthDate: Date;
  onMonthChange: (next: Date) => void;
  selectedDate?: string;
  onSelectDate?: (dateKey: string) => void;
  title?: string;
  subtitle?: string;
  getDayMeta?: (dateKey: string) => CalendarDayMeta | null | undefined;
  legend?: ReactNode;
  className?: string;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const todayKey = localDateKey();
  const monthLabel =
    title ??
    new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
    }).format(monthDate);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: formatDateKey(year, month, day), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(year, month + delta, 1));
  };

  return (
    <div
      className={cn(
        'cs-calendar overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]',
        'dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-[0_10px_30px_-24px_rgba(0,0,0,0.65)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-orange-50/80 via-white to-sky-50/70 px-4 py-3.5 dark:border-slate-800 dark:from-orange-950/25 dark:via-slate-900 dark:to-sky-950/30">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-sm shadow-orange-500/20">
            <IconCalendar className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {monthLabel}
            </p>
            {subtitle ? <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="cs-calendar-nav inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10"
            aria-label="Previous month"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
              onSelectDate?.(localDateKey(now));
            }}
            className="h-9 rounded-xl border border-slate-200/90 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-orange-950/30 dark:hover:text-brand-200"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="cs-calendar-nav inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10"
            aria-label="Next month"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/90 px-1 dark:border-slate-800 dark:bg-slate-950/50">
        {CALENDAR_WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-1 py-2.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr p-1 sm:p-1.5">
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[3.75rem] rounded-xl sm:min-h-[4.35rem]"
                aria-hidden
              />
            );
          }

          const meta = getDayMeta?.(cell.key);
          const tone = meta?.tone ?? 'neutral';
          const isSelected = selectedDate === cell.key;
          const isToday = cell.key === todayKey;
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const interactive = Boolean(onSelectDate);

          const dayClass = cn(
            'group relative flex min-h-[3.75rem] flex-col items-start gap-1 rounded-xl p-1.5 text-left transition sm:min-h-[4.35rem] sm:p-2',
            isWeekend
              ? 'bg-slate-50/70 dark:bg-slate-950/35'
              : 'bg-transparent dark:bg-transparent',
            interactive && !isSelected && 'hover:bg-sky-50/90 dark:hover:bg-sky-500/10',
            isSelected &&
              'bg-gradient-to-br from-sky-50 to-orange-50 ring-2 ring-inset ring-sky-400/90 dark:from-sky-500/15 dark:to-orange-500/10 dark:ring-sky-400',
            !interactive && 'cursor-default',
          );

          const dayNumber = (
            <span className="flex w-full items-center justify-between gap-1">
              <span
                className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition',
                  isToday && 'bg-gradient-to-br from-brand-500 to-orange-600 text-white shadow-sm shadow-orange-500/25',
                  !isToday &&
                    isSelected &&
                    'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-100',
                  !isToday &&
                    !isSelected &&
                    'text-slate-700 group-hover:bg-white group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:bg-slate-800',
                )}
              >
                {cell.day}
              </span>
              {meta?.count && meta.count > 0 ? (
                <span className="hidden text-[0.62rem] font-semibold text-slate-400 sm:inline">
                  {meta.count}
                </span>
              ) : null}
            </span>
          );

          const markers =
            meta && (meta.tone || meta.label) ? (
              <span className="mt-auto flex w-full flex-wrap items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2', toneDot[tone])} />
                {meta.label ? (
                  <span
                    className={cn(
                      'hidden truncate text-[0.62rem] font-medium sm:inline',
                      toneLabel[tone],
                    )}
                  >
                    {meta.label}
                  </span>
                ) : null}
              </span>
            ) : null;

          if (!interactive) {
            return (
              <div key={cell.key} className={dayClass}>
                {dayNumber}
                {markers}
              </div>
            );
          }

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate?.(cell.key)}
              aria-pressed={isSelected}
              aria-label={cell.key}
              className={dayClass}
            >
              {dayNumber}
              {markers}
            </button>
          );
        })}
      </div>

      {legend !== undefined ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {legend}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Today
          </span>
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Selected
          </span>
        </div>
      )}
    </div>
  );
}

export function CalendarLegendItem({
  tone = 'neutral',
  label,
}: {
  tone?: CalendarDayTone;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-500 dark:text-slate-400">
      <span className={cn('h-2 w-2 rounded-full', toneDot[tone])} />
      {label}
    </span>
  );
}

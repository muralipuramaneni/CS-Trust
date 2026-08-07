import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { IconX } from './icons';

/**
 * Full-viewport dialog with standard scrim:
 * covers sidebar + header + content (ported to document.body).
 * Panel sizes to content; vertical scroll only kicks in past max height.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/55"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative z-10 flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-lg',
          'border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900',
          className,
        )}
      >
        <div className="relative shrink-0 border-b border-slate-100 py-4 pl-5 pr-12 dark:border-slate-800">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        {/* overflow-y only when content exceeds remaining space under max-h */}
        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

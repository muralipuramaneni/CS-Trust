import { useState } from 'react';
import { cn } from '../../utils/cn';
import { IconCheck, IconCopy } from './icons';

/** Temporary password with one-click copy. */
export function CopyableTempPassword({
  value,
  className,
  textClassName,
}: {
  value: string;
  className?: string;
  textClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }

  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5', className)}>
      <span
        className={cn(
          'break-all font-mono font-semibold text-sky-700 dark:text-sky-300',
          textClassName,
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition',
          'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-orange-950/30 dark:hover:text-brand-300',
          copied &&
            'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
        )}
        aria-label={copied ? 'Copied' : 'Copy temporary password'}
        title={copied ? 'Copied' : 'Copy'}
      >
        {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

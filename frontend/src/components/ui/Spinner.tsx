import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      role="status"
      aria-label={label}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div
      className="grid min-h-screen place-items-center bg-surface font-sans text-muted"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Spinner className="text-brand-600" />
        <span>{message}</span>
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  children: ReactNode;
}

export function InlineLoader({ children }: InlineLoaderProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner className="size-4 border-white/30 border-t-white" label="" />
      {children}
    </span>
  );
}

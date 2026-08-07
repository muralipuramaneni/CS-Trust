import { useId, useState, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Input } from './Input';
import { IconEye, IconEyeOff } from './icons';

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
}

export function PasswordInput({
  hasError = false,
  className = '',
  id,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={visible ? 'text' : 'password'}
        hasError={hasError}
        disabled={disabled}
        className={cn('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        onClick={() => setVisible((value) => !value)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={inputId}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <IconEyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <IconEye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

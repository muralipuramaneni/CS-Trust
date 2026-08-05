import { useId, useState, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Input } from './Input';

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
        className={cn('pr-16', className)}
        {...props}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
        onClick={() => setVisible((value) => !value)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={inputId}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

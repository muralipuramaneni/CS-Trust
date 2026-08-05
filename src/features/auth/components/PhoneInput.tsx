import type { InputHTMLAttributes } from 'react';
import { Input } from '../../../components/ui';
import { cn } from '../../../utils/cn';

interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

/** +91 phone field used across signup & forgot password */
export function PhoneInput({
  id,
  value,
  onChange,
  hasError,
  disabled,
  className,
  ...props
}: PhoneInputProps) {
  return (
    <div className="flex gap-2">
      <span
        className="inline-flex h-12 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600"
        aria-hidden="true"
      >
        +91
      </span>
      <Input
        id={id}
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="9876543210"
        value={value}
        hasError={hasError}
        disabled={disabled}
        maxLength={10}
        className={cn('min-w-0', className)}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, '').slice(0, 10))
        }
        {...props}
      />
    </div>
  );
}

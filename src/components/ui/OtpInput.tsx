import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '../../utils/cn';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  hasError = false,
  id = 'otp',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (!disabled) {
      inputsRef.current[0]?.focus();
    }
  }, [disabled]);

  function updateDigit(index: number, next: string) {
    const clean = next.replace(/\D/g, '');
    if (!clean && next !== '') return;

    const chars = digits.slice();
    chars[index] = clean.slice(-1);
    onChange(chars.join(''));

    if (clean && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div
      className="flex justify-between gap-2 sm:gap-2.5"
      role="group"
      aria-label="One-time password"
    >
      {digits.map((digit, index) => (
        <input
          key={`${id}-${index}`}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          id={index === 0 ? id : undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid ?? hasError}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-full max-w-12 rounded-lg border bg-white text-center text-lg font-semibold text-ink transition-all',
            'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15',
            'disabled:cursor-not-allowed disabled:opacity-60',
            hasError
              ? 'border-danger bg-danger-soft/40 focus:border-danger focus:ring-danger/15'
              : 'border-slate-200 hover:border-slate-300',
          )}
        />
      ))}
    </div>
  );
}

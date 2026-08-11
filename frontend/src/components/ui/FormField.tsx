import type { ReactNode } from 'react';
import { cloneElement, isValidElement, type ReactElement } from 'react';
import { cn } from '../../utils/cn';
import { Label } from './Label';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

type FieldControlProps = {
  id?: string;
  className?: string;
  hasError?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
};

export function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const invalid = Boolean(error);

  let control = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<FieldControlProps>;
    const isDom = typeof child.type === 'string';
    const props: FieldControlProps = {
      id: child.props.id ?? id,
      'aria-invalid': invalid || undefined,
      'aria-describedby': describedBy,
      'aria-required': required || undefined,
    };

    if (!isDom) {
      props.hasError = invalid;
    } else {
      props.className = cn(
        child.props.className,
        invalid &&
          'border-danger bg-danger-soft/40 focus:border-danger focus:ring-danger/15 dark:bg-red-950/40',
      );
    }

    control = cloneElement(child, props);
  }

  return (
    <div className="flex w-full flex-col">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="w-full">{control}</div>
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-[0.75rem] leading-snug text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

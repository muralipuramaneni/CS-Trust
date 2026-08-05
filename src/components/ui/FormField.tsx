import type { ReactNode } from 'react';
import { cloneElement, isValidElement, type ReactElement } from 'react';
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

  const control =
    isValidElement(children) && typeof children.type !== 'string'
      ? cloneElement(children as ReactElement<FieldControlProps>, {
          id,
          'aria-invalid': Boolean(error) || undefined,
          'aria-describedby': describedBy,
          'aria-required': required || undefined,
        })
      : children;

  return (
    <div className="flex w-full flex-col">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="w-full">{control}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.75rem] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

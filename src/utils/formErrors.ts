/** Login-style field error messages for forms and modals */

export type FieldErrors = Partial<Record<string, string>>;

/** e.g. enterField('your email address') → "Enter your email address." */
export function enterField(label: string): string {
  return `Enter ${label}.`;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function clearFieldError(errors: FieldErrors, key: string): FieldErrors {
  if (!(key in errors)) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}

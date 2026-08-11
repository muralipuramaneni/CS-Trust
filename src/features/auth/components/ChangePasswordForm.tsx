import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  InlineLoader,
  PasswordInput,
} from '../../../components/ui';
import { Label } from '../../../components/ui/Label';
import { IconInfo } from '../../../components/ui/icons';
import { getPasswordStrength } from '../../../utils/validation';
import { roleHomePath } from '../../../types/auth';
import { useAuth } from '../hooks/useAuth';
import {
  AuthActionsRow,
  AuthForm,
  authPrimaryButtonClass,
} from './AuthChrome';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

function passwordStrengthBarClass(percent: number) {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 55) return 'bg-sky-500';
  if (percent >= 35) return 'bg-amber-500';
  return 'bg-rose-500';
}

function passwordStrengthTextClass(percent: number) {
  if (percent >= 80) return 'text-emerald-700 dark:text-emerald-300';
  if (percent >= 55) return 'text-sky-700 dark:text-sky-300';
  if (percent >= 35) return 'text-amber-700 dark:text-amber-300';
  return 'text-rose-700 dark:text-rose-300';
}

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const strength = getPasswordStrength(newPassword);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!currentPassword) next.currentPassword = 'Enter the temporary password from your admin.';
    if (!newPassword) next.newPassword = 'Enter a new password.';
    else if (!strength.checks.minLength) {
      next.newPassword = 'Password must be at least 8 characters.';
    } else if (!strength.checks.specialChar) {
      next.newPassword = 'Password must include at least one special character (e.g. !@#$%).';
    } else if (!strength.isValid) {
      next.newPassword = 'Password does not meet the minimum requirements.';
    } else if (currentPassword && newPassword === currentPassword) {
      next.newPassword = 'New password must be different from the temporary password.';
    }
    if (!confirmPassword) next.confirmPassword = 'Confirm your new password.';
    else if (confirmPassword !== newPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    return next;
  }

  async function goToLogin() {
    if (isSigningOut || isSubmitting) return;
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await changePassword(currentPassword, newPassword);
      navigate(roleHomePath(user?.role ?? 'admin'), { replace: true });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : 'Unable to update password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
      <Alert variant="info">
        You signed in with a temporary password. Set your own password to continue. Use this new
        password for future logins.
      </Alert>

      <div className="flex w-full flex-col">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Label htmlFor="current-password" required className="!mb-0">
            Temporary password
          </Label>
          <span className="group relative inline-flex">
            <button
              type="button"
              className="inline-flex rounded-full p-0.5 text-slate-400 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-500 dark:hover:text-sky-400"
              aria-label="Please paste the password given by the admin"
            >
              <IconInfo className="h-3.5 w-3.5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[0.7rem] font-medium leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-slate-700"
            >
              Please paste the password given by the admin
              <span
                className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-700"
                aria-hidden
              />
            </span>
          </span>
        </div>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isSubmitting || isSigningOut}
          hasError={Boolean(errors.currentPassword)}
          aria-invalid={Boolean(errors.currentPassword) || undefined}
          aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
          aria-required
        />
        {errors.currentPassword ? (
          <p
            id="current-password-error"
            className="mt-1.5 text-[0.75rem] leading-snug text-danger"
            role="alert"
          >
            {errors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col">
        <FormField id="new-password" label="New password" required error={errors.newPassword}>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.newPassword;
                  return next;
                });
              }
            }}
            disabled={isSubmitting || isSigningOut}
            hasError={Boolean(errors.newPassword)}
          />
        </FormField>

        {/* Password level format: % strength + rule checklist */}
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Password strength</span>
            <span
              className={`font-semibold tabular-nums ${passwordStrengthTextClass(strength.percent)}`}
            >
              {newPassword ? `${strength.percent}% · ${strength.label}` : '0% · Weak'}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={newPassword ? strength.percent : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Password strength"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${passwordStrengthBarClass(strength.percent)}`}
              style={{ width: `${newPassword ? strength.percent : 0}%` }}
            />
          </div>
          <ul className="grid gap-1 text-[0.72rem] text-slate-500 dark:text-slate-400 sm:grid-cols-2">
            <li
              className={
                strength.checks.minLength
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : undefined
              }
            >
              {strength.checks.minLength ? '✓' : '○'} Min 8 characters
            </li>
            <li
              className={
                strength.checks.specialChar
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : undefined
              }
            >
              {strength.checks.specialChar ? '✓' : '○'} Special character (!@#$…)
            </li>
            <li
              className={
                strength.checks.uppercase
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : undefined
              }
            >
              {strength.checks.uppercase ? '✓' : '○'} Uppercase letter
            </li>
            <li
              className={
                strength.checks.lowercase
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : undefined
              }
            >
              {strength.checks.lowercase ? '✓' : '○'} Lowercase letter
            </li>
            <li
              className={
                strength.checks.number
                  ? 'font-medium text-emerald-700 dark:text-emerald-300'
                  : undefined
              }
            >
              {strength.checks.number ? '✓' : '○'} Number
            </li>
          </ul>
        </div>
      </div>

      <FormField
        id="confirm-password"
        label="Confirm new password"
        required
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting || isSigningOut}
        />
      </FormField>

      <AuthActionsRow className="justify-between">
        <button
          type="button"
          disabled={isSubmitting || isSigningOut}
          onClick={() => void goToLogin()}
          className="text-sm font-medium text-sky-600 transition hover:text-sky-700 hover:underline disabled:pointer-events-none disabled:opacity-50 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {isSigningOut ? 'Signing out…' : 'Back to sign in'}
        </button>
        <Button
          type="submit"
          className={authPrimaryButtonClass}
          disabled={isSubmitting || isSigningOut}
        >
          {isSubmitting ? <InlineLoader>Saving…</InlineLoader> : 'Save new password'}
        </Button>
      </AuthActionsRow>
    </AuthForm>
  );
}

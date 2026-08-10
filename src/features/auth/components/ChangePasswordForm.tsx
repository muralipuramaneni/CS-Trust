import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  InlineLoader,
  PasswordInput,
} from '../../../components/ui';
import { isValidPassword } from '../../../utils/validation';
import { roleHomePath } from '../../../types/auth';
import { useAuth } from '../hooks/useAuth';
import {
  AuthActionsRow,
  AuthForm,
  AuthHelperCard,
  AuthPillLink,
  authPrimaryButtonClass,
} from './AuthChrome';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!currentPassword) next.currentPassword = 'Enter your temporary / current password.';
    if (!newPassword) next.newPassword = 'Enter a new password.';
    else if (!isValidPassword(newPassword)) {
      next.newPassword = 'Password must be at least 8 characters.';
    } else if (currentPassword && newPassword === currentPassword) {
      next.newPassword = 'New password must be different from the temporary password.';
    }
    if (!confirmPassword) next.confirmPassword = 'Confirm your new password.';
    else if (confirmPassword !== newPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    return next;
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

      <FormField
        id="current-password"
        label="Temporary / current password"
        required
        error={errors.currentPassword}
      >
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </FormField>

      <FormField id="new-password" label="New password" required error={errors.newPassword}>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormField>

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
        />
      </FormField>

      <AuthActionsRow>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void logout().then(() => navigate('/login', { replace: true }))}
        >
          Sign out
        </Button>
        <Button type="submit" className={authPrimaryButtonClass} disabled={isSubmitting}>
          {isSubmitting ? <InlineLoader>Saving…</InlineLoader> : 'Save new password'}
        </Button>
      </AuthActionsRow>

      <AuthHelperCard title="Need a new temporary password?">
        <p className="text-xs text-slate-500">
          Ask an administrator to reset your password. They will share a temporary password for your
          next login.
        </p>
        <div className="mt-3">
          <AuthPillLink to="/login">Back to sign in</AuthPillLink>
        </div>
      </AuthHelperCard>
    </AuthForm>
  );
}

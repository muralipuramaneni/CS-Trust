import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  InlineLoader,
  Input,
  PasswordInput,
} from '../../../components/ui';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidPassword,
} from '../../../utils/validation';
import { useAuth } from '../hooks/useAuth';
import { roleHomePath } from '../../../types/auth';
import {
  AuthActionsRow,
  AuthForm,
  AuthHelperCard,
  AuthPillLink,
  AuthTextLink,
  authPrimaryButtonClass,
} from './AuthChrome';
import { PhoneInput } from './PhoneInput';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export function SignupForm() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!name.trim()) next.name = 'Enter your full name.';
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!phone.trim()) next.phone = 'Enter your mobile number.';
    else if (!isValidIndianPhone(phone)) {
      next.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!password) next.password = 'Create a password.';
    else if (!isValidPassword(password)) next.password = 'Use at least 8 characters.';
    if (!confirmPassword) next.confirmPassword = 'Confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
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
      const user = await signup({ name, email, phone, password });
      navigate(roleHomePath(user.role), { replace: true });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : 'Unable to create account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}

      <FormField id="signup-name" label="Full name" required error={errors.name}>
        <Input
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          value={name}
          hasError={Boolean(errors.name)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setName(event.target.value)}
        />
      </FormField>

      <FormField id="signup-email" label="Email address" required error={errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@chaitanyasaradhi.org"
          value={email}
          hasError={Boolean(errors.email)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>

      <FormField
        id="signup-phone"
        label="Mobile number"
        required
        error={errors.phone}
        hint="Used for OTP during password reset."
      >
        <PhoneInput
          id="signup-phone"
          value={phone}
          onChange={setPhone}
          hasError={Boolean(errors.phone)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          aria-invalid={Boolean(errors.phone) || undefined}
          aria-describedby={errors.phone ? 'signup-phone-error' : 'signup-phone-hint'}
        />
      </FormField>

      <FormField
        id="signup-password"
        label="Password"
        required
        error={errors.password}
        hint="Minimum 8 characters."
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          hasError={Boolean(errors.password)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>

      <FormField
        id="signup-confirm-password"
        label="Confirm password"
        required
        error={errors.confirmPassword}
      >
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirmPassword}
          hasError={Boolean(errors.confirmPassword)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </FormField>

      <AuthActionsRow>
        <AuthTextLink to="/forgot-password">Forgot password?</AuthTextLink>
        <AuthPillLink to="/login">Sign in</AuthPillLink>
      </AuthActionsRow>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className={authPrimaryButtonClass}>
        {isSubmitting ? <InlineLoader>Creating account…</InlineLoader> : 'Create your account'}
      </Button>

      <AuthHelperCard title="Mobile number is required for secure OTP password recovery." />
    </AuthForm>
  );
}

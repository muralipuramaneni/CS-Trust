import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  InlineLoader,
  Input,
  PasswordInput,
} from '../../../components/ui';
import { isValidEmail } from '../../../utils/validation';
import { roleHomePath } from '../../../types/auth';
import { useAuth } from '../hooks/useAuth';
import {
  AuthActionsRow,
  AuthDemoPill,
  AuthForm,
  AuthHelperCard,
  AuthPillLink,
  AuthTextLink,
  authPrimaryButtonClass,
} from './AuthChrome';

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@chaitanyasaradhi.org',
    password: 'demo123',
  },
  {
    label: 'Teacher',
    email: 'teacher@chaitanyasaradhi.org',
    password: 'demo123',
  },
  {
    label: 'Sponsor',
    email: 'sponsor@chaitanyasaradhi.org',
    password: 'demo123',
  },
] as const;

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@chaitanyasaradhi.org');
  const [password, setPassword] = useState('demo123');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
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
      const user = await login({ email, password, rememberMe: true });
      const home = roleHomePath(user.role);
      const target =
        from &&
        from !== '/login' &&
        from !== '/signup' &&
        from !== '/dashboard' &&
        from.startsWith(home)
          ? from
          : home;
      navigate(target, { replace: true });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthForm onSubmit={handleSubmit}>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}

      <FormField id="login-email" label="Email address" required error={errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="admin@chaitanyasaradhi.org"
          value={email}
          hasError={Boolean(errors.email)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>

      <FormField id="login-password" label="Password" required error={errors.password}>
        <PasswordInput
          name="password"
          autoComplete="current-password"
          placeholder="Enter password"
          value={password}
          hasError={Boolean(errors.password)}
          disabled={isSubmitting}
          className="rounded-lg border-slate-200 bg-slate-50"
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>

      {/* Attachment order: Forgot left · Create account right */}
      <AuthActionsRow>
        <AuthTextLink to="/forgot-password">Forgot password?</AuthTextLink>
        <AuthPillLink to="/signup">Create account</AuthPillLink>
      </AuthActionsRow>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className={authPrimaryButtonClass}>
        {isSubmitting ? <InlineLoader>Signing in…</InlineLoader> : 'Continue to dashboard'}
      </Button>

      <AuthHelperCard
        title={
          <>
            Quick demo access · password{' '}
            <span className="font-semibold text-slate-700">demo123</span>
          </>
        }
      >
        <div
          className="flex flex-wrap justify-center gap-2"
          role="group"
          aria-label="Demo accounts"
        >
          {DEMO_ACCOUNTS.map((account) => (
            <AuthDemoPill
              key={account.label}
              disabled={isSubmitting}
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setErrors({});
              }}
            >
              {account.label}
            </AuthDemoPill>
          ))}
        </div>
      </AuthHelperCard>
    </AuthForm>
  );
}

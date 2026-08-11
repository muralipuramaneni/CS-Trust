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
    role: 'admin',
    email: 'admin@chaitanyasaradhi.org',
    password: 'demo1234',
  },
  {
    label: 'Teacher',
    role: 'teacher',
    email: 'teacher@chaitanyasaradhi.org',
    password: 'demo1234',
  },
  {
    label: 'Sponsor',
    role: 'sponsor',
    email: 'sponsor@chaitanyasaradhi.org',
    password: 'demo1234',
  },
] as const;

type DemoRole = (typeof DEMO_ACCOUNTS)[number]['role'];

function isAdminLoginContext(role: DemoRole | null, email: string) {
  if (role === 'admin') return true;
  if (role === 'teacher' || role === 'sponsor') return false;
  const e = email.trim().toLowerCase();
  return e.includes('admin@') || e.startsWith('superadmin') || e.includes('superadmin@');
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@chaitanyasaradhi.org');
  const [password, setPassword] = useState('demo1234');
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>('admin');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const showAdminPasswordHelp = isAdminLoginContext(selectedRole, email);

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
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const home = roleHomePath(user.role);
      const target =
        from &&
        from !== '/login' &&
        from !== '/signup' &&
        from !== '/forgot-password' &&
        from !== '/change-password' &&
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
          onChange={(event) => {
            setEmail(event.target.value);
            setSelectedRole(null);
          }}
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

      <AuthActionsRow>
        {showAdminPasswordHelp ? (
          <p className="text-sm leading-snug text-slate-500 dark:text-slate-400">
            Please contact tech support to reset admin password. Ph:{' '}
            <a
              href="tel:7671095380"
              className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              7671095380
            </a>
          </p>
        ) : (
          <AuthTextLink to="/forgot-password">Forgot password? Ask admin</AuthTextLink>
        )}
      </AuthActionsRow>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className={authPrimaryButtonClass}>
        {isSubmitting ? <InlineLoader>Signing in…</InlineLoader> : 'Sign in'}
      </Button>

      <AuthHelperCard
        title={
          <>
            Quick demo access · password{' '}
            <span className="font-semibold text-slate-700">demo1234</span>
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
                setSelectedRole(account.role);
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

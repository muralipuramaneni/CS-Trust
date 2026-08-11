import { Navigate, Link } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Alert, LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { roleHomePath } from '../../../types/auth';
import { AuthHelperCard, AuthPillLink } from '../components/AuthChrome';

export function ForgotPasswordPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && user && !user.mustChangePassword) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }
  if (isAuthenticated && user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Password resets are handled by your administrator."
    >
      <div className="space-y-4">
        <Alert variant="info">
          OTP self-reset is disabled. Contact a Trust Admin and ask them to reset your password.
          They will give you a temporary password. On your next login you must set your own
          password.
        </Alert>
        <AuthHelperCard title="Already have a temporary password?">
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <AuthPillLink to="/login">Sign in</AuthPillLink>
          </div>
        </AuthHelperCard>
        <p className="text-center text-xs text-slate-500">
          Admins: open Teacher / Sponsor details and use <strong>Reset password</strong>.
        </p>
        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-sky-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

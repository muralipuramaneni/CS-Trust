import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { Alert, LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { roleHomePath } from '../../../types/auth';
import { AuthActionsRow, AuthTextLink } from '../components/AuthChrome';

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
      <div className="space-y-5">
        <Alert variant="info">
          OTP self-reset is disabled.{' '}
          <strong className="font-semibold text-inherit">
            Contact a Trust Admin and ask them to reset your password.
          </strong>{' '}
          They will give you a temporary password. On your next login you must set your own
          password.
        </Alert>
        <AuthActionsRow className="justify-center">
          <AuthTextLink to="/login">Back to sign in</AuthTextLink>
        </AuthActionsRow>
      </div>
    </AuthLayout>
  );
}

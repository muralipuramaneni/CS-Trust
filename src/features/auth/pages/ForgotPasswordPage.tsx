import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { roleHomePath } from '../../../types/auth';

export function ForgotPasswordPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && user) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Verify your registered mobile number with OTP, then choose a new password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

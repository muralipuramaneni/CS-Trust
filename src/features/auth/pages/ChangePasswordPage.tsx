import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { roleHomePath } from '../../../types/auth';

export function ChangePasswordPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return (
    <AuthLayout
      title="Set your password"
      subtitle="First login or admin reset requires you to choose a new password before continuing."
    >
      <ChangePasswordForm />
    </AuthLayout>
  );
}

import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { roleHomePath } from '../../../types/auth';

export function LoginPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && user) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your portal"
      subtitle="Access schools, teachers, attendance, assets, and impact tools for Chaitanya Saradhi."
    >
      <LoginForm />
    </AuthLayout>
  );
}

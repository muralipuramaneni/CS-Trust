import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoadingScreen } from '../../../components/ui';
import { useAuth } from '../hooks/useAuth';
import { SignupForm } from '../components/SignupForm';
import { roleHomePath } from '../../../types/auth';

export function SignupPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && user) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <AuthLayout
      eyebrow="Join the portal"
      title="Create your account"
      subtitle="Register to access programs, schools, and impact tools for Chaitanya Saradhi."
    >
      <SignupForm />
    </AuthLayout>
  );
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { LoadingScreen } from '../components/ui';
import { roleHomePath } from '../types/auth';

/** Authenticated users go to their role home; guests go to login */
export function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Navigate to={roleHomePath(user.role)} replace />;
}

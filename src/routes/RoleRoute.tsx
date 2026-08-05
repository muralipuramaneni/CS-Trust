import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { LoadingScreen } from '../components/ui';
import type { UserRole } from '../types/auth';
import { roleHomePath } from '../types/auth';
import { DashboardLayout } from '../components/layout/DashboardLayout';

interface RoleRouteProps {
  allow: UserRole[];
  children: ReactNode;
}

export function RoleRoute({ allow, children }: RoleRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

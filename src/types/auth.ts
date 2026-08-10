export type UserRole = 'admin' | 'teacher' | 'sponsor';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  schoolId?: string;
  schoolIds?: string[];
  /** True when account uses a temporary password and must set a new one. */
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface StoredUserAccount extends AuthUser {
  password: string;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher';
    case 'sponsor':
      return '/sponsor';
    default:
      return '/login';
  }
}

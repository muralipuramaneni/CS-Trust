import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginCredentials, SignupPayload } from '../../../types/auth';
import {
  clearSession,
  ensureSeedUsers,
  loginWithPassword,
  persistSession,
  readSession,
  registerUser,
} from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ensureSeedUsers();
    setUser(readSession());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextUser = await loginWithPassword(credentials.email, credentials.password);
    setUser(nextUser);
    persistSession(nextUser, Boolean(credentials.rememberMe));
    return nextUser;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    const nextUser = await registerUser(payload);
    setUser(nextUser);
    persistSession(nextUser, true);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    clearSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
    }),
    [user, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

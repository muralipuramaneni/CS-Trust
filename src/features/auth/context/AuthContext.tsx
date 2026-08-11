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
  changePassword as changePasswordService,
  clearSession,
  loginWithPassword,
  logoutRemote,
  persistSession,
  registerUser,
  restoreSession,
} from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await restoreSession();
      if (!cancelled) {
        setUser(next);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextUser = await loginWithPassword(
      credentials.email,
      credentials.password,
      Boolean(credentials.rememberMe),
    );
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
    await logoutRemote();
    clearSession();
  }, []);

  const refreshUser = useCallback(async () => {
    const next = await restoreSession();
    setUser(next);
    return next;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordService(currentPassword, newPassword);
      const next = await restoreSession();
      setUser(next);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      signup,
      logout,
      changePassword,
      refreshUser,
    }),
    [user, isLoading, login, signup, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

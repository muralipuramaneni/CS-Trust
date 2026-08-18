import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginCredentials, SignupPayload } from '../../../types/auth';
import { setUnauthorizedHandler } from '../../../api/client';
import {
  changePassword as changePasswordService,
  clearSession,
  loginWithPassword,
  loginWithGoogle,
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
  loginWithGoogle: (
    payload: { idToken?: string; accessToken?: string; role?: 'admin' | 'teacher' | 'sponsor' },
    rememberMe?: boolean,
  ) => Promise<AuthUser>;
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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
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

  const loginWithGoogleHandler = useCallback(
    async (
      payload: { idToken?: string; accessToken?: string; role?: 'admin' | 'teacher' | 'sponsor' },
      rememberMe = true,
    ) => {
      const nextUser = await loginWithGoogle(payload, rememberMe);
      setUser(nextUser);
      persistSession(nextUser, rememberMe);
      return nextUser;
    },
    [],
  );

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
      try {
        const next = await restoreSession();
        if (next) {
          setUser(next);
          return;
        }
      } catch {
        // Password already changed — keep session and clear the force-change flag.
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      loginWithGoogle: loginWithGoogleHandler,
      signup,
      logout,
      changePassword,
      refreshUser,
    }),
    [user, isLoading, login, loginWithGoogleHandler, signup, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

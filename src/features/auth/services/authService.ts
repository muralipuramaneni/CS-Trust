import type { AuthUser, SignupPayload, UserRole } from '../../../types/auth';
import {
  changePasswordApi,
  clearAccessToken,
  fetchMe,
  getAccessToken,
  loginApi,
  logoutApi,
  signupApi,
} from '../../../api';
import { clearStorage, readStorage, writeStorage } from '../../../utils/storage';
import {
  isValidEmail,
  isValidIndianPhone,
  isValidPassword,
  normalizeEmail,
  normalizePhone,
} from '../../../utils/validation';

const SESSION_KEY = 'cs-trust.auth';

interface StoredAuth {
  user: AuthUser;
}

const PHASE1_ROLES: UserRole[] = ['admin', 'teacher', 'sponsor'];

function normalizeRole(role: string | undefined): UserRole {
  if (role && PHASE1_ROLES.includes(role as UserRole)) return role as UserRole;
  if (role === 'staff' || role === 'director' || role === 'superadmin') return 'admin';
  return 'admin';
}

function sanitizeUser(user: AuthUser | null | undefined): AuthUser | null {
  if (!user?.id || !user.email || !user.name) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: normalizeRole(user.role),
    schoolId: user.schoolId,
    schoolIds: user.schoolIds,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function loginWithPassword(
  email: string,
  password: string,
  rememberMe = true,
): Promise<AuthUser> {
  if (!email.trim() || !password) {
    throw new Error('Email and password are required.');
  }

  try {
    const user = await loginApi(normalizeEmail(email), password, rememberMe);
    return sanitizeUser(user)!;
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error('Invalid email or password.');
  }
}

export async function registerUser(payload: SignupPayload): Promise<AuthUser> {
  const name = payload.name.trim();
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const { password } = payload;

  if (!name) throw new Error('Full name is required.');
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
  if (!isValidIndianPhone(phone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }
  if (!isValidPassword(password)) {
    throw new Error(
      'Password must be at least 8 characters and include a special character (!@#$…).',
    );
  }

  const user = await signupApi({ name, email, phone, password });
  return sanitizeUser(user)!;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword) throw new Error('Enter your current password.');
  if (!isValidPassword(newPassword)) {
    throw new Error(
      'Password must be at least 8 characters and include a special character (!@#$…).',
    );
  }
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.');
  }
  await changePasswordApi({ currentPassword, newPassword });
}

export function persistSession(user: AuthUser, rememberMe: boolean): void {
  const payload: StoredAuth = { user };
  if (rememberMe) {
    writeStorage(payload, SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    clearStorage(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }
}

export function readSession(): AuthUser | null {
  const durable = readStorage<StoredAuth>(SESSION_KEY);
  const durableUser = sanitizeUser(durable?.user);
  if (durableUser) return durableUser;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return sanitizeUser((JSON.parse(raw) as StoredAuth).user);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  clearStorage(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  clearAccessToken();
}

export async function restoreSession(): Promise<AuthUser | null> {
  const token = getAccessToken();
  if (!token) {
    clearSession();
    return null;
  }

  try {
    const user = sanitizeUser(await fetchMe());
    if (!user) {
      clearSession();
      return null;
    }
    const rememberMe = Boolean(localStorage.getItem('cs-trust.token'));
    persistSession(user, rememberMe);
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export async function logoutRemote(): Promise<void> {
  await logoutApi();
  clearSession();
}

/** No-op kept for AuthContext compatibility (users now live in PostgreSQL). */
export function ensureSeedUsers(): void {
  // users are seeded on the backend
}

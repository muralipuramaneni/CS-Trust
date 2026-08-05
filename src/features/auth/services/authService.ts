import type { AuthUser, SignupPayload, StoredUserAccount, UserRole } from '../../../types/auth';
import { clearStorage, readStorage, writeStorage } from '../../../utils/storage';
import {
  delay,
  isValidEmail,
  isValidIndianPhone,
  isValidPassword,
  normalizeEmail,
  normalizePhone,
} from '../../../utils/validation';

const USERS_KEY = 'cs-trust.users';
const SESSION_KEY = 'cs-trust.auth';
const OTP_KEY = 'cs-trust.otp';

/** Frontend-only demo OTP (shown in UI). Replace with SMS gateway later. */
export const DEMO_OTP = '123456';

interface StoredAuth {
  user: AuthUser;
}

interface OtpSession {
  phone: string;
  purpose: 'reset';
  otp: string;
  expiresAt: number;
  verified: boolean;
}

const PHASE1_ROLES: UserRole[] = ['admin', 'teacher', 'sponsor'];

function normalizeRole(role: string | undefined): UserRole {
  if (role && PHASE1_ROLES.includes(role as UserRole)) return role as UserRole;
  // Legacy staff/director accounts → admin for continuity
  if (role === 'staff' || role === 'director' || role === 'superadmin') return 'admin';
  return 'admin';
}

const seedUsers: StoredUserAccount[] = [
  {
    id: 'usr_super_01',
    name: 'Super Admin',
    email: 'superadmin@chaitanyasaradhi.org',
    phone: '9876543210',
    password: 'demo123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_admin_01',
    name: 'Trust Admin',
    email: 'admin@chaitanyasaradhi.org',
    phone: '9876543211',
    password: 'demo123',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_teacher_01',
    name: 'Priya Sharma',
    email: 'teacher@chaitanyasaradhi.org',
    phone: '9876543220',
    password: 'demo123',
    role: 'teacher',
    schoolId: 'sch_01',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_sponsor_01',
    name: 'Donor Sponsor',
    email: 'sponsor@chaitanyasaradhi.org',
    phone: '9876543230',
    password: 'demo123',
    role: 'sponsor',
    schoolIds: ['sch_01', 'sch_02'],
    createdAt: new Date().toISOString(),
  },
];

function getUsers(): StoredUserAccount[] {
  const stored = readStorage<StoredUserAccount[]>(USERS_KEY);
  if (!stored || stored.length === 0) {
    writeStorage(seedUsers, USERS_KEY);
    return [...seedUsers];
  }

  // Merge missing seeds + migrate legacy roles to Phase 1 roles
  let changed = false;
  const next = stored.map((user) => {
    const role = normalizeRole(user.role as string);
    if (role !== user.role) {
      changed = true;
      return { ...user, role };
    }
    return user;
  });
  for (const seed of seedUsers) {
    const idx = next.findIndex((user) => user.email === seed.email);
    if (idx < 0) {
      next.push(seed);
      changed = true;
    } else {
      // Refresh demo role assignments for known seed accounts
      const existing = next[idx];
      if (
        existing.role !== seed.role ||
        existing.schoolId !== seed.schoolId ||
        JSON.stringify(existing.schoolIds) !== JSON.stringify(seed.schoolIds)
      ) {
        next[idx] = {
          ...existing,
          role: seed.role,
          schoolId: seed.schoolId,
          schoolIds: seed.schoolIds,
          name: seed.name,
        };
        changed = true;
      }
    }
  }
  if (changed) writeStorage(next, USERS_KEY);
  return next;
}

function saveUsers(users: StoredUserAccount[]): void {
  writeStorage(users, USERS_KEY);
}

function toPublicUser(account: StoredUserAccount): AuthUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: normalizeRole(account.role),
    schoolId: account.schoolId,
    schoolIds: account.schoolIds,
  };
}

function findByEmail(email: string): StoredUserAccount | undefined {
  const normalized = normalizeEmail(email);
  return getUsers().find((user) => user.email === normalized);
}

function findByPhone(phone: string): StoredUserAccount | undefined {
  const normalized = normalizePhone(phone);
  return getUsers().find((user) => user.phone === normalized);
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthUser> {
  await delay(550);

  if (!email.trim() || !password) {
    throw new Error('Email and password are required.');
  }

  const account = findByEmail(email);
  if (!account || account.password !== password) {
    throw new Error('Invalid email or password.');
  }

  return toPublicUser(account);
}

export async function registerUser(payload: SignupPayload): Promise<AuthUser> {
  await delay(700);

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
    throw new Error('Password must be at least 8 characters.');
  }

  if (findByEmail(email)) {
    throw new Error('An account with this email already exists.');
  }

  if (findByPhone(phone)) {
    throw new Error('An account with this phone number already exists.');
  }

  const account: StoredUserAccount = {
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    name,
    email,
    phone,
    password,
    role: 'sponsor',
    schoolIds: [],
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(account);
  saveUsers(users);

  return toPublicUser(account);
}

export async function requestPasswordResetOtp(phone: string): Promise<{ maskedPhone: string; demoOtp: string }> {
  await delay(600);

  const normalized = normalizePhone(phone);
  if (!isValidIndianPhone(normalized)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.');
  }

  const account = findByPhone(normalized);
  if (!account) {
    throw new Error('No account found with this phone number.');
  }

  const session: OtpSession = {
    phone: normalized,
    purpose: 'reset',
    otp: DEMO_OTP,
    expiresAt: Date.now() + 5 * 60 * 1000,
    verified: false,
  };
  writeStorage(session, OTP_KEY);

  return {
    maskedPhone: `${normalized.slice(0, 2)}******${normalized.slice(-2)}`,
    demoOtp: DEMO_OTP,
  };
}

export async function verifyPasswordResetOtp(phone: string, otp: string): Promise<void> {
  await delay(450);

  const normalized = normalizePhone(phone);
  const session = readStorage<OtpSession>(OTP_KEY);

  if (!session || session.phone !== normalized || session.purpose !== 'reset') {
    throw new Error('OTP session expired. Please request a new code.');
  }

  if (Date.now() > session.expiresAt) {
    clearStorage(OTP_KEY);
    throw new Error('OTP has expired. Please request a new code.');
  }

  if (otp.trim() !== session.otp) {
    throw new Error('Invalid OTP. Please try again.');
  }

  writeStorage({ ...session, verified: true }, OTP_KEY);
}

export async function resetPasswordWithVerifiedOtp(
  phone: string,
  password: string,
): Promise<void> {
  await delay(550);

  const normalized = normalizePhone(phone);
  const session = readStorage<OtpSession>(OTP_KEY);

  if (!session || session.phone !== normalized || !session.verified) {
    throw new Error('Please verify OTP before resetting your password.');
  }

  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters.');
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.phone === normalized);
  if (index < 0) {
    throw new Error('Account not found.');
  }

  users[index] = { ...users[index], password };
  saveUsers(users);
  clearStorage(OTP_KEY);
}

export function persistSession(user: AuthUser, rememberMe: boolean): void {
  if (rememberMe) {
    writeStorage<StoredAuth>({ user }, SESSION_KEY);
  } else {
    // Keep session for the tab only via context; clear durable store
    clearStorage(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
  }
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
  };
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
}

export function ensureSeedUsers(): void {
  getUsers();
}

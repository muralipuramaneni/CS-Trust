export function delay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Keep digits only (Indian numbers: 10 digits after optional +91 / 0). */
export function normalizePhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 4) return phone;
  return `${normalized.slice(0, 2)}******${normalized.slice(-2)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}

export function isValidPassword(password: string): boolean {
  return getPasswordStrength(password).isValid;
}

/** Password strength meter data: min 8 + special character required. */
export type PasswordStrength = {
  score: number;
  percent: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  isValid: boolean;
  checks: {
    minLength: boolean;
    specialChar: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
  };
};

const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/;

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    specialChar: SPECIAL_CHAR_RE.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  let score = 0;
  if (checks.minLength) score += 35;
  if (checks.specialChar) score += 35;
  if (checks.uppercase) score += 10;
  if (checks.lowercase) score += 10;
  if (checks.number) score += 10;
  if (password.length >= 12) score = Math.min(100, score + 5);
  if (password.length >= 16) score = Math.min(100, score + 5);
  if (!password) score = 0;

  const isValid = checks.minLength && checks.specialChar;
  const percent = Math.min(100, Math.max(0, score));
  const label: PasswordStrength['label'] =
    percent >= 80 ? 'Strong' : percent >= 55 ? 'Good' : percent >= 35 ? 'Fair' : 'Weak';

  return { score, percent, label, isValid, checks };
}

export function formatPhoneDisplay(phone: string): string {
  const n = normalizePhone(phone);
  if (n.length !== 10) return phone;
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}

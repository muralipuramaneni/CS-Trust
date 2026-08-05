const AUTH_STORAGE_KEY = 'cs-trust.auth';

export function readStorage<T>(key: string = AUTH_STORAGE_KEY): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorage<T>(value: T, key: string = AUTH_STORAGE_KEY): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearStorage(key: string = AUTH_STORAGE_KEY): void {
  localStorage.removeItem(key);
}

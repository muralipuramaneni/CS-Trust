const TOKEN_KEY = 'cs-trust.token';
const TOKEN_SESSION_KEY = 'cs-trust.token.session';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  '/api/v1';

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_SESSION_KEY);
}

export function setAccessToken(token: string, rememberMe: boolean): void {
  clearAccessToken();
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
  }
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
}

/** Optional hook for session expiry — AuthProvider registers a redirect/clear handler. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data;
    if (response.status === 401 && token && !path.includes('/auth/login')) {
      clearAccessToken();
      onUnauthorized?.();
    }
    throw new ApiError(
      extractErrorMessage(detail, `Request failed (${response.status})`),
      response.status,
      detail,
    );
  }

  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete(path: string): Promise<void> {
  return apiRequest<void>(path, { method: 'DELETE' });
}

export function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

import { getRefreshToken, clearRefreshToken } from '../auth/tokenStore';

let accessToken: string | null = null;
export function setAccessToken(t: string | null) { accessToken = t; }
export function getAccessToken() { return accessToken; }

let onAuthFailure: () => void = () => {};
export function setOnAuthFailure(fn: () => void) { onAuthFailure = fn; }

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: any = {};
  try { body = await res.json(); } catch { /* non-JSON */ }
  if (Array.isArray(body?.errors)) {
    const fieldErrors: Record<string, string> = {};
    for (const e of body.errors) if (e?.path) fieldErrors[e.path] = e.msg ?? 'invalid';
    return new ApiError(res.status, 'Validation failed', fieldErrors);
  }
  return new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
}

let refreshing: Promise<string> | null = null;
async function refreshAccess(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new ApiError(401, 'No refresh token');
  const res = await fetch('/api/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) throw await parseError(res);
  const { accessToken: t } = await res.json();
  setAccessToken(t);
  return t;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, _retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401 && !_retried && getRefreshToken()) {
    try {
      refreshing ??= refreshAccess().finally(() => { refreshing = null; });
      await refreshing;
    } catch {
      clearRefreshToken(); setAccessToken(null); onAuthFailure();
      throw await parseError(res);
    }
    return apiFetch<T>(path, init, true);   // retry ONCE
  }
  if (res.status === 401 && _retried) {     // retried and still 401 → give up
    clearRefreshToken(); setAccessToken(null); onAuthFailure();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import { getRefreshToken, clearRefreshToken } from '../auth/tokenStore';
import type { AuthResponse, User, Difficulty, ProblemSummary, Problem, Paged, TestCase, Language } from './types';

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

export const login = (usernameOrEmail: string, password: string) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ usernameOrEmail, password }) });
export const register = (username: string, email: string, password: string) =>
  apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
export const getMe = () => apiFetch<{ user: User }>('/api/me');

export const listProblems = (q: {
  page?: number; limit?: number; difficulty?: Difficulty | ''; search?: string;
}) => {
  const p = new URLSearchParams();
  if (q.page) p.set('page', String(q.page));
  if (q.limit) p.set('limit', String(q.limit));
  if (q.difficulty) p.set('difficulty', q.difficulty);
  if (q.search) p.set('search', q.search);
  return apiFetch<Paged<ProblemSummary>>(`/api/problems?${p.toString()}`);
};
export const getProblem = (slug: string) =>
  apiFetch<{ problem: Problem }>(`/api/problems/${encodeURIComponent(slug)}`);
// anon sees visible (sample) cases only; backend filters by is_visible.
export const listTestCases = (slug: string) =>
  apiFetch<{ data: TestCase[] }>(`/api/problems/${encodeURIComponent(slug)}/test-cases`);
export const listLanguages = () => apiFetch<{ data: Language[] }>(`/api/languages`);

import { getRefreshToken, clearRefreshToken } from '../auth/tokenStore';
import type { AuthResponse, User, Difficulty, ProblemSummary, Problem, Paged, TestCase, Language, Submission, TestResult, SubmissionStatus } from './types';

/* Deploy-time API prefix (Stage 9). Empty by default: every path below is
   same-origin "/api/…", which both the Vite dev proxy and the production
   nginx configuration route to the Express API. Set VITE_API_BASE_URL (e.g.
   "https://api.example.com" — no trailing slash) only when the SPA is served
   from a different origin than the API.
   ⚠ VITE_* variables are compiled into the client bundle and are PUBLIC by
   design — never place secrets here. See frontend/.env.example. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

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

/** Offline / DNS / CORS: `fetch` rejects instead of resolving. Normalise it to
    status 0 so callers can tell "can't reach the server" from a backend reply. */
async function doFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, 'Network request failed');
  }
}

/** A refresh that failed for an auth reason genuinely ends the session; a
    network blip must not, or a dropped connection logs the user out. */
const isAuthFailure = (e: unknown) =>
  e instanceof ApiError && (e.status === 401 || e.status === 403);

function endSession() {
  clearRefreshToken();
  setAccessToken(null);
  onAuthFailure();
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
  const res = await doFetch('/api/auth/refresh', {
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
  const res = await doFetch(path, { ...init, headers });
  if (res.status === 401 && !_retried && getRefreshToken()) {
    try {
      refreshing ??= refreshAccess().finally(() => { refreshing = null; });
      await refreshing;
    } catch (e) {
      if (isAuthFailure(e)) endSession();   // expired/revoked → really log out
      throw isAuthFailure(e) ? await parseError(res) : e;   // else surface the network error
    }
    return apiFetch<T>(path, init, true);   // retry ONCE
  }
  if (res.status === 401 && _retried) {     // retried and still 401 → give up
    endSession();
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

export const createSubmission = (body: { problem_id: string; language_id: string; source_code: string }) =>
  apiFetch<{ submission: Submission }>(`/api/submissions`, { method: 'POST', body: JSON.stringify(body) });

export const getSubmission = (id: string) =>
  apiFetch<{ submission: Submission; testResults: TestResult[] }>(`/api/submissions/${encodeURIComponent(id)}`);

export const listSubmissions = (q: { page?: number; limit?: number; status?: SubmissionStatus | '' }) => {
  const p = new URLSearchParams();
  if (q.page) p.set('page', String(q.page));
  if (q.limit) p.set('limit', String(q.limit));
  if (q.status) p.set('status', q.status);
  return apiFetch<Paged<Submission>>(`/api/submissions?${p.toString()}`);
};

# Frontend Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React SPA that lets users register/log in, browse problems, solve one in an in-browser editor, submit, watch the polled verdict, and review their submission history — against the existing Express/Prisma API.

**Architecture:** Standalone Vite app in `frontend/` (own package.json). Components → TanStack Query hooks → one central `api.ts` (the only module that calls `fetch`) → Express API. Access token in React memory; refresh token in localStorage with single-flight, retry-once refresh. Verdicts via ~1.5s polling that stops at terminal status and on unmount.

**Tech Stack:** React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS, CodeMirror 6, Vitest + React Testing Library.

**Spec:** [docs/superpowers/specs/2026-08-29-frontend-web-app-design.md](../specs/2026-08-29-frontend-web-app-design.md)

## Global Constraints

- All entity ids are **strings** in JSON (backend stringifies BigInt) — never coerce to number. `GET /api/languages` also returns string ids.
- Only `src/lib/api.ts` calls `fetch`. Every network call goes through its typed helpers.
- Backend error shapes to normalize: `{ error: string }` and `{ errors: [{ msg, path, ... }] }`.
- Auth endpoints: login body `{ usernameOrEmail, password }`; register body `{ username, email, password }`; refresh body `{ refreshToken }` → `{ accessToken }` (no new refresh token).
- Refresh: single-flight (concurrent 401s share one `/refresh`); each request retries at most once; a retried request that 401s logs out — never re-refresh.
- Polling interval ~1500ms while status ∈ {queued, judging}; stop at terminal and on unmount.
- Editor persistence keys: `problem:<slug>:source`, `problem:<slug>:language`.
- Dev: Vite proxies `/api` → `http://localhost:3000`. Backend must be running for e2e/manual checks.
- Deferred (do NOT build): admin CRUD UI, WebSocket/SSE, frontend Docker/nginx, HttpOnly-cookie auth.

## File Structure

- `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `vitest.config.ts`, `src/test/setup.ts`
- `src/main.tsx` — app entry: QueryClientProvider, BrowserRouter, AuthProvider
- `src/App.tsx` — route table
- `src/index.css` — Tailwind directives
- `src/lib/types.ts` — all API types
- `src/lib/api.ts` — fetch client, error normalization, refresh
- `src/lib/queries.ts` — TanStack Query hooks
- `src/lib/verdict.ts` — status → label/color map
- `src/auth/tokenStore.ts` — localStorage refresh-token get/set/clear
- `src/auth/AuthContext.tsx` — access token + user state, login/logout/bootstrap
- `src/auth/RequireAuth.tsx` — route guard
- `src/components/` — Layout, Nav, CodeEditor, LanguagePicker, VerdictBadge, Pagination, ErrorState
- `src/pages/` — Login, Register, Problems, Problem, Submissions, Submission, NotFound
- Backend: `src/routes/languages.ts` (new), `src/index.ts` (mount), `test/languages.test.ts` (new)

---

### Task 1: Scaffold Vite app + tooling + routing shell

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/index.html`, `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: a running SPA shell; route table in `App.tsx` with paths `/login`, `/register`, `/problems`, `/problems/:slug`, `/submissions`, `/submissions/:id`, `*` (NotFound). Placeholder page components inline for now (replaced in later tasks).

- [ ] **Step 1: Scaffold and install**

```bash
cd frontend
npm create vite@latest . -- --template react-ts   # accept overwrite of the empty dir
npm install react-router-dom @tanstack/react-query
npm install @uiw/react-codemirror @codemirror/lang-cpp @codemirror/lang-python @codemirror/lang-java
npm install -D tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Vite dev proxy + Vitest**

`frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
```

`frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
});
```

`frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Tailwind wiring**

`frontend/tailwind.config.js` → set `content: ['./index.html', './src/**/*.{ts,tsx}']`.
`frontend/src/index.css` (replace contents):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Add `import './index.css';` to `src/main.tsx`.

- [ ] **Step 4: Route table + providers**

`frontend/src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

const Stub = ({ name }: { name: string }) => <div data-testid="page">{name}</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/problems" replace />} />
      <Route path="/login" element={<Stub name="login" />} />
      <Route path="/register" element={<Stub name="register" />} />
      <Route path="/problems" element={<Stub name="problems" />} />
      <Route path="/problems/:slug" element={<Stub name="problem" />} />
      <Route path="/submissions" element={<Stub name="submissions" />} />
      <Route path="/submissions/:id" element={<Stub name="submission" />} />
      <Route path="*" element={<Stub name="notfound" />} />
    </Routes>
  );
}
```

`frontend/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const qc = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 5: Smoke test**

`frontend/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the problems page at /problems', () => {
  render(<MemoryRouter initialEntries={['/problems']}><App /></MemoryRouter>);
  expect(screen.getByTestId('page')).toHaveTextContent('problems');
});
```

- [ ] **Step 6: Run test + build**

Run: `npx vitest run` → PASS. Then `npx vite build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat(frontend): scaffold Vite+TS SPA, tailwind, routing shell"
```

---

### Task 2: Types + central API client (error normalization, no refresh yet)

**Files:**
- Create: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`
- Test: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces (`types.ts`): `Role`, `Difficulty`, `SubmissionStatus`, `User`, `AuthResponse`, `ProblemSummary`, `Problem`, `Pagination`, `Paged<T>`, `Submission`, `TestResult`, `Language`.
- Produces (`api.ts`): `class ApiError { status: number; message: string; fieldErrors: Record<string,string> }`; `let accessToken: string | null` with `setAccessToken(t)` / `getAccessToken()`; `apiFetch<T>(path, init?): Promise<T>`. Refresh hook (`onAuthFailure`) is added in Task 3 — for now a 401 just throws `ApiError`.

- [ ] **Step 1: Write `types.ts`** (copy verbatim from spec §4, plus `Language`)

```ts
export type Role = 'user' | 'moderator' | 'admin';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SubmissionStatus =
  | 'queued' | 'judging' | 'accepted' | 'wrong_answer'
  | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error'
  | 'compilation_error' | 'internal_error' | 'skipped';
export interface User { id: string; username: string; email: string; role: Role; }
export interface AuthResponse { user: User; accessToken: string; refreshToken: string; }
export interface Language { id: string; name: string; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface Paged<T> { data: T[]; pagination: Pagination; }
export interface ProblemSummary {
  id: string; slug: string; title: string; difficulty: Difficulty;
  time_limit_ms: number; memory_limit_mb: number; is_public: boolean;
  created_by: string | null; created_at: string; updated_at: string;
}
export interface Problem extends ProblemSummary {
  statement: string; input_format: string | null;
  output_format: string | null; constraints: string | null;
}
export interface Submission {
  id: string; user_id: string; problem_id: string; language_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  submitted_at: string; completed_at: string | null; source_code?: string;
}
export interface TestResult {
  id: string; submission_id: string; test_case_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  stdout: string | null; stderr: string | null;
}
export const TERMINAL_STATUSES: SubmissionStatus[] = [
  'accepted','wrong_answer','time_limit_exceeded','memory_limit_exceeded',
  'runtime_error','compilation_error','internal_error',
];
export const isTerminal = (s: SubmissionStatus) => TERMINAL_STATUSES.includes(s);
```

- [ ] **Step 2: Write the failing test for error normalization**

`frontend/src/lib/api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError, setAccessToken } from './api';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300, status,
    json: async () => body, text: async () => JSON.stringify(body),
  }));
}
beforeEach(() => { setAccessToken(null); vi.unstubAllGlobals(); });

describe('apiFetch error normalization', () => {
  it('parses {error} shape', async () => {
    mockFetchOnce(409, { error: 'taken' });
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 409, message: 'taken' });
  });
  it('parses {errors:[]} field shape', async () => {
    mockFetchOnce(400, { errors: [{ path: 'email', msg: 'invalid' }] });
    const err = await apiFetch('/api/x').catch((e: ApiError) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.fieldErrors.email).toBe('invalid');
  });
});
```

- [ ] **Step 3: Run → FAIL** (`npx vitest run src/lib/api.test.ts`) — "api" has no such exports.

- [ ] **Step 4: Write `api.ts`** (base version — refresh added in Task 3)

```ts
let accessToken: string | null = null;
export function setAccessToken(t: string | null) { accessToken = t; }
export function getAccessToken() { return accessToken; }

export class ApiError extends Error {
  constructor(public status: number, message: string,
              public fieldErrors: Record<string, string> = {}) {
    super(message);
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

- [ ] **Step 5: Run → PASS** (`npx vitest run src/lib/api.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib
git commit -m "feat(frontend): API types + central fetch client with error normalization"
```

---

### Task 3: Single-flight, retry-once refresh + token store

**Files:**
- Create: `frontend/src/auth/tokenStore.ts`
- Modify: `frontend/src/lib/api.ts` (add refresh into `apiFetch`)
- Test: `frontend/src/lib/refresh.test.ts`

**Interfaces:**
- Produces (`tokenStore.ts`): `getRefreshToken(): string | null`, `setRefreshToken(t: string): void`, `clearRefreshToken(): void` (localStorage key `refreshToken`).
- Produces (`api.ts`): `setOnAuthFailure(fn: () => void)` — called when refresh fails (AuthContext registers logout). `apiFetch` now: on 401, single-flight `POST /api/auth/refresh`, update access token, retry once; retried 401 → `onAuthFailure()` + throw.
- Consumes: `getRefreshToken`/`clearRefreshToken` from `tokenStore`.

- [ ] **Step 1: Write `tokenStore.ts`**

```ts
const KEY = 'refreshToken';
export const getRefreshToken = () => localStorage.getItem(KEY);
export const setRefreshToken = (t: string) => localStorage.setItem(KEY, t);
export const clearRefreshToken = () => localStorage.removeItem(KEY);
```

- [ ] **Step 2: Write the failing refresh tests**

`frontend/src/lib/refresh.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, setAccessToken, setOnAuthFailure } from './api';
import { setRefreshToken } from '../auth/tokenStore';

// fetch mock: 401 on protected calls until access token === 'NEW'; /refresh returns NEW once.
function makeFetch(opts: { refreshOk: boolean }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/auth/refresh')) {
      return opts.refreshOk
        ? { ok: true, status: 200, json: async () => ({ accessToken: 'NEW' }) }
        : { ok: false, status: 401, json: async () => ({ error: 'bad refresh' }) };
    }
    const auth = new Headers(init?.headers).get('Authorization');
    const ok = auth === 'Bearer NEW';
    return { ok, status: ok ? 200 : 401, json: async () => (ok ? { data: 1 } : { error: 'expired' }) };
  });
}
beforeEach(() => { localStorage.clear(); setAccessToken('OLD'); setRefreshToken('R'); setOnAuthFailure(() => {}); });

describe('refresh', () => {
  it('concurrent 401s trigger exactly one /refresh, then all succeed', async () => {
    const f = makeFetch({ refreshOk: true }); vi.stubGlobal('fetch', f);
    await Promise.all([apiFetch('/api/a'), apiFetch('/api/b'), apiFetch('/api/c')]);
    const refreshCalls = f.mock.calls.filter(c => String(c[0]).endsWith('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });
  it('failed refresh calls onAuthFailure and rejects', async () => {
    vi.stubGlobal('fetch', makeFetch({ refreshOk: false }));
    const onFail = vi.fn(); setOnAuthFailure(onFail);
    await expect(apiFetch('/api/a')).rejects.toBeTruthy();
    expect(onFail).toHaveBeenCalledOnce();
  });
  it('does not loop: a retried request that 401s again logs out (one refresh only)', async () => {
    // refresh "succeeds" but returns a token the protected route still rejects
    const f = vi.fn(async (url: string) =>
      String(url).endsWith('/api/auth/refresh')
        ? { ok: true, status: 200, json: async () => ({ accessToken: 'STILL_BAD' }) }
        : { ok: false, status: 401, json: async () => ({ error: 'expired' }) });
    vi.stubGlobal('fetch', f);
    const onFail = vi.fn(); setOnAuthFailure(onFail);
    await expect(apiFetch('/api/a')).rejects.toBeTruthy();
    const refreshCalls = f.mock.calls.filter(c => String(c[0]).endsWith('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);      // never re-refreshed
    expect(onFail).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run → FAIL** (`setOnAuthFailure` undefined; no refresh logic).

- [ ] **Step 4: Add refresh to `api.ts`**

Add imports + refresh machinery, and route requests through a retry-aware core:
```ts
import { getRefreshToken, clearRefreshToken } from '../auth/tokenStore';

let onAuthFailure: () => void = () => {};
export function setOnAuthFailure(fn: () => void) { onAuthFailure = fn; }

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
```

Rewrite `apiFetch` to retry once:
```ts
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
```

- [ ] **Step 5: Run → PASS** (`npx vitest run src/lib/refresh.test.ts src/lib/api.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/auth/tokenStore.ts frontend/src/lib/api.ts frontend/src/lib/refresh.test.ts
git commit -m "feat(frontend): single-flight retry-once token refresh"
```

---

### Task 4: Auth helpers + AuthContext + RequireAuth + Login/Register + bootstrap

**Files:**
- Modify: `frontend/src/lib/api.ts` (add `login`, `register`, `getMe`)
- Create: `frontend/src/auth/AuthContext.tsx`, `frontend/src/auth/RequireAuth.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`
- Modify: `frontend/src/main.tsx` (wrap in `<AuthProvider>`), `frontend/src/App.tsx` (real Login/Register + guarded routes)
- Test: `frontend/src/auth/AuthContext.test.tsx`

**Interfaces:**
- Produces (`api.ts`): `login(usernameOrEmail, password): Promise<AuthResponse>`, `register(username, email, password): Promise<AuthResponse>`, `getMe(): Promise<{ user: User }>`.
- Produces (`AuthContext.tsx`): `useAuth()` → `{ user: User | null, ready: boolean, login, register, logout }`; `<AuthProvider>`. On mount: if `getRefreshToken()`, refresh + `getMe()` to restore `user`; always sets `ready=true` when done. Registers `setOnAuthFailure(logout)`.
- Produces (`RequireAuth.tsx`): guards children; redirects to `/login?from=<path>` when `!user` (after `ready`).

- [ ] **Step 1: Add auth helpers to `api.ts`**

```ts
import type { AuthResponse, User } from './types';
export const login = (usernameOrEmail: string, password: string) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ usernameOrEmail, password }) });
export const register = (username: string, email: string, password: string) =>
  apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
export const getMe = () => apiFetch<{ user: User }>('/api/me');
```

- [ ] **Step 2: Write the failing AuthContext test**

`frontend/src/auth/AuthContext.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, ready, login } = useAuth();
  if (!ready) return <div>loading</div>;
  return <div>
    <span data-testid="user">{user?.username ?? 'anon'}</span>
    <button onClick={() => login('bob', 'pw')}>login</button>
  </div>;
}
beforeEach(() => { localStorage.clear(); });

it('starts anon when no refresh token, logs in on demand', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true, status: 200,
    json: async () => String(url).endsWith('/login')
      ? { user: { id: '1', username: 'bob', email: 'b@x.io', role: 'user' }, accessToken: 'A', refreshToken: 'R' }
      : {},
  })));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anon'));
  await userEvent.click(screen.getByText('login'));
  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('bob'));
  expect(localStorage.getItem('refreshToken')).toBe('R');
});
```

- [ ] **Step 3: Run → FAIL** (no `AuthContext`).

- [ ] **Step 4: Write `AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as api from '../lib/api';
import { setAccessToken, setOnAuthFailure } from '../lib/api';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from './tokenStore';
import type { User, AuthResponse } from '../lib/types';

interface Ctx {
  user: User | null; ready: boolean;
  login(u: string, p: string): Promise<void>;
  register(u: string, e: string, p: string): Promise<void>;
  logout(): void;
}
const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  function apply(res: AuthResponse) {
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
  }
  function logout() {
    clearRefreshToken(); setAccessToken(null); setUser(null);
  }
  useEffect(() => { setOnAuthFailure(logout); }, []);
  useEffect(() => {
    (async () => {
      if (getRefreshToken()) {
        try { const { user } = await api.getMe(); setUser(user); } // apiFetch auto-refreshes on 401
        catch { logout(); }
      }
      setReady(true);
    })();
  }, []);

  const login = async (u: string, p: string) => apply(await api.login(u, p));
  const register = async (u: string, e: string, p: string) => apply(await api.register(u, e, p));
  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>;
}
```

- [ ] **Step 5: Write `RequireAuth.tsx`**

```tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Write `Login.tsx` and `Register.tsx`**

`frontend/src/pages/Login.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(form.usernameOrEmail, form.password); nav(sp.get('from') || '/problems', { replace: true }); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Login failed'); }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <input className="border w-full p-2 rounded" placeholder="username or email"
        value={form.usernameOrEmail} onChange={e => setForm({ ...form, usernameOrEmail: e.target.value })} />
      <input className="border w-full p-2 rounded" type="password" placeholder="password"
        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button className="bg-blue-600 text-white w-full p-2 rounded">Log in</button>
      <p className="text-sm">No account? <Link className="text-blue-600" to="/register">Register</Link></p>
    </form>
  );
}
```

`frontend/src/pages/Register.tsx`: same shape, fields `username`/`email`/`password`, calls `register(...)`, and renders `err.fieldErrors` inline (e.g. `{fieldErrors.email && <p className="text-red-600 text-xs">{fieldErrors.email}</p>}`), then navigates to `/problems`.

- [ ] **Step 7: Wire providers and routes**

`main.tsx`: wrap `<App/>` in `<AuthProvider>` (inside BrowserRouter, inside QueryClientProvider).
`App.tsx`: import real `Login`/`Register`; wrap `/submissions` and `/submissions/:id` elements in `<RequireAuth>`. (`/problems` stays public.)

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run` → PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): auth context, guards, login/register, session bootstrap"
```

---

### Task 5: Backend `GET /api/languages` endpoint

Runs in the **repo-root backend** (not `frontend/`). Public, read-only. Ships in this (Phase 11) work, per spec §7.

**Files:**
- Create: `src/routes/languages.ts`
- Modify: `src/index.ts` (import + mount at `/api/languages`, alongside line 19-20 imports and the `app.use('/api/...')` mounts near line 131)
- Test: `test/integration/languages.test.ts`

**Interfaces:**
- Produces: `GET /api/languages` → `200 { data: [{ id: string, name: string }] }`, ordered by id asc. No auth. (`languages` table columns include `id BIGINT`, `name`, `docker_image`, `compile_command`, `run_command`; only id+name are exposed.)

- [ ] **Step 1: Write the failing test**

`test/integration/languages.test.ts`:
```ts
import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/index';

test('GET /api/languages → 200, string ids, no auth required', async () => {
  const res = await request(app).get('/api/languages');
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length >= 1);
  const l = res.body.data[0];
  assert.strictEqual(typeof l.id, 'string');   // BigInt must be stringified
  assert.strictEqual(typeof l.name, 'string');
});
```

- [ ] **Step 2: Run → FAIL** (`npm test` — 404, no route).

- [ ] **Step 3: Write `src/routes/languages.ts`**

```ts
import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import prisma from '../lib/prisma';

const router = express.Router();

// GET /api/languages — public list for the frontend language picker.
// ids are seed data (1=C++, 2=Python, 3=Java); stringify BigInt for JSON.
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.languages.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });
  res.json({ data: rows.map((l) => ({ id: l.id.toString(), name: l.name })) });
}));

export default router;
```

- [ ] **Step 4: Mount in `src/index.ts`**

Add `import languagesRouter from './routes/languages';` beside the other route imports (line ~19-20), and `app.use('/api/languages', languagesRouter);` beside the other `app.use('/api/...')` mounts (line ~131). No limiter beyond the global one.

- [ ] **Step 5: Run → PASS** (`npm test`, or targeted: `npm run build && node --test dist/test/integration/languages.test.js`). Requires the DB up.

- [ ] **Step 6: Commit**

```bash
git add src/routes/languages.ts src/index.ts test/integration/languages.test.ts
git commit -m "feat(api): public GET /api/languages for the frontend picker"
```

---

### Task 6: Problems list + detail (query hooks, filter/search/pagination, sample cases)

**Files:**
- Modify: `src/lib/api.ts` (add `listProblems`, `getProblem`, `listTestCases`, `listLanguages` helpers)
- Create: `src/lib/queries.ts` (TanStack hooks)
- Create: `src/pages/Problems.tsx`, `src/pages/Problem.tsx`
- Create: `src/components/Pagination.tsx`, `src/components/ErrorState.tsx`
- Modify: `src/App.tsx` (replace `/problems` and `/problems/:slug` stubs)
- Test: `src/pages/Problems.test.tsx`

**Interfaces:**
- Consumes: `apiFetch<T>` (Task 2), `Paged<ProblemSummary>`, `Problem`, `TestResult`/test-case types, `Language` (Task 2).
- Produces: `useProblems(params)`, `useProblem(slug)`, `useTestCases(slug)`, `useLanguages()` from `queries.ts`; `<Pagination page total totalPages onPage>`, `<ErrorState error onRetry>`.

- [ ] **Step 1: Add API helpers to `src/lib/api.ts`**

```ts
export const listProblems = (q: {
  page?: number; limit?: number; difficulty?: Difficulty | ''; search?: string;
}) => {
  const p = new URLSearchParams();
  if (q.page) p.set('page', String(q.page));
  if (q.limit) p.set('limit', String(q.limit));
  if (q.difficulty) p.set('difficulty', q.difficulty);
  if (q.search) p.set('search', q.search);
  return apiFetch<Paged<ProblemSummary>>(`/problems?${p.toString()}`);
};
export const getProblem = (slug: string) =>
  apiFetch<{ problem: Problem }>(`/problems/${encodeURIComponent(slug)}`);
// anon sees visible-only; backend nests test-cases under the problem slug
export const listTestCases = (slug: string) =>
  apiFetch<{ data: TestCase[] }>(`/problems/${encodeURIComponent(slug)}/test-cases`);
export const listLanguages = () => apiFetch<Paged<Language>>(`/languages`);
```
(Add a `TestCase` interface to `types.ts` if not already present: `{ id: string; problem_id: string; is_sample: boolean; input: string; expected_output: string; ... }` — confirm exact fields against `src/controllers/testCaseController.ts` during implementation; expose only what the sample view renders.)

- [ ] **Step 2: Write `src/lib/queries.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { Difficulty } from './types';

export const useProblems = (q: { page: number; limit: number; difficulty: Difficulty | ''; search: string }) =>
  useQuery({ queryKey: ['problems', q], queryFn: () => api.listProblems(q) });

export const useProblem = (slug: string) =>
  useQuery({ queryKey: ['problem', slug], queryFn: () => api.getProblem(slug), enabled: !!slug });

export const useTestCases = (slug: string) =>
  useQuery({ queryKey: ['test-cases', slug], queryFn: () => api.listTestCases(slug), enabled: !!slug });

export const useLanguages = () =>
  useQuery({ queryKey: ['languages'], queryFn: api.listLanguages, staleTime: Infinity });
```

- [ ] **Step 3: `Pagination.tsx` + `ErrorState.tsx`**

```tsx
// Pagination.tsx
export default function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
      <span className="text-sm">Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
    </div>
  );
}
```
```tsx
// ErrorState.tsx
import type { ApiError } from '../lib/api';
export default function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = (error as ApiError)?.message ?? 'Something went wrong.';
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded text-red-800">
      <p>{msg}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 px-3 py-1 border rounded">Retry</button>}
    </div>
  );
}
```

- [ ] **Step 4: `Problems.tsx`** — search input (debounced or on-submit), difficulty `<select>` (''/easy/medium/hard), `useProblems`, render loading/empty/error states, table of `{title, difficulty, limits}` linking to `/problems/:slug`, `<Pagination>`. Page/filter state in `useSearchParams` so it survives reload/back.

- [ ] **Step 5: `Problem.tsx`** — `useProblem(slug)` + `useTestCases(slug)`; render statement/input_format/output_format/constraints; render sample (visible) test cases as input/expected pairs. On 404 (`ApiError.status === 404`) render the NotFound content. Editor + submit are added in Task 7 (leave a placeholder region).

- [ ] **Step 6: Smoke test `Problems.test.tsx`** — mock `api.listProblems` (via `vi.mock('../lib/api')`), render inside `QueryClientProvider` + `MemoryRouter`, assert a problem title appears and the difficulty filter is present.

- [ ] **Step 7: Wire routes in `App.tsx`, run `vitest run` + `vite build` → green, commit**

```bash
git add frontend/src
git commit -m "feat(frontend): problems list + detail with filter, search, pagination"
```

---

### Task 7: LanguagePicker + CodeMirror editor + submit flow

**Files:**
- Create: `src/components/LanguagePicker.tsx`, `src/components/CodeEditor.tsx`
- Modify: `src/lib/api.ts` (`createSubmission`), `src/lib/queries.ts` (`useCreateSubmission`)
- Modify: `src/pages/Problem.tsx` (editor + language + submit region)
- Test: `src/components/CodeEditor.test.tsx` (persistence)

**Interfaces:**
- Consumes: `useLanguages()` (Task 6), `Language`, `Submission` (Task 2).
- Produces: `<LanguagePicker value onChange>`, `<CodeEditor slug languageId value onChange>`, `createSubmission(body)`, `useCreateSubmission()`.

- [ ] **Step 1: `createSubmission` in `api.ts`**

```ts
export const createSubmission = (body: { problem_id: string; language_id: string; source_code: string }) =>
  apiFetch<{ submission: Submission }>(`/submissions`, { method: 'POST', body: JSON.stringify(body) });
```

- [ ] **Step 2: `useCreateSubmission` in `queries.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
export const useCreateSubmission = () =>
  useMutation({ mutationFn: api.createSubmission });
```

- [ ] **Step 3: `LanguagePicker.tsx`** — `useLanguages()`, `<select>` of `{id → name}`, loading/error handled; `value`/`onChange` (string id).

- [ ] **Step 4: `CodeEditor.tsx`** — `@uiw/react-codemirror` with lang extension chosen by language name (C++→cpp(), Python→python(), Java→java()). Persist BOTH keys per spec: `problem:<slug>:source` and `problem:<slug>:language` in `localStorage`; restore on mount. Editor is controlled from `Problem.tsx` state; persistence is a `useEffect` on change.

```tsx
// language extension picker (by language NAME, not seed id — ids aren't hardcoded)
const extFor = (name: string) =>
  /c\+\+/i.test(name) ? [cpp()] : /python/i.test(name) ? [python()] : /java/i.test(name) ? [java()] : [];
```

- [ ] **Step 5: Submit region in `Problem.tsx`** — requires auth to submit: if not logged in, show a "Log in to submit" link to `/login?from=/problems/:slug`. On submit: `useCreateSubmission().mutate({ problem_id: problem.id, language_id, source_code })` → on success navigate to `/submissions/${submission.id}`. Show mutation error via inline message.

- [ ] **Step 6: `CodeEditor.test.tsx`** — render, type/set value, assert `localStorage['problem:<slug>:source']` and `['problem:<slug>:language']` are written; remount and assert they restore.

- [ ] **Step 7: `vitest run` + `vite build` → green, commit**

```bash
git add frontend/src
git commit -m "feat(frontend): CodeMirror editor, language picker, submit flow with per-slug persistence"
```

---

### Task 8: Verdict polling + Submission detail

**Files:**
- Modify: `src/lib/api.ts` (`getSubmission`), `src/lib/queries.ts` (`useSubmission` with `refetchInterval`)
- Create: `src/pages/Submission.tsx`
- Create: `src/lib/verdict.ts` (status → label + color), `src/components/VerdictBadge.tsx`
- Modify: `src/App.tsx` (`/submissions/:id`, RequireAuth)
- Test: `src/lib/queries.polling.test.ts` (or `Submission.test.tsx`) — polling lifecycle

**Interfaces:**
- Consumes: `apiFetch`, `Submission`, `TestResult`, `isTerminal` / `TERMINAL_STATUSES` (Task 2).
- Produces: `getSubmission(id)`, `useSubmission(id)`, `verdictMeta`, `<VerdictBadge status>`.

- [ ] **Step 1: `getSubmission` in `api.ts`**

```ts
export const getSubmission = (id: string) =>
  apiFetch<{ submission: Submission; testResults: TestResult[] }>(`/submissions/${encodeURIComponent(id)}`);
```

- [ ] **Step 2: `useSubmission` in `queries.ts` — polling that stops at terminal AND on unmount**

```ts
export const useSubmission = (id: string) =>
  useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.getSubmission(id),
    enabled: !!id,
    // ~1.5s while non-terminal; false stops the loop. TanStack halts refetch
    // automatically when the query goes inactive (component unmounts).
    refetchInterval: (q) =>
      q.state.data && isTerminal(q.state.data.submission.status) ? false : 1500,
  });
```

- [ ] **Step 3: `verdict.ts` — single status map**

```ts
import type { SubmissionStatus } from './types';
export const verdictMeta: Record<SubmissionStatus, { label: string; cls: string }> = {
  queued:                { label: 'Queued',              cls: 'bg-gray-200 text-gray-800' },
  judging:               { label: 'Judging',             cls: 'bg-blue-200 text-blue-800' },
  accepted:              { label: 'Accepted',            cls: 'bg-green-200 text-green-800' },
  wrong_answer:          { label: 'Wrong Answer',        cls: 'bg-red-200 text-red-800' },
  time_limit_exceeded:   { label: 'Time Limit Exceeded', cls: 'bg-amber-200 text-amber-900' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', cls: 'bg-amber-200 text-amber-900' },
  runtime_error:         { label: 'Runtime Error',       cls: 'bg-red-200 text-red-800' },
  compilation_error:     { label: 'Compilation Error',   cls: 'bg-red-200 text-red-800' },
  internal_error:        { label: 'Internal Error',      cls: 'bg-red-200 text-red-800' },
  skipped:               { label: 'Skipped',             cls: 'bg-gray-200 text-gray-600' },
};
```

- [ ] **Step 4: `VerdictBadge.tsx`** — `verdictMeta[status]` → `<span class={cls}>{label}</span>`.

- [ ] **Step 5: `Submission.tsx`** — `useSubmission(id)`; header `<VerdictBadge>` + runtime/memory; source_code block; per-test list (each `<VerdictBadge>` + runtime/memory, stdout/stderr shown when present). Loading/error/404.

- [ ] **Step 6: Polling lifecycle test** — mock `getSubmission` to return `judging` then `accepted`; use fake timers; assert it refetches while non-terminal, stops after terminal; unmount mid-poll and assert no further calls. (This is the spec's explicit acceptance criterion.)

- [ ] **Step 7: `vitest run` + `vite build` → green, commit**

```bash
git add frontend/src
git commit -m "feat(frontend): submission detail with ~1.5s verdict polling (stops at terminal + unmount)"
```

---

### Task 9: Submission history

**Files:**
- Modify: `src/lib/api.ts` (`listSubmissions`), `src/lib/queries.ts` (`useSubmissions`)
- Create: `src/pages/Submissions.tsx`
- Modify: `src/App.tsx` (`/submissions`, RequireAuth)
- Test: `src/pages/Submissions.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `Paged<Submission>`, `SubmissionStatus`, `<VerdictBadge>`, `<Pagination>`.
- Produces: `listSubmissions(q)`, `useSubmissions(q)`.

- [ ] **Step 1: `listSubmissions` in `api.ts`**

```ts
export const listSubmissions = (q: { page?: number; limit?: number; status?: SubmissionStatus | '' }) => {
  const p = new URLSearchParams();
  if (q.page) p.set('page', String(q.page));
  if (q.limit) p.set('limit', String(q.limit));
  if (q.status) p.set('status', q.status);
  return apiFetch<Paged<Submission>>(`/submissions?${p.toString()}`);
};
```

- [ ] **Step 2: `useSubmissions` in `queries.ts`** — `useQuery({ queryKey: ['submissions', q], queryFn: () => api.listSubmissions(q) })`.

- [ ] **Step 3: `Submissions.tsx`** — RequireAuth-guarded; table of own submissions (`<VerdictBadge>`, submitted_at, runtime/memory), each row links to `/submissions/:id`; `<Pagination>`; page/status filter in `useSearchParams`. Loading/empty/error.

- [ ] **Step 4: Smoke test `Submissions.test.tsx`** — mock `listSubmissions`, render, assert rows + badges render and link to detail.

- [ ] **Step 5: `vitest run` + `vite build` → green, commit**

```bash
git add frontend/src
git commit -m "feat(frontend): submission history (own submissions, pagination, status filter)"
```

---

### Task 10: Layout / Nav / NotFound + final wiring polish

**Files:**
- Create: `src/components/Layout.tsx`, `src/components/Nav.tsx`, `src/pages/NotFound.tsx`
- Modify: `src/App.tsx` (wrap routes in `<Layout>`, add `*` → NotFound)
- Test: covered by existing page smoke tests; add `Nav.test.tsx` if auth-conditional links need it.

**Interfaces:**
- Consumes: `useAuth()` (Task 4).
- Produces: `<Layout>` (Nav + `<Outlet/>`), `<Nav>` (Problems always; Submissions + Logout when authed; Login/Register when not), `NotFound`.

- [ ] **Step 1: `Nav.tsx`** — links: Problems (always); when `user`: Submissions + a logout button (`logout()`); when not: Login / Register. Show `user.username` when present.
- [ ] **Step 2: `Layout.tsx`** — `<Nav/>` + `<main className="max-w-4xl mx-auto p-4"><Outlet/></main>`.
- [ ] **Step 3: `NotFound.tsx`** — 404 message + link back to `/problems`.
- [ ] **Step 4: `App.tsx`** — nest all routes under `<Route element={<Layout/>}>`; add `<Route path="*" element={<NotFound/>}/>`.
- [ ] **Step 5: `Nav.test.tsx`** — render logged-out (Login/Register visible) and logged-in (Submissions/Logout visible) via a mocked `useAuth`.
- [ ] **Step 6: `vitest run` + `vite build` → green, commit**

```bash
git add frontend/src
git commit -m "feat(frontend): app shell (layout, nav, 404) + auth-aware navigation"
```

---

### Task 11: Final build verification (whole frontend)

**Files:** none created — verification only.

- [ ] **Step 1: Type-check** — `cd frontend && npx tsc --noEmit` → clean.
- [ ] **Step 2: Tests** — `cd frontend && npx vitest run` → all green (refresh concurrency, refresh failure/loop guard, polling lifecycle, page smokes, editor persistence).
- [ ] **Step 3: Production build** — `cd frontend && npx vite build` → succeeds, no unresolved imports.
- [ ] **Step 4: Backend regression** — from repo root `npm test` → the new `languages.test.ts` passes alongside the existing suite (DB up).
- [ ] **Step 5: Manual smoke (optional but recommended)** — `docker compose up` (backend+db), `cd frontend && npm run dev`; register → browse → open a problem → submit → watch verdict poll to terminal → view history. Confirm reload restores session and editor content.
- [ ] **Step 6: Final commit if any polish changed**

```bash
git add frontend
git commit -m "chore(frontend): phase 11 build verification"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** every §12 acceptance criterion maps to a task — Auth (T3,T4), Problems list/detail/states (T6), Languages string-id endpoint + dynamic picker (T5,T7), Submission editor+persistence+submit+polling+per-test (T7,T8), History (T9), Quality/404/central-fetch/central-types/tests (T2,T10,T3,T8, all `*.test`), build verification (T11).
- **Placeholder scan:** no TBD/TODO; the one deliberately-deferred detail (exact `TestCase` fields) is flagged as "confirm against `testCaseController.ts` during implementation" because the frontend only renders sample input/expected — the real column names are read at build time, not guessed here.
- **Type consistency:** helper names are stable across tasks — `listProblems/getProblem/listTestCases/listLanguages/createSubmission/getSubmission/listSubmissions` in `api.ts`; `useProblems/useProblem/useTestCases/useLanguages/useCreateSubmission/useSubmission/useSubmissions` in `queries.ts`; `verdictMeta`/`<VerdictBadge>`; `isTerminal`/`TERMINAL_STATUSES` used identically in T2 and T8. All ids typed `string`.











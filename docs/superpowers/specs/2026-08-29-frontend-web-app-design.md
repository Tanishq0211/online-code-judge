# Frontend Web App — Design Spec

**Date:** 2026-08-29
**Status:** Approved (design); pending implementation plan
**Phase:** Frontend (Phase 11) — solver-facing SPA over the existing Express/Prisma API

## 1. Goal & scope

A standalone single-page web app that lets a user register/log in, browse
problems, solve one in an in-browser editor, submit, and watch the verdict —
then review their submission history. It consumes the existing backend API
unchanged (one small addition, see §7).

**In scope (MVP):**
- Auth: register, login, silent token refresh, logout.
- Browse problems: paginated list with difficulty filter + search.
- Problem detail: statement + sample cases + code editor + language picker + submit.
- Verdict view: per-test results, polled until terminal.
- Submission history: the signed-in user's own submissions.

**Deferred (YAGNI, explicitly out of this phase):**
- Admin problem / test-case CRUD UI (API already enforces `moderator|admin`).
- Real-time WebSocket verdicts — polling covers it now.
- Dockerising the frontend + nginx/compose prod-serving — dev runs via Vite
  proxy; prod-serving is the natural follow-up, noted not built.

## 2. Stack

- **React + Vite** SPA, TypeScript, in `frontend/` (own `package.json`,
  isolated from the backend at repo root).
- **React Router** — client routing.
- **TanStack Query** — server-state cache, the verdict-polling loop, refetch;
  removes hand-rolled fetch/loading/error boilerplate.
- **Tailwind CSS** — styling.
- **CodeMirror 6** — code editor (C++/Python/Java modes).
- **Vitest + React Testing Library** — tests (matches the backend's
  node:test, no-heavy-framework philosophy).

## 3. Project layout

```
frontend/
  index.html
  vite.config.ts        # dev proxy /api -> http://localhost:3000
  tailwind.config.js
  package.json
  src/
    main.tsx, App.tsx
    lib/
      api.ts            # centralized fetch client (single-flight refresh)
      types.ts          # shared API types mirroring backend responses
      queries.ts        # TanStack Query hooks (useProblems, useSubmission, ...)
    auth/
      AuthContext.tsx   # in-memory access token + user; localStorage refresh
      tokenStore.ts     # get/set/clear refresh token (localStorage)
      RequireAuth.tsx   # route guard
    components/
      Layout.tsx, Nav.tsx
      CodeEditor.tsx, LanguagePicker.tsx
      VerdictBadge.tsx, Pagination.tsx, ErrorState.tsx
    pages/
      Login.tsx, Register.tsx
      Problems.tsx, Problem.tsx
      Submissions.tsx, Submission.tsx
      NotFound.tsx
```

## 4. Centralized API + type layers (approved addition)

**`lib/types.ts`** — one place mirroring every backend response shape, so no
component re-declares them. Confirmed against the controllers:

```ts
type Role = 'user' | 'moderator' | 'admin';
type Difficulty = 'easy' | 'medium' | 'hard';
type SubmissionStatus =
  | 'queued' | 'judging' | 'accepted' | 'wrong_answer'
  | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error'
  | 'compilation_error' | 'internal_error' | 'skipped';

interface User { id: string; username: string; email: string; role: Role; }
interface AuthResponse { user: User; accessToken: string; refreshToken: string; }

interface ProblemSummary {
  id: string; slug: string; title: string; difficulty: Difficulty;
  time_limit_ms: number; memory_limit_mb: number; is_public: boolean;
  created_by: string | null; created_at: string; updated_at: string;
}
interface Problem extends ProblemSummary {
  statement: string; input_format: string | null;
  output_format: string | null; constraints: string | null;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }
interface Paged<T> { data: T[]; pagination: Pagination; }

interface Submission {
  id: string; user_id: string; problem_id: string; language_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  submitted_at: string; completed_at: string | null; source_code?: string;
}
interface TestResult {
  id: string; submission_id: string; test_case_id: string;
  status: SubmissionStatus; runtime_ms: number | null; memory_kb: number | null;
  stdout: string | null; stderr: string | null;
}
```

**Note:** all ids are **strings** (backend already stringifies BigInt) — the
frontend never coerces them to numbers. `problem_id`/`language_id` are sent
back as strings in the submit body; the backend does `BigInt(...)`.

**`lib/api.ts`** — the ONLY module that calls `fetch`. Responsibilities:
- Prefix `/api`, set `Content-Type`, attach `Authorization: Bearer <access>`.
- Parse the two backend error shapes — `{ error: string }` and
  `{ errors: [{ msg, path, ... }] }` — into one `ApiError { status, message, fieldErrors }`.
- On **401**, run the single-flight refresh (§5), then retry the request once.
- Typed helpers: `login`, `register`, `refresh`, `getMe`, `listProblems`,
  `getProblem`, `createSubmission`, `listSubmissions`, `getSubmission`.

## 5. Auth flow (in-memory access + localStorage refresh, single-flight)

- **Access token**: React state in `AuthContext` only — never persisted.
- **Refresh token**: `localStorage` (survives reload). The backend's refresh
  endpoint returns only a new access token (the refresh token is long-lived,
  ~7d, and reused), so we store it once at login/register.
- **Bootstrap on load**: if a refresh token exists, call `/api/auth/refresh`
  → get an access token → `GET /api/me` to restore the user. On failure, clear
  and treat as logged out.
- **Single-flight refresh (approved addition):** `api.ts` holds a module-level
  `let refreshing: Promise<string> | null`. When a 401 triggers a refresh, the
  first caller creates the promise; concurrent 401s `await` the SAME promise
  instead of firing N parallel `/refresh` calls. Cleared in a `finally`. On
  refresh failure: clear tokens, reject in-flight requests, redirect to `/login`.
- **Request-aware retry (loop guard):** each request retries **at most once**
  after a refresh. A request carries a `_retried` flag; if the retried request
  itself 401s, do NOT refresh again — clear auth and log out. This prevents a
  permanently-invalid token from producing a refresh→retry→401→refresh loop.
  Explicitly tested (§9).
- **Logout**: clear access state + `localStorage` refresh token, redirect to login.
- **Production-hardening backlog (not this phase):** move refresh auth to an
  HttpOnly Secure cookie. Deliberately deferred — changing it now would turn
  Phase 11 into an auth redesign against the existing backend contract.

```
request(access) → 401 → refreshing ??= refresh(refreshToken)
                         └ concurrent 401s await one promise
   success → retry request ONCE (_retried=true)
              └ retried request 401s again → clear auth, logout (no re-refresh)
   failure → clear auth, redirect /login
```

## 6. Screens & API mapping

| Route | Auth | Backend call | Notes |
|-------|------|--------------|-------|
| `/login` | public | `POST /api/auth/login` `{usernameOrEmail,password}` | redirect to `from` or `/problems` |
| `/register` | public | `POST /api/auth/register` `{username,email,password}` | auto-login on 201 |
| `/problems` | optional | `GET /api/problems?page&limit&difficulty&search` | filter + search + pagination |
| `/problems/:slug` | optional | `GET /api/problems/:slug` (+ sample cases, §7) | statement + editor + submit |
| `/submissions` | required | `GET /api/submissions?page&limit&status` | own submissions only |
| `/submissions/:id` | required | `GET /api/submissions/:id` | source + per-test verdicts, **polled** |

- **Submit flow** (`/problems/:slug`): `POST /api/submissions`
  `{problem_id, language_id, source_code}` → 201 `{submission}` → navigate to
  `/submissions/:id`.
- **Verdict polling**: TanStack Query `refetchInterval` on the submission
  detail query returns ~1500ms while `status ∈ {queued, judging}`, and `false`
  (stop) once terminal. **Polling stops on unmount** — when the user navigates
  away the query goes inactive and TanStack Query halts the interval; this is
  an explicit acceptance criterion (§9), not just default behaviour to assume.
- **Editor persistence**: `localStorage` per problem slug, both keys —
  `problem:<slug>:source` and `problem:<slug>:language` — so a reload restores
  both the code and the chosen language.

## 7. Required backend addition (small)

The language picker needs the `{id, name}` list, and the ids (1=C++, 2=Python,
3=Java) are seed data — hardcoding them in the frontend couples it to seed
order. Add a minimal **public `GET /api/languages`** (read-only, no auth),
returning ids as **strings** to match the rest of the API:

```json
{ "data": [ { "id": "1", "name": "C++" }, { "id": "2", "name": "Python" }, { "id": "3", "name": "Java" } ] }
```

`LanguagePicker → useLanguages() → GET /api/languages`. Adding a language later
needs no frontend change. This endpoint ships **in the Phase 11 commit** (the
frontend depends on it) — not in the separate backend-fixes commit.

Sample/visible test cases for a problem come from the existing nested
`GET /api/problems/:slug/test-cases` (anon sees visible-only) — no change.

## 8. Error handling & UX

- One `verdictMeta` map: status → label + Tailwind color class, used by
  `VerdictBadge` everywhere a status is shown.
- Form errors: `ApiError.fieldErrors` (from `{errors:[...]}`) rendered inline
  per field; top-level `{error}` shown as a form-level message.
- Every list/detail query renders explicit loading, empty, and error states
  (TanStack Query status). `ErrorState` offers a retry.
- `NotFound` page for unknown routes and 404s (hidden/absent problem or
  submission — backend returns 404 without revealing existence).

## 9. Testing

Vitest + React Testing Library, focused on the two pieces with real logic:
- **`api.ts` single-flight refresh**: a 401 triggers exactly one `/refresh`
  even under concurrent requests; success retries; failure clears + redirects.
- **verdict polling hook**: keeps polling while non-terminal, stops on terminal.
- Component smoke tests for each page (renders, key interactions). No e2e /
  browser-driver harness this phase.

## 10. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Frontend | React + Vite + TypeScript |
| Styling / Routing / Server state | Tailwind / React Router / TanStack Query |
| Editor / Testing | CodeMirror 6 / Vitest + React Testing Library |
| Auth | in-memory access + localStorage refresh |
| Refresh | single-flight + request-aware retry-once (loop guard) |
| Verdicts | ~1.5s polling, stop at terminal / on unmount |
| Language API | add public `GET /api/languages` (Phase 11 commit) |
| Admin UI / WebSocket-SSE / frontend Docker+nginx | deferred |

Backend fixes (Dockerfile, docker-compose, `database/constraints.sql`) are
committed **separately, before** frontend implementation — kept out of the
frontend commit for a clean history.

## 11. Implementation sequence

1. Scaffold Vite (React+TS) in `frontend/`
2. Install deps (router, query, tailwind, codemirror, vitest+RTL)
3. Tailwind + routing shell + layout
4. `lib/types.ts` + `lib/api.ts` (error normalization; no refresh yet)
5. Auth: token store, single-flight + loop-guard refresh, AuthContext, RequireAuth, Login/Register, bootstrap-on-load
6. Problems list + detail (filter/search/pagination, sample cases)
7. `GET /api/languages` (backend) + LanguagePicker + CodeMirror + submit
8. Verdict polling (submission detail)
9. Submission history
10. Tests (refresh concurrency, refresh failure/loop, polling lifecycle, page smoke)
11. Build verification (`tsc` + `vite build` + `vitest`)

## 12. Acceptance criteria

**Auth**
- [ ] Register / login work; access token stays memory-only; refresh token persists
- [ ] Reload restores session (bootstrap refresh + `/api/me`)
- [ ] Concurrent 401s cause exactly one `/refresh`
- [ ] Failed refresh logs the user out; refresh cannot recursively loop
- [ ] Logout clears token + state

**Problems**
- [ ] Pagination, search, difficulty filter
- [ ] Problem detail + visible sample cases
- [ ] Loading / error / empty states

**Languages**
- [ ] `GET /api/languages` returns string ids; picker loads dynamically; no hardcoded seed ids

**Submission**
- [ ] CodeMirror (C++/Python/Java); source + language persisted per slug
- [ ] Submit → navigate to submission detail
- [ ] `queued → judging → terminal`; poll ~1.5s; stop at terminal AND on unmount
- [ ] Per-test results + source code display

**History**
- [ ] Own submissions only; pagination; status badges; links to detail

**Quality**
- [ ] Every page handles loading/error/empty; 404 page
- [ ] API errors normalized centrally; TS types centralized; only `api.ts` calls `fetch`
- [ ] Tests: refresh concurrency, refresh failure/loop, polling lifecycle, page smoke
- [ ] `tsc` clean, `vite build` succeeds, `vitest` green


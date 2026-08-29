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

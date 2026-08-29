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

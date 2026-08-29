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

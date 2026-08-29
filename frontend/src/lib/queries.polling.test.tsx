import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import type { Submission, SubmissionStatus } from './types';
import { useSubmission } from './queries';

const { getSubmission } = vi.hoisted(() => ({ getSubmission: vi.fn() }));
vi.mock('./api', () => ({ getSubmission }));

const sub = (status: SubmissionStatus): Submission => ({
  id: '1', user_id: '1', problem_id: '1', language_id: '1',
  status, runtime_ms: null, memory_kb: null,
  submitted_at: '2026-08-29T00:00:00.000Z', completed_at: null,
});
const mk = (qc: QueryClient) => ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const cached = (qc: QueryClient) =>
  qc.getQueryData<{ submission: Submission }>(['submission', '1'])?.submission.status;

beforeEach(() => { vi.useFakeTimers(); getSubmission.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

test('polls while non-terminal, then stops once terminal', async () => {
  getSubmission
    .mockResolvedValueOnce({ submission: sub('judging'), testResults: [] })
    .mockResolvedValue({ submission: sub('accepted'), testResults: [] });

  const qc = client();
  renderHook(() => useSubmission('1'), { wrapper: mk(qc) });

  await act(async () => { await vi.advanceTimersByTimeAsync(0); });      // initial fetch
  expect(getSubmission).toHaveBeenCalledTimes(1);
  expect(cached(qc)).toBe('judging');

  await act(async () => { await vi.advanceTimersByTimeAsync(1500); });   // one poll → terminal
  expect(getSubmission).toHaveBeenCalledTimes(2);
  expect(cached(qc)).toBe('accepted');

  await act(async () => { await vi.advanceTimersByTimeAsync(1500 * 3); }); // terminal → no more polling
  expect(getSubmission).toHaveBeenCalledTimes(2);
});

test('stops polling after unmount', async () => {
  getSubmission.mockResolvedValue({ submission: sub('judging'), testResults: [] });

  const qc = client();
  const { unmount } = renderHook(() => useSubmission('1'), { wrapper: mk(qc) });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(getSubmission).toHaveBeenCalledTimes(1);

  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(1500 * 3); });
  expect(getSubmission).toHaveBeenCalledTimes(1);     // no calls after unmount
});

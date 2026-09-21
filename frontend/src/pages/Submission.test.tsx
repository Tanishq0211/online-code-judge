import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import Submission from './Submission';
import Submissions from './Submissions';
import type { Submission as SubmissionDto, TestResult } from '../lib/types';

vi.mock('../lib/api');
import * as api from '../lib/api';

const QUEUED_NEVER_RESOLVES = new Promise<never>(() => {});

function renderAt(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      {/* The route supplies the :id param — without it the query is disabled. */}
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/submissions/:id" element={<Submission />} />
          <Route path="/submissions" element={<Submissions />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const submission = (over: Partial<SubmissionDto>): SubmissionDto => ({
  id: '60', user_id: '1', problem_id: '22', language_id: '2',
  status: 'queued', runtime_ms: null, memory_kb: null,
  compiler_output: null, stdout: null, stderr: null,
  submitted_at: new Date().toISOString(), completed_at: null,
  ...over,
});

const result = (over: Partial<TestResult>): TestResult => ({
  id: '1', submission_id: '60', test_case_id: '1',
  status: 'accepted', runtime_ms: 100, memory_kb: null, stdout: null, stderr: null,
  ...over,
});

beforeEach(() => {
  vi.mocked(api.listLanguages).mockResolvedValue({
    data: [{ id: '2', name: 'Python' }],
  });
});

test('shows a skeleton (not text) while the submission loads', async () => {
  vi.mocked(api.getSubmission).mockReturnValue(QUEUED_NEVER_RESOLVES as never);
  renderAt('/submissions/60');
  const status = screen.getByRole('status', { name: 'Loading submission' });
  expect(status).toBeInTheDocument();
  // skeleton placeholders are decorative spans, hidden from the a11y tree
  expect(screen.getByText('Loading submission…')).toHaveClass('sr-only');
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});

test('shows the slow-judge message for a submission queued longer than 30s', async () => {
  const stale = new Date(Date.now() - 31_000).toISOString();
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({ id: '60', status: 'queued', submitted_at: stale }),
    testResults: [] as TestResult[],
  });
  renderAt('/submissions/60');
  // Two elements carry the wording: the visible warning paragraph AND the
  // sr-only live region (which announces the change exactly once).
  const msgs = await screen.findAllByText(/taking longer than usual/i);
  expect(msgs).toHaveLength(2);
  expect(screen.getByText(/taking longer than usual to judge\./)).toHaveClass('sr-only');
});

test('does not show the slow-judge message for a terminal verdict', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({ status: 'accepted', runtime_ms: 189 }),
    testResults: [result({})],
  });
  renderAt('/submissions/60');
  await waitFor(() => expect(screen.getAllByText('Accepted')).toHaveLength(2));
  expect(screen.queryByText(/taking longer than usual/i)).not.toBeInTheDocument();
  // terminal live-region announcement is unchanged from Stage 3
  expect(screen.getByText('Submission 60 verdict: Accepted.')).toBeInTheDocument();
});

test('terminal verdict summary: pass count, language name, judged duration', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({
      status: 'wrong_answer', runtime_ms: 300,
      submitted_at: '2026-09-13T10:00:00.000Z',
      completed_at: '2026-09-13T10:00:04.500Z',
    }),
    testResults: [result({}), result({ id: '2', test_case_id: '2', status: 'wrong_answer' }), result({ id: '3', test_case_id: '3' })],
  });
  renderAt('/submissions/60');
  // computed from the rows the API returned — 2 of 3 accepted
  expect(await screen.findByText('2 / 3 tests passed')).toBeInTheDocument();
  // language resolved from the cached languages list
  expect(screen.getByText(/Python/)).toBeInTheDocument();
  // judged duration derived from the two API timestamps (4.5s)
  expect(screen.getByText(/judged in 4\.5s/)).toBeInTheDocument();
});

test('no pass count when the judge recorded no test rows', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({ status: 'accepted' }),
    testResults: [],
  });
  renderAt('/submissions/60');
  await screen.findByText('Submission 60 verdict: Accepted.');
  expect(screen.queryByText(/tests passed/)).not.toBeInTheDocument();
});

test('per-test results: index, status, runtime, and outputs are exposed', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({ status: 'wrong_answer' }),
    testResults: [
      result({ id: '1', test_case_id: '1', status: 'accepted', runtime_ms: 12, stdout: 'hello' }),
      result({ id: '2', test_case_id: '2', status: 'wrong_answer', runtime_ms: 34, stdout: 'world\n', stderr: 'mismatch' }),
    ],
  });
  renderAt('/submissions/60');
  expect(await screen.findByText('#1')).toBeInTheDocument();
  expect(screen.getByText('#2')).toBeInTheDocument();
  expect(screen.getByText('12 ms')).toBeInTheDocument();
  expect(screen.getByText('34 ms')).toBeInTheDocument();
  // per-test output panels render only what the API returned
  expect(screen.getByText('hello')).toBeInTheDocument();
  expect(screen.getByText('mismatch')).toBeInTheDocument();
  // every copy control is keyboard-reachable with an accessible name
  expect(screen.getByRole('button', { name: 'Copy stdout — test #1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy stdout — test #2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy stderr — test #2' })).toBeInTheDocument();
});

test('copy button writes the panel text to the clipboard', async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({
      status: 'wrong_answer',
      source_code: 'print(input())',
    }),
    testResults: [result({ id: '1', test_case_id: '1', status: 'wrong_answer', stdout: 'hi' })],
  });
  renderAt('/submissions/60');
  await screen.findByText('hi');
  await user.click(screen.getByRole('button', { name: 'Copy stdout — test #1' }));
  expect(writeText).toHaveBeenCalledWith('hi');
  expect(screen.getByRole('button', { name: 'Copy source code' })).toBeInTheDocument();
});

test('compiler output renders only when the backend returned it', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({
      status: 'compilation_error',
      compiler_output: "error: expected ';' before return",
    }),
    testResults: [result({ id: '1', test_case_id: '1', status: 'skipped' })],
  });
  renderAt('/submissions/60');
  expect(await screen.findByText(/expected ';' before return/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy compiler output' })).toBeInTheDocument();
});

test('an out-of-union verdict from the backend renders as a neutral badge, not a crash (TODO-010)', async () => {
  vi.mocked(api.getSubmission).mockResolvedValue({
    submission: submission({ status: 'pending' as never }),
    testResults: [],
  });
  renderAt('/submissions/60');
  // 'pending' is a real backend status that the frontend union omits; the
  // fallback must show the raw value instead of throwing on .tone. The page
  // treats it as non-terminal (isTerminal has no 'pending'), which is correct.
  expect(await screen.findByText('pending')).toBeInTheDocument();
  expect(screen.getByText(/judging in progress/)).toBeInTheDocument();
});

test("the status filter does not offer 'skipped' — the backend rejects it (TODO-012)", async () => {
  vi.mocked(api.listSubmissions).mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  renderAt('/submissions');
  const filter = (await screen.findByRole('combobox', { name: 'Filter by status' })) as HTMLSelectElement;
  const options = [...filter.options].map((o) => o.value);
  expect(options).not.toContain('skipped');
  expect(options).toContain('accepted');
  expect(options).toContain('wrong_answer');
});

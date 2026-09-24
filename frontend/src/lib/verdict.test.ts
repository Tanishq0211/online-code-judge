import { isTerminal, TERMINAL_STATUSES } from './types';
import type { SubmissionStatus } from './types';
import { verdictMeta, verdictMetaOf } from './verdict';

// Keep in sync with STATUSES in src/routes/submissions.ts (backend contract).
const NON_TERMINAL = [
  'pending', 'queued', 'compiling', 'running', 'judging',
] as const satisfies readonly SubmissionStatus[];
const TERMINAL = [
  'accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded',
  'memory_limit_exceeded', 'compilation_error', 'internal_error',
] as const satisfies readonly SubmissionStatus[];

test('all 12 backend submission statuses have explicit verdict metadata', () => {
  const statuses = [...NON_TERMINAL, ...TERMINAL];
  expect(statuses).toHaveLength(12);
  for (const status of statuses) {
    expect(verdictMeta).toHaveProperty(status);
    expect(verdictMetaOf(status)).toBe(verdictMeta[status]);
  }
});

test('the added transient statuses use the agreed labels and tones', () => {
  expect(verdictMetaOf('pending')).toEqual({ label: 'Pending', tone: 'neutral' });
  expect(verdictMetaOf('compiling')).toEqual({ label: 'Compiling', tone: 'info' });
  expect(verdictMetaOf('running')).toEqual({ label: 'Running', tone: 'info' });
});

test('all five transient submission statuses remain non-terminal', () => {
  for (const status of NON_TERMINAL) expect(isTerminal(status)).toBe(false);
});

test('exactly the seven final submission statuses remain terminal', () => {
  expect([...TERMINAL_STATUSES].sort()).toEqual([...TERMINAL].sort());
  for (const status of TERMINAL) expect(isTerminal(status)).toBe(true);
  expect(isTerminal('skipped')).toBe(false);
});

test('skipped retains neutral metadata for per-test results', () => {
  expect(verdictMetaOf('skipped')).toEqual({ label: 'Skipped', tone: 'neutral' });
});

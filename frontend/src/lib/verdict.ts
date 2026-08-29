import type { SubmissionStatus } from './types';

export const verdictMeta: Record<SubmissionStatus, { label: string; cls: string }> = {
  queued:                { label: 'Queued',                cls: 'bg-gray-200 text-gray-800' },
  judging:               { label: 'Judging',               cls: 'bg-blue-200 text-blue-800' },
  accepted:              { label: 'Accepted',              cls: 'bg-green-200 text-green-800' },
  wrong_answer:          { label: 'Wrong Answer',          cls: 'bg-red-200 text-red-800' },
  time_limit_exceeded:   { label: 'Time Limit Exceeded',   cls: 'bg-amber-200 text-amber-900' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', cls: 'bg-amber-200 text-amber-900' },
  runtime_error:         { label: 'Runtime Error',         cls: 'bg-red-200 text-red-800' },
  compilation_error:     { label: 'Compilation Error',     cls: 'bg-red-200 text-red-800' },
  internal_error:        { label: 'Internal Error',        cls: 'bg-red-200 text-red-800' },
  skipped:               { label: 'Skipped',               cls: 'bg-gray-200 text-gray-600' },
};

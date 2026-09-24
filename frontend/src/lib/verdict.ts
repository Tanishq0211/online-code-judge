import type { SubmissionStatus } from './types';
import type { Tone } from '../components/ui/Badge';

export const verdictMeta: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  pending:               { label: 'Pending',               tone: 'neutral' },
  queued:                { label: 'Queued',                tone: 'neutral' },
  compiling:             { label: 'Compiling',             tone: 'info' },
  running:               { label: 'Running',               tone: 'info' },
  judging:               { label: 'Judging',               tone: 'info' },
  accepted:              { label: 'Accepted',              tone: 'success' },
  wrong_answer:          { label: 'Wrong Answer',          tone: 'error' },
  time_limit_exceeded:   { label: 'Time Limit Exceeded',   tone: 'warning' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', tone: 'warning' },
  runtime_error:         { label: 'Runtime Error',         tone: 'error' },
  compilation_error:     { label: 'Compilation Error',     tone: 'error' },
  internal_error:        { label: 'Internal Error',        tone: 'error' },
  skipped:               { label: 'Skipped',               tone: 'neutral' },
};

/* Unrecognized runtime statuses still fall back to the raw status string
   with a neutral tone (TODO-010). */
export const verdictMetaOf = (status: SubmissionStatus): { label: string; tone: Tone } =>
  verdictMeta[status] ?? { label: status, tone: 'neutral' };

export const verdictLabel = (status: SubmissionStatus): string => verdictMetaOf(status).label;

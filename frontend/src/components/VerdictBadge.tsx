import type { SubmissionStatus } from '../lib/types';
import { verdictMetaOf } from '../lib/verdict';
import Badge from './ui/Badge';

export default function VerdictBadge({ status }: { status: SubmissionStatus }) {
  // Fallback is the point (TODO-010): an out-of-union status from the backend
  // must render as a neutral badge with the raw value, never crash.
  const m = verdictMetaOf(status);
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

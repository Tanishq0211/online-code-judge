import type { SubmissionStatus } from '../lib/types';
import { verdictMeta } from '../lib/verdict';

export default function VerdictBadge({ status }: { status: SubmissionStatus }) {
  const m = verdictMeta[status];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

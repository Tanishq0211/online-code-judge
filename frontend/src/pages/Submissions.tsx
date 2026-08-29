import { useSearchParams, Link } from 'react-router-dom';
import { useSubmissions } from '../lib/queries';
import type { SubmissionStatus } from '../lib/types';
import Pagination from '../components/Pagination';
import ErrorState from '../components/ErrorState';
import VerdictBadge from '../components/VerdictBadge';

const LIMIT = 20;
const STATUSES: SubmissionStatus[] = [
  'queued', 'judging', 'accepted', 'wrong_answer', 'time_limit_exceeded',
  'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'internal_error', 'skipped',
];
const ms = (v: number | null) => (v == null ? '—' : `${v} ms`);
const kb = (v: number | null) => (v == null ? '—' : `${v} KB`);

export default function Submissions() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || '1');
  const status = (sp.get('status') || '') as SubmissionStatus | '';

  const q = useSubmissions({ page, limit: LIMIT, status });

  const patch = (next: Record<string, string>) => {
    const merged: Record<string, string> = { page: '1', status, ...next };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    setSp(p);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">My submissions</h1>
      <div className="mb-4">
        <select className="border p-2 rounded" value={status} onChange={(e) => patch({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {q.isLoading && <p className="text-gray-500">Loading…</p>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.data.length === 0 && <p className="text-gray-500">No submissions yet.</p>}

      {q.data && q.data.data.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-sm text-gray-600">
              <th className="py-2">Submission</th>
              <th className="py-2">Verdict</th>
              <th className="py-2">Resources</th>
              <th className="py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="py-2"><Link className="text-blue-600" to={`/submissions/${s.id}`}>#{s.id}</Link></td>
                <td className="py-2"><VerdictBadge status={s.status} /></td>
                <td className="py-2 text-sm text-gray-500">{ms(s.runtime_ms)} · {kb(s.memory_kb)}</td>
                <td className="py-2 text-sm text-gray-500">{new Date(s.submitted_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {q.data && (
        <Pagination page={page} totalPages={q.data.pagination.totalPages} onPage={(n) => patch({ page: String(n) })} />
      )}
    </div>
  );
}

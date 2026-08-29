import { useParams, Link } from 'react-router-dom';
import { useSubmission } from '../lib/queries';
import { ApiError } from '../lib/api';
import { isTerminal } from '../lib/types';
import VerdictBadge from '../components/VerdictBadge';
import ErrorState from '../components/ErrorState';

const ms = (v: number | null) => (v == null ? '—' : `${v} ms`);
const kb = (v: number | null) => (v == null ? '—' : `${v} KB`);

export default function Submission() {
  const { id = '' } = useParams();
  const q = useSubmission(id);

  if (q.isError && (q.error as ApiError)?.status === 404) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-500">Submission not found.</p>
        <Link className="text-blue-600" to="/submissions">← Back to submissions</Link>
      </div>
    );
  }
  if (q.isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (q.isError) return <div className="p-6"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;

  const { submission: s, testResults } = q.data!;
  const pending = !isTerminal(s.status);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link className="text-blue-600 text-sm" to="/submissions">← Submissions</Link>
      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Submission {s.id}</h1>
        <VerdictBadge status={s.status} />
        {pending && <span className="text-xs text-gray-400">updating…</span>}
      </div>
      <p className="text-sm text-gray-500 mt-1">
        {ms(s.runtime_ms)} · {kb(s.memory_kb)} · submitted {new Date(s.submitted_at).toLocaleString()}
      </p>

      {s.source_code != null && (
        <section className="mt-4">
          <h2 className="font-semibold mb-1">Source</h2>
          <pre className="border rounded p-3 bg-gray-50 text-xs overflow-auto">{s.source_code}</pre>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Test results</h2>
        {testResults.length === 0 ? (
          <p className="text-sm text-gray-500">No results yet.</p>
        ) : (
          <div className="space-y-3">
            {testResults.map((t, i) => (
              <div key={t.id} className="border rounded p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">#{i + 1}</span>
                  <VerdictBadge status={t.status} />
                  <span className="text-gray-500">{ms(t.runtime_ms)} · {kb(t.memory_kb)}</span>
                </div>
                {t.stdout && <pre className="mt-2 bg-gray-50 rounded p-2 text-xs overflow-auto"><b>stdout</b>{'\n'}{t.stdout}</pre>}
                {t.stderr && <pre className="mt-2 bg-red-50 rounded p-2 text-xs overflow-auto"><b>stderr</b>{'\n'}{t.stderr}</pre>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

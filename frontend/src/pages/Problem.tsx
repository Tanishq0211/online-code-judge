import { useParams, Link } from 'react-router-dom';
import { useProblem, useTestCases } from '../lib/queries';
import { ApiError } from '../lib/api';
import ErrorState from '../components/ErrorState';

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="mt-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="whitespace-pre-wrap text-sm">{body}</p>
    </section>
  );
}

export default function Problem() {
  const { slug = '' } = useParams();
  const p = useProblem(slug);
  const tc = useTestCases(slug);

  if (p.isError && (p.error as ApiError)?.status === 404) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-500">Problem not found.</p>
        <Link className="text-blue-600" to="/problems">← Back to problems</Link>
      </div>
    );
  }
  if (p.isLoading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (p.isError) return <div className="p-6"><ErrorState error={p.error} onRetry={() => p.refetch()} /></div>;

  const problem = p.data!.problem;
  const samples = tc.data?.data ?? [];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link className="text-blue-600 text-sm" to="/problems">← Problems</Link>
      <h1 className="text-2xl font-semibold mt-2">{problem.title}</h1>
      <p className="text-sm text-gray-500 capitalize">
        {problem.difficulty} · {problem.time_limit_ms} ms · {problem.memory_limit_mb} MB
      </p>

      <Section title="Statement" body={problem.statement} />
      <Section title="Input" body={problem.input_format} />
      <Section title="Output" body={problem.output_format} />
      <Section title="Constraints" body={problem.constraints} />

      {samples.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Sample cases</h2>
          <div className="space-y-3">
            {samples.map((s) => (
              <div key={s.id} className="grid grid-cols-2 gap-3">
                <pre className="border rounded p-2 bg-gray-50 text-xs overflow-auto"><b>Input</b>{'\n'}{s.input}</pre>
                <pre className="border rounded p-2 bg-gray-50 text-xs overflow-auto"><b>Expected</b>{'\n'}{s.expected_output}</pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Editor + submit added in Task 7 */}
      <div data-testid="editor-slot" className="mt-6" />
    </div>
  );
}

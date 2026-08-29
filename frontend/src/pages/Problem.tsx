import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProblem, useTestCases, useLanguages, useCreateSubmission } from '../lib/queries';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import ErrorState from '../components/ErrorState';
import LanguagePicker from '../components/LanguagePicker';
import CodeEditor from '../components/CodeEditor';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const p = useProblem(slug);
  const tc = useTestCases(slug);
  const langs = useLanguages();
  const create = useCreateSubmission();
  const [languageId, setLanguageId] = useState('');
  const [source, setSource] = useState('');

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

      {/* Editor + submit (Task 7) */}
      <section className="mt-6">
        <h2 className="font-semibold mb-2">Solution</h2>
        {!user ? (
          <p className="text-sm text-gray-500">
            <Link className="text-blue-600" to={`/login?from=/problems/${slug}`}>Log in to submit</Link>
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <LanguagePicker value={languageId} onChange={setLanguageId} />
            </div>
            <CodeEditor
              slug={slug}
              languageId={languageId}
              languageName={langs.data?.data.find((l) => l.id === languageId)?.name ?? ''}
              value={source}
              onChange={setSource}
              onRestore={(savedSrc, savedLang) => {
                if (savedSrc != null) setSource(savedSrc);
                if (savedLang) setLanguageId(savedLang);
              }}
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={!languageId || !source.trim() || create.isPending}
                onClick={() =>
                  create.mutate(
                    { problem_id: problem.id, language_id: languageId, source_code: source },
                    { onSuccess: (r) => navigate(`/submissions/${r.submission.id}`) },
                  )
                }
              >
                {create.isPending ? 'Submitting…' : 'Submit'}
              </button>
              {create.isError && (
                <span className="text-sm text-red-600">{(create.error as ApiError).message}</span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

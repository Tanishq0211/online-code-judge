import { lazy, Suspense, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProblem, useTestCases, useLanguages, useCreateSubmission } from '../lib/queries';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import ErrorState, { errorMessage } from '../components/ErrorState';
import LanguagePicker from '../components/LanguagePicker';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import Badge, { type Tone } from '../components/ui/Badge';

/* CodeMirror (~70 % of the bundle) is only needed on this page — and only for
   signed-in users — so it is code-split out of the initial route bundle
   (Stage 9 / ISSUE-002). The fallback mirrors the editor's geometry in the
   Stage 5 skeleton language, so the swap is not a layout jump. */
const CodeEditor = lazy(() => import('../components/CodeEditor'));

const diffTone: Record<string, Tone> = { easy: 'success', medium: 'warning', hard: 'error' };

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-1 text-sm font-semibold text-fg-secondary">{title}</h2>
      <p className="whitespace-pre-wrap text-sm text-fg">{body}</p>
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
  const toast = useToast();
  const [languageId, setLanguageId] = useState('');
  const [source, setSource] = useState('');
  // Two-step reset: the first click arms an inline confirmation, the second
  // (or Cancel) resolves it. Deliberately not a modal — a hostile-enough
  // accident can't clear the draft, but keyboard users aren't trapped either.
  const [confirmingReset, setConfirmingReset] = useState(false);
  useDocumentTitle(p.data ? `Problem — ${p.data.problem.title}` : undefined);

  const resetDraft = () => {
    setSource('');
    // The editor's own persistence effect removes the localStorage key when
    // the value is empty (ISSUE-008 fix), so the draft cannot resurrect.
    setConfirmingReset(false);
    toast('Draft cleared.', 'info');
  };

  if (p.isError && (p.error as ApiError)?.status === 404) {
    return (
      <Container size="prose" className="py-8">
        <p className="text-fg-muted">Problem not found.</p>
        <Link className="text-accent hover:underline" to="/problems">← Back to problems</Link>
      </Container>
    );
  }
  if (p.isLoading) {
    return (
      <Container size="prose" className="py-8">
        <div role="status" aria-label="Loading problem" className="space-y-6">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-[360px] w-full rounded-md" />
          </div>
          <p className="sr-only">Loading problem…</p>
        </div>
      </Container>
    );
  }
  if (p.isError) return <Container size="prose" className="py-8"><ErrorState error={p.error} onRetry={() => p.refetch()} /></Container>;

  const problem = p.data!.problem;
  const samples = tc.data?.data ?? [];

  return (
    <Container size="prose" className="py-8">
      <Link className="text-sm text-accent hover:underline" to="/problems">← Problems</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{problem.title}</h1>
        <Badge tone={diffTone[problem.difficulty] ?? 'neutral'} className="capitalize">{problem.difficulty}</Badge>
      </div>
      <p className="mt-1 font-mono text-sm text-fg-muted">
        {problem.time_limit_ms} ms · {problem.memory_limit_mb} MB
      </p>

      <Section title="Statement" body={problem.statement} />
      <Section title="Input" body={problem.input_format} />
      <Section title="Output" body={problem.output_format} />
      <Section title="Constraints" body={problem.constraints} />

      {(samples.length > 0 || tc.isError || tc.isLoading) && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Sample cases</h2>
          {tc.isLoading ? (
            <div role="status" aria-label="Loading sample cases" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <p className="sr-only">Loading sample cases…</p>
            </div>
          ) : tc.isError ? (
            <ErrorState error={tc.error} onRetry={() => tc.refetch()} />
          ) : (
            <div className="space-y-3">
              {samples.map((s) => (
                <div key={s.id} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <pre className="overflow-auto rounded-md border bg-bg p-2 text-xs"><b>Input</b>{'\n'}{s.input}</pre>
                  <pre className="overflow-auto rounded-md border bg-bg p-2 text-xs"><b>Expected</b>{'\n'}{s.expected_output}</pre>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Editor + submit (Task 7) */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-fg-secondary">Solution</h2>
        {!user ? (
          <p className="text-sm text-fg-muted">
            <Link className="text-accent hover:underline" to={`/login?from=/problems/${slug}`}>Log in to submit</Link>
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <LanguagePicker value={languageId} onChange={setLanguageId} />
              <span className="flex-1" />
              {confirmingReset ? (
                <span role="group" aria-label="Confirm draft reset" className="flex items-center gap-2">
                  <span className="text-xs text-fg-secondary">Clear saved draft?</span>
                  <Button variant="danger" size="sm" onClick={resetDraft}>Clear</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(false)}>Cancel</Button>
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingReset(true)}
                  aria-label="Clear saved draft"
                  disabled={!source.trim()}
                >
                  Reset draft
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-md border">
              <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-none" />}>
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
              </Suspense>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                loading={create.isPending}
                disabled={!languageId || !source.trim()}
                onClick={() =>
                  create.mutate(
                    { problem_id: problem.id, language_id: languageId, source_code: source },
                    {
                      onSuccess: (r) => {
                        toast('Submission received — judging now.', 'success');
                        navigate(`/submissions/${r.submission.id}`);
                      },
                    },
                  )
                }
              >
                {create.isPending ? 'Submitting…' : 'Submit'}
              </Button>
              {create.isError && (
                <span role="alert" className="text-sm text-error-fg break-words">{errorMessage(create.error)}</span>
              )}
            </div>
          </>
        )}
      </section>
    </Container>
  );
}

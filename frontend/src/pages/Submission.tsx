import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSubmission, useLanguages } from '../lib/queries';
import { ApiError } from '../lib/api';
import { isTerminal, type TestResult } from '../lib/types';
import { verdictLabel } from '../lib/verdict';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import VerdictBadge from '../components/VerdictBadge';
import ErrorState from '../components/ErrorState';
import Container from '../components/ui/Container';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import { cn } from '../components/ui/cn';
import { useToast } from '../components/ui/Toast';

const ms = (v: number | null) => (v == null ? '—' : `${v} ms`);
const kb = (v: number | null) => (v == null ? '—' : `${v} KB`);

/* Observed end-to-end verdicts land in a few seconds (poll every 1.5 s, worker
   every 2 s). Past this threshold, tell the user the wait is unusual — but the
   message must NOT claim the judge is definitively offline, and polling keeps
   running (the refetchInterval rule is untouched). */
const SLOW_JUDGE_MS = 30_000;
const SLOW_CHECK_MS = 5000;

function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard.', 'success');
    } catch {
      toast('Couldn’t copy — your browser blocked clipboard access.', 'error');
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-label={label}>
      Copy
    </Button>
  );
}

/* Diagnostic output panel: monospace, whitespace-preserving, internally
   scrollable, with a labelled copy action. Rendered only when the backend
   actually returned text for the field. */
function OutputPanel({ title, text, tone }: { title: string; text: string; tone?: 'error' }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-fg-secondary">{title}</h4>
        <CopyButton text={text} label={`Copy ${title}`} />
      </div>
      <pre
        className={cn(
          'mt-1 max-h-40 overflow-auto whitespace-pre rounded-md p-2 text-xs',
          tone === 'error' ? 'bg-error-subtle text-error-fg' : 'bg-bg text-fg',
        )}
      >
        {text}
      </pre>
    </div>
  );
}

const testOutputs = (t: TestResult, displayIndex: number) => {
  const outs: Array<{ title: string; text: string; tone?: 'error' }> = [];
  if (t.stdout) outs.push({ title: `stdout — test #${displayIndex}`, text: t.stdout });
  if (t.stderr) outs.push({ title: `stderr — test #${displayIndex}`, text: t.stderr, tone: 'error' });
  return outs;
};

export default function Submission() {
  const { id = '' } = useParams();
  const q = useSubmission(id);
  const langs = useLanguages();
  useDocumentTitle(`Submission — ${id}`);
  // Re-render every few seconds while a submission is non-terminal so the
  // slow-judge threshold can be crossed. The clock lives in state (updated by
  // the interval, never read during render) so the component stays pure; the
  // live region's text does not change per tick, so screen readers hear
  // nothing until the slow message or the verdict actually lands.
  const [now, setNow] = useState(() => Date.now());
  const nonTerminal = !!q.data && !isTerminal(q.data.submission.status);
  useEffect(() => {
    if (!nonTerminal) return;
    const t = setInterval(() => setNow(Date.now()), SLOW_CHECK_MS);
    return () => clearInterval(t);
  }, [nonTerminal]);

  if (q.isError && (q.error as ApiError)?.status === 404) {
    return (
      <Container size="prose" className="py-8">
        <p className="text-fg-muted">Submission not found.</p>
        <Link className="text-accent hover:underline" to="/submissions">← Back to submissions</Link>
      </Container>
    );
  }
  if (q.isLoading) {
    return (
      <Container size="prose" className="py-8">
        <div role="status" aria-label="Loading submission" className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-2 h-24 w-full rounded-md" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <p className="sr-only">Loading submission…</p>
        </div>
      </Container>
    );
  }
  if (q.isError) return <Container size="prose" className="py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></Container>;

  const { submission: s, testResults } = q.data!;
  const pending = !isTerminal(s.status);
  const slow = pending && now - new Date(s.submitted_at).getTime() > SLOW_JUDGE_MS;
  const statusLabel = verdictLabel(s.status);
  const langName = langs.data?.data.find((l) => l.id === s.language_id)?.name ?? `Language ${s.language_id}`;
  // Both timestamps come from the API; the duration is derived, not invented.
  const judgedIn = s.completed_at
    ? `${((new Date(s.completed_at).getTime() - new Date(s.submitted_at).getTime()) / 1000).toFixed(1)}s`
    : null;
  // Pass count is computed from the per-test rows the API actually returned —
  // never fabricated when the judge recorded no rows (e.g. compile errors
  // record 'skipped' rows, so the count still reflects them honestly).
  const passedCount = testResults.filter((t) => t.status === 'accepted').length;
  const allPassed = testResults.length > 0 && passedCount === testResults.length;

  return (
    <Container size="prose" className="py-8">
      {/* Screen readers hear the verdict land without anyone reading the badge:
          while pending it says judging is in progress; past the slow threshold
          the wording changes once (one extra announcement); the terminal status
          replaces it once, and live regions only announce *changes*. */}
      <p aria-live="polite" className="sr-only">
        {pending
          ? slow
            ? `Submission ${s.id} is taking longer than usual to judge.`
            : `Submission ${s.id}: judging in progress.`
          : `Submission ${s.id} verdict: ${statusLabel}.`}
      </p>
      <Link className="text-sm text-accent hover:underline" to="/submissions">← Submissions</Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1" aria-busy={pending}>
        <h1 className="text-xl">Submission {s.id}</h1>
        <VerdictBadge status={s.status} />
        {!pending && testResults.length > 0 && (
          <Badge tone={allPassed ? 'success' : 'error'}>
            {passedCount} / {testResults.length} tests passed
          </Badge>
        )}
        {pending && <span className="text-xs text-fg-muted">updating…</span>}
      </div>
      <p className="mt-1 break-words font-mono text-sm text-fg-muted">
        Problem #{s.problem_id} · {langName} · {ms(s.runtime_ms)} · {kb(s.memory_kb)} · submitted{' '}
        {new Date(s.submitted_at).toLocaleString()}
        {judgedIn && <> · judged in {judgedIn}</>}
      </p>
      {/* Plain <p>, deliberately NOT a live region: the sr-only region above
          announces the slow state once, so screen readers don't hear it twice. */}
      {slow && (
        <p className="mt-3 rounded-md border border-warning/40 bg-warning-subtle p-3 text-sm text-warning-fg">
          Judging is taking longer than usual — your submission is still in the queue.
          The judge may be offline or busy, but the verdict will appear here automatically.
        </p>
      )}

      {s.compiler_output?.trim() && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-secondary">Compiler output</h2>
            <CopyButton text={s.compiler_output} label="Copy compiler output" />
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre rounded-md border bg-bg p-3 text-xs">
            {s.compiler_output}
          </pre>
        </section>
      )}

      {s.source_code != null && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-secondary">Source</h2>
            <CopyButton text={s.source_code} label="Copy source code" />
          </div>
          <pre className="overflow-auto rounded-md border bg-bg p-3 text-xs">{s.source_code}</pre>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-fg-secondary">Test results</h2>
        {testResults.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {pending ? 'Waiting for the judge to report results…' : 'No test results were recorded.'}
          </p>
        ) : (
          <Card className="overflow-hidden">
            {/* Column captions for the sm+ aligned grid; on mobile each test
                is a self-describing stacked row, so no header is needed. */}
            <div
              aria-hidden="true"
              className="hidden grid-cols-[3rem_1fr_7rem_6rem] gap-3 border-b px-4 py-2 text-xs uppercase tracking-wide text-fg-muted sm:grid"
            >
              <span>#</span>
              <span>Verdict</span>
              <span>Runtime</span>
              <span>Memory</span>
            </div>
            <ul className="divide-y">
              {testResults.map((t, i) => {
                const outs = testOutputs(t, i + 1);
                return (
                  <li key={t.id} className="px-4 py-3">
                    <div className="grid gap-1 sm:grid-cols-[3rem_1fr_7rem_6rem] sm:items-center sm:gap-3">
                      <span className="font-medium">#{i + 1}</span>
                      <span><VerdictBadge status={t.status} /></span>
                      <span className="font-mono text-xs text-fg-muted">{ms(t.runtime_ms)}</span>
                      <span className="font-mono text-xs text-fg-muted">{kb(t.memory_kb)}</span>
                    </div>
                    {outs.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {outs.map((o) => <OutputPanel key={o.title} {...o} />)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </Container>
  );
}

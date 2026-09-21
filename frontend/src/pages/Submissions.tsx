import { useSearchParams, Link } from 'react-router-dom';
import { useSubmissions, useLanguages } from '../lib/queries';
import type { SubmissionStatus } from '../lib/types';
import Pagination from '../components/Pagination';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import VerdictBadge from '../components/VerdictBadge';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';
import Card from '../components/ui/Card';
import Button, { buttonClasses } from '../components/ui/Button';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';

const LIMIT = 20;
/* Submission-level filter vocabulary — must match the backend's validator
   (src/routes/submissions.ts). 'skipped' is a PER-TEST status only and is not
   accepted by the backend filter: offering it produced a reachable 400
   (TODO-012 / ISSUE-017, resolved Stage 7). */
const STATUSES: SubmissionStatus[] = [
  'queued', 'judging', 'accepted', 'wrong_answer', 'time_limit_exceeded',
  'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'internal_error',
];
const ms = (v: number | null) => (v == null ? '—' : `${v} ms`);
const kb = (v: number | null) => (v == null ? '—' : `${v} KB`);

export default function Submissions() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || '1');
  const status = (sp.get('status') || '') as SubmissionStatus | '';

  const q = useSubmissions({ page, limit: LIMIT, status });
  const langs = useLanguages();
  // The list payload carries only ids; the languages cache is staleTime:Infinity
  // so this resolves from data the page already has. Problem titles are not in
  // the payload and there is no by-id endpoint — the id is shown as-is.
  const langName = (id: string) =>
    langs.data?.data.find((l) => l.id === id)?.name ?? `Language ${id}`;
  useDocumentTitle('Submissions');

  const patch = (next: Record<string, string>) => {
    const merged: Record<string, string> = { page: '1', status, ...next };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    setSp(p);
  };

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl">My submissions</h1>
      <div className="mb-4">
        <Select aria-label="Filter by status" value={status} onChange={(e) => patch({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>

      {q.isLoading && (
        <div role="status" aria-label="Loading submissions" className="space-y-3">
          <Card className="overflow-hidden sm:hidden">
            <ul className="divide-y">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="px-4 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </span>
                  <Skeleton className="mt-2 h-3 w-2/5" />
                  <Skeleton className="mt-1.5 h-3 w-3/5" />
                </li>
              ))}
            </ul>
          </Card>
          <Card className="hidden overflow-hidden sm:block">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="ml-auto h-3 w-36" />
              </div>
            ))}
          </Card>
          <p className="sr-only">Loading submissions…</p>
        </div>
      )}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.data.length === 0 && (
        status ? (
          <EmptyState
            title={`No submissions with verdict “${status.replace(/_/g, ' ')}”`}
            hint="Your other submissions are still there — clear the filter to see them."
            action={
              <Button variant="secondary" size="sm" onClick={() => patch({ status: '' })}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No submissions yet"
            hint="Solve a problem and your verdicts will appear here."
            action={
              <Link to="/problems" className={buttonClasses('primary', 'sm')}>
                Browse problems
              </Link>
            }
          />
        )
      )}

      {q.data && q.data.data.length > 0 && (
        <>
          {/* Mobile: stacked cards — the 4-column table cannot fit narrow screens.
              Carries everything the desktop table shows, plus the problem and
              language ids the API already returns. */}
          <Card className="overflow-hidden sm:hidden">
            <ul className="divide-y">
              {q.data.data.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/submissions/${s.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-bg"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-accent">#{s.id}</span>
                      <VerdictBadge status={s.status} />
                    </span>
                    <span className="mt-1 block text-xs text-fg-secondary">
                      Problem #{s.problem_id} · {langName(s.language_id)}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-fg-muted">
                      {ms(s.runtime_ms)} · {kb(s.memory_kb)} · {new Date(s.submitted_at).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* sm and up: the table. */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">My submissions, page {page}</caption>
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-fg-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Submission</th>
                  <th scope="col" className="px-4 py-3 font-medium">Verdict</th>
                  <th scope="col" className="px-4 py-3 font-medium">Resources</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {q.data.data.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 transition-colors hover:bg-bg">
                    <td className="px-4 py-3"><Link className="font-medium text-accent hover:underline" to={`/submissions/${s.id}`}>#{s.id}</Link></td>
                    <td className="px-4 py-3"><VerdictBadge status={s.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">{ms(s.runtime_ms)} · {kb(s.memory_kb)}</td>
                    <td className="px-4 py-3 text-sm text-fg-muted">{new Date(s.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {q.data && q.data.data.length > 0 && (
        <Pagination page={page} totalPages={q.data.pagination.totalPages} onPage={(n) => patch({ page: String(n) })} />
      )}
    </Container>
  );
}

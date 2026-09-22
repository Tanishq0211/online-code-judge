import { useSearchParams, Link } from 'react-router-dom';
import { useProblems } from '../lib/queries';
import type { Difficulty } from '../lib/types';
import Pagination from '../components/Pagination';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import Badge, { type Tone } from '../components/ui/Badge';

const LIMIT = 20;

const diffTone: Record<string, Tone> = { easy: 'success', medium: 'warning', hard: 'error' };

export default function Problems() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || '1');
  const difficulty = (sp.get('difficulty') || '') as Difficulty | '';
  const search = sp.get('search') || '';

  const q = useProblems({ page, limit: LIMIT, difficulty, search });
  const filtered = !!(difficulty || search);
  useDocumentTitle('Problems');

  const patch = (next: Record<string, string>) => {
    const merged = { page: '1', difficulty, search, ...next };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    setSp(p);
  };

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl">Problems</h1>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="flex-1"
          type="search"
          aria-label="Search problems"
          placeholder="Search titles…"
          defaultValue={search}
          onKeyDown={(e) => { if (e.key === 'Enter') patch({ search: (e.target as HTMLInputElement).value }); }}
        />
        <Select aria-label="Filter by difficulty" value={difficulty} onChange={(e) => patch({ difficulty: e.target.value })}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </div>

      {q.isLoading && (
        <div role="status" aria-label="Loading problems" className="space-y-3">
          {/* Mirrors both presentations' row geometry; which one shows is CSS. */}
          <Card className="overflow-hidden sm:hidden">
            <ul className="divide-y">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="px-4 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </span>
                  <Skeleton className="mt-2 h-3 w-1/4" />
                </li>
              ))}
            </ul>
          </Card>
          <Card className="hidden overflow-hidden sm:block" aria-hidden="true">
            <div className="border-b px-4 py-3">
              <Skeleton className="h-3 w-48" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </Card>
          <p className="sr-only">Loading problems…</p>
        </div>
      )}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.data.length === 0 && (
        filtered ? (
          <EmptyState
            title="No problems match your filters"
            hint="Try a different search term or difficulty."
            action={
              <Button variant="secondary" size="sm" onClick={() => setSp(new URLSearchParams())}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState title="No problems yet" hint="Problems will show up here once they’re published." />
        )
      )}

      {q.data && q.data.data.length > 0 && (
        <>
          {/* Mobile: stacked list — the 3-column table cannot fit narrow screens. */}
          <Card className="overflow-hidden sm:hidden">
            <ul className="divide-y">
              {q.data.data.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/problems/${p.slug}`}
                    className="block px-4 py-3 transition-colors hover:bg-bg"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium text-accent">{p.title}</span>
                      <Badge tone={diffTone[p.difficulty] ?? 'neutral'} className="capitalize">{p.difficulty}</Badge>
                    </span>
                    <span className="mt-1 block font-mono text-xs text-fg-muted">
                      {p.time_limit_ms} ms · {p.memory_limit_mb} MB
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* sm and up: the table. */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Problems, page {page}</caption>
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-fg-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Title</th>
                  <th scope="col" className="px-4 py-3 font-medium">Difficulty</th>
                  <th scope="col" className="px-4 py-3 font-medium">Limits</th>
                </tr>
              </thead>
              <tbody>
                {q.data.data.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-bg">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-accent hover:underline" to={`/problems/${p.slug}`}>{p.title}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={diffTone[p.difficulty] ?? 'neutral'} className="capitalize">{p.difficulty}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">{p.time_limit_ms} ms · {p.memory_limit_mb} MB</td>
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

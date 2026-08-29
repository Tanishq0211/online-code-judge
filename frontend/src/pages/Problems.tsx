import { useSearchParams, Link } from 'react-router-dom';
import { useProblems } from '../lib/queries';
import type { Difficulty } from '../lib/types';
import Pagination from '../components/Pagination';
import ErrorState from '../components/ErrorState';

const LIMIT = 20;

export default function Problems() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') || '1');
  const difficulty = (sp.get('difficulty') || '') as Difficulty | '';
  const search = sp.get('search') || '';

  const q = useProblems({ page, limit: LIMIT, difficulty, search });

  const patch = (next: Record<string, string>) => {
    const merged = { page: '1', difficulty, search, ...next };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    setSp(p);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Problems</h1>
      <div className="flex gap-3 mb-4">
        <input
          className="border p-2 rounded flex-1" placeholder="Search titles…"
          defaultValue={search}
          onKeyDown={(e) => { if (e.key === 'Enter') patch({ search: (e.target as HTMLInputElement).value }); }}
        />
        <select
          className="border p-2 rounded" value={difficulty}
          onChange={(e) => patch({ difficulty: e.target.value })}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {q.isLoading && <p className="text-gray-500">Loading…</p>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.data.length === 0 && <p className="text-gray-500">No problems found.</p>}

      {q.data && q.data.data.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-sm text-gray-600">
              <th className="py-2">Title</th>
              <th className="py-2">Difficulty</th>
              <th className="py-2">Limits</th>
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="py-2">
                  <Link className="text-blue-600" to={`/problems/${p.slug}`}>{p.title}</Link>
                </td>
                <td className="py-2 capitalize">{p.difficulty}</td>
                <td className="py-2 text-sm text-gray-500">{p.time_limit_ms} ms · {p.memory_limit_mb} MB</td>
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

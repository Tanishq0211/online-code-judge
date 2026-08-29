import { useLanguages } from '../lib/queries';

export default function LanguagePicker({ value, onChange }: {
  value: string; onChange: (id: string) => void;
}) {
  const q = useLanguages();
  if (q.isLoading) return <span className="text-sm text-gray-500">Loading languages…</span>;
  if (q.isError || !q.data) return <span className="text-sm text-red-600">Failed to load languages</span>;
  return (
    <select className="border p-2 rounded" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Select language</option>
      {q.data.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  );
}

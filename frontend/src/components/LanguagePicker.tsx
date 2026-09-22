import { useLanguages } from '../lib/queries';
import Select from './ui/Select';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

export default function LanguagePicker({ value, onChange }: {
  value: string; onChange: (id: string) => void;
}) {
  const q = useLanguages();
  // Select-shaped skeleton: keeps the toolbar row from collapsing while loading.
  if (q.isLoading) {
    return (
      <span role="status" className="inline-flex items-center gap-2">
        <Skeleton className="h-10 w-40" />
        <span className="sr-only">Loading languages…</span>
      </span>
    );
  }
  if (q.isError || !q.data) {
    return (
      <span className="flex items-center gap-2 text-sm text-error-fg">
        Couldn’t load languages.
        <Button variant="secondary" size="sm" onClick={() => q.refetch()}>Retry</Button>
      </span>
    );
  }
  return (
    <Select aria-label="Programming language" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Select language</option>
      {q.data.data.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </Select>
  );
}

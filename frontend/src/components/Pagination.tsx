import Button from './ui/Button';

export default function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center gap-3">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}
        aria-label="Previous page">Prev</Button>
      <span className="text-sm text-fg-secondary tabular-nums" aria-current="page">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        aria-label="Next page">Next</Button>
    </nav>
  );
}

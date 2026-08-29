export default function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 mt-4">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
      <span className="text-sm">Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
    </div>
  );
}

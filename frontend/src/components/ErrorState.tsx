import type { ApiError } from '../lib/api';

export default function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = (error as ApiError)?.message ?? 'Something went wrong.';
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded text-red-800">
      <p>{msg}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 px-3 py-1 border rounded">Retry</button>}
    </div>
  );
}

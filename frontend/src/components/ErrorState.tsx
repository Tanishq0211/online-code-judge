import { ApiError } from '../lib/api';
import Button from './ui/Button';

/** Plain-language message per failure class, so a dead connection doesn't read
    like a validation error (and neither reads like an empty result). */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return "Can't reach the server. Check your connection and try again.";
  if (error.status >= 500) return 'The server ran into a problem. Please try again in a moment.';
  if (error.status === 401) return 'Your session expired. Please log in again.';
  if (error.status === 403) return "You don't have access to this.";
  if (error.status === 404) return 'We couldn’t find what you were looking for.';
  return error.message;
}

/** Auth forms: a 4xx carries the backend's own user-facing text ("invalid
    credentials"), which beats any generic wording — but 0/5xx has nothing
    readable, and mapping a login 401 to "session expired" would be a lie. */
export const formErrorMessage = (error: unknown): string =>
  error instanceof ApiError && error.status >= 400 && error.status < 500
    ? error.message
    : errorMessage(error);

export default function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-error/40 bg-error-subtle p-4 text-error-fg">
      <p className="text-sm">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Retry
        </Button>
      )}
    </div>
  );
}

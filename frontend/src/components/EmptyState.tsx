import type { ReactNode } from 'react';
import Card from './ui/Card';

/** For legitimately empty results — never for failures, which get ErrorState. */
export default function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <p className="font-medium text-fg">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

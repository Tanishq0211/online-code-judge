import { cn } from './cn';

/** Neutral loading placeholder shaped by className (h-/w-/rounded-).
    Decorative by design: it is aria-hidden, so the parent pairs it with a
    role="status" region and an sr-only label — screen readers hear one short
    announcement, not a tree of meaningless blocks. */
export default function Skeleton({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block animate-pulse rounded bg-border', className)}
      {...rest}
    />
  );
}

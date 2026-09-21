import { cn } from './cn';

/** "Verdict" brand mark: a shell-prompt glyph (›_) in a dark rounded square. */
export default function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-fg" />
        <path
          d="M11 11l5 5-5 5"
          fill="none"
          className="stroke-accent"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M17.5 21h5" fill="none" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {/* Wordmark hidden below sm — the nav bar needs the mark alone to fit 320px. */}
      {showWordmark && <span className="hidden text-lg font-semibold tracking-tight text-fg sm:inline">Verdict</span>}
    </span>
  );
}

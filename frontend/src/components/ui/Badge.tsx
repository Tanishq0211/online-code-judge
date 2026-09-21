import { cn } from './cn';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'border bg-bg text-fg-secondary',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-subtle text-success-fg',
  warning: 'bg-warning-subtle text-warning-fg',
  error: 'bg-error-subtle text-error-fg',
  info: 'bg-info-subtle text-info-fg',
};

export default function Badge({
  tone = 'neutral',
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  );
}

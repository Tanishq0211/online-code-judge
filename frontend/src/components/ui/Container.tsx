import { cn } from './cn';

type Size = 'narrow' | 'prose' | 'default';

const widths: Record<Size, string> = {
  narrow: 'max-w-md',
  prose: 'max-w-3xl',
  default: 'max-w-5xl',
};

export default function Container({
  size = 'default',
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { size?: Size }) {
  return <div className={cn('mx-auto w-full px-4 sm:px-6', widths[size], className)} {...rest} />;
}

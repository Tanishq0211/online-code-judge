import { cn } from './cn';

export default function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-surface shadow-sm', className)} {...rest} />;
}

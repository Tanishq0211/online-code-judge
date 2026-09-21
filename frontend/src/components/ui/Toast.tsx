import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };
type Push = (message: string, tone?: ToastTone) => void;

/* Default is a no-op: notifications are non-essential, so a subtree rendered
   without the provider (tests, isolated components) must still work. */
const ToastCtx = createContext<Push>(() => {});
export const useToast = () => useContext(ToastCtx);

const tones: Record<ToastTone, string> = {
  success: 'border-success/40 bg-success-subtle text-success-fg',
  error: 'border-error/40 bg-error-subtle text-error-fg',
  warning: 'border-warning/40 bg-warning-subtle text-warning-fg',
  info: 'border-info/40 bg-info-subtle text-info-fg',
};

const LIFETIME_MS = 4500;
let nextId = 1;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), LIFETIME_MS);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3 shadow-md', tones[toast.tone])}>
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 cursor-pointer rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback<Push>((message, tone = 'info') => {
    setToasts((ts) => [...ts, { id: nextId++, message, tone }]);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

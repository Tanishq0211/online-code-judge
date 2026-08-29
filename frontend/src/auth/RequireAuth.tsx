import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

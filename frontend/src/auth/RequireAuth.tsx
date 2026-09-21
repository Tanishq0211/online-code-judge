import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Container from '../components/ui/Container';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Container className="py-8"><p className="text-fg-muted">Loading…</p></Container>;
  if (!user) return <Navigate to={`/login?from=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

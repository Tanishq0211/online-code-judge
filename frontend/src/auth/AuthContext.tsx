import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../lib/api';
import { setAccessToken, setOnAuthFailure } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from './tokenStore';
import type { User, AuthResponse } from '../lib/types';

interface Ctx {
  user: User | null; ready: boolean;
  login(u: string, p: string): Promise<void>;
  register(u: string, e: string, p: string): Promise<void>;
  logout(): void;
}
const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const toast = useToast();
  /* A stale token rejected during boot is not an expiring session — the user
     never had one this visit, so it must not raise a notice. */
  const booted = useRef(false);

  function apply(res: AuthResponse) {
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
  }
  function clear() {
    clearRefreshToken(); setAccessToken(null); setUser(null);
  }
  function logout() {
    clear();
    toast('You’ve been signed out.', 'info');
  }
  useEffect(() => {
    // Refresh genuinely failed: RequireAuth redirects, this says why.
    setOnAuthFailure(() => {
      clear();
      if (booted.current) toast('Your session expired. Please log in again.', 'warning');
    });
  }, [toast]);
  useEffect(() => {
    (async () => {
      if (getRefreshToken()) {
        try { const { user } = await api.getMe(); setUser(user); } // apiFetch auto-refreshes on 401
        catch { clear(); }
      }
      booted.current = true;
      setReady(true);
    })();
  }, []);

  const login = async (u: string, p: string) => apply(await api.login(u, p));
  const register = async (u: string, e: string, p: string) => apply(await api.register(u, e, p));
  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>;
}

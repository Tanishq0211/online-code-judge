import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../lib/api';
import { setAccessToken, setOnAuthFailure } from '../lib/api';
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

  function apply(res: AuthResponse) {
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    setUser(res.user);
  }
  function logout() {
    clearRefreshToken(); setAccessToken(null); setUser(null);
  }
  useEffect(() => { setOnAuthFailure(logout); }, []);
  useEffect(() => {
    (async () => {
      if (getRefreshToken()) {
        try { const { user } = await api.getMe(); setUser(user); } // apiFetch auto-refreshes on 401
        catch { logout(); }
      }
      setReady(true);
    })();
  }, []);

  const login = async (u: string, p: string) => apply(await api.login(u, p));
  const register = async (u: string, e: string, p: string) => apply(await api.register(u, e, p));
  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>;
}

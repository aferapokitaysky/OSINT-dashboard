'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, AuthTokens } from '@/lib/api';

type Session = { email?: string; role?: string; name?: string };
type AuthContextValue = { session: Session | null; ready: boolean; signIn(tokens: AuthTokens): void; signOut(): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(token: string): Session | null {
  try { const payload = token.split('.')[1]; if (!payload) return null; const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string; role?: string; name?: string; exp?: number }; if (decoded.exp && decoded.exp * 1000 < Date.now()) return null; return decoded; } catch { return null; }
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside Providers'); return value; }

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }));
  const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { const token = localStorage.getItem('osint.access-token'); setSession(token ? readSession(token) : null); if (token && !readSession(token)) localStorage.removeItem('osint.access-token'); const endSession = () => { setSession(null); client.clear(); }; window.addEventListener('osint:session-ended', endSession); setReady(true); return () => window.removeEventListener('osint:session-ended', endSession); }, [client]);
  const auth = useMemo<AuthContextValue>(() => ({ session, ready, signIn(tokens) { localStorage.setItem('osint.access-token', tokens.accessToken); localStorage.setItem('osint.refresh-token', tokens.refreshToken); setSession(readSession(tokens.accessToken)); }, async signOut() { const refresh = localStorage.getItem('osint.refresh-token'); try { if (refresh) await api.logout(refresh); } finally { localStorage.removeItem('osint.access-token'); localStorage.removeItem('osint.refresh-token'); setSession(null); client.clear(); } } }), [client, ready, session]);
  return <QueryClientProvider client={client}><AuthContext.Provider value={auth}>{children}</AuthContext.Provider></QueryClientProvider>;
}

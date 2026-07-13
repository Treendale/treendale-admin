import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminUser { _id: string; role: string; firstName: string; lastName: string; email: string; }
interface AdminAuthCtx { user: AdminUser | null; isLoading: boolean; login: (u: AdminUser, token: string) => void; logout: () => void; }

const Ctx = createContext<AdminAuthCtx | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('adminUser') ?? 'null')); }
    catch { setUser(null); }
    setIsLoading(false);
  }, []);

  function login(u: AdminUser, token: string) {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, isLoading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth must be inside AdminAuthProvider');
  return ctx;
}

/** Format AUD price for display */
export function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

/** Format UTC ISO to AWST display */
export function formatAWST(isoUtc: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Perth',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    ...opts,
  }).format(new Date(isoUtc));
}

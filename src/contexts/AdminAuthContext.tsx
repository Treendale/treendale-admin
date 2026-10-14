import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminUser { _id: string; role: string; firstName: string; lastName: string; email: string; }
interface AdminAuthCtx { user: AdminUser | null; isLoading: boolean; login: (u: AdminUser, token: string, refreshToken?: string) => void; logout: () => void; }

const Ctx = createContext<AdminAuthCtx | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('adminUser') ?? 'null')); }
    catch { setUser(null); }
    setIsLoading(false);
  }, []);

  function login(u: AdminUser, token: string, refreshToken?: string) {
    localStorage.setItem('adminToken', token);
    if (refreshToken) {
      localStorage.setItem('adminRefreshToken', refreshToken);
    }
    localStorage.setItem('adminUser', JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
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

export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return 'st';
    case 2:  return 'nd';
    case 3:  return 'rd';
    default: return 'th';
  }
}

/** Format duration in minutes into human-readable hours and minutes (e.g. 1 hour 10 min) */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} min`;
}

/** Format UTC ISO to human-readable form (e.g. 16th Oct 2026, 1:15 pm) without AWST */
export function formatAWST(isoUtc: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!isoUtc) return '';
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return '';

  if (opts) {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Perth',
      ...opts,
    }).format(d);
  }

  try {
    const dayStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', day: 'numeric' });
    const monthStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', month: 'short' });
    const yearStr = d.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-AU', { timeZone: 'Australia/Perth', hour: 'numeric', minute: '2-digit', hour12: true });

    const dayNum = parseInt(dayStr, 10);
    const suffix = getOrdinalSuffix(dayNum);
    const formattedTime = timeStr.toLowerCase().replace(/\s+/g, ' ');

    return `${dayNum}${suffix} ${monthStr} ${yearStr}, ${formattedTime}`;
  } catch {
    return isoUtc;
  }
}

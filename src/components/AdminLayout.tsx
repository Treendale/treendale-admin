import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Inbox, Scissors,
  UserCircle, FileText, Settings, Bell, BarChart2,
  Menu, X, LogOut, Sparkles, User
} from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useQuery } from '@tanstack/react-query';
import { adminNotificationsApi } from '../lib/api';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/appointments',   label: 'Calendar',       icon: Calendar },
  { to: '/inbox',          label: 'Inbox',          icon: Inbox },
  { to: '/services',       label: 'Services',       icon: Scissors },
  { to: '/clients',        label: 'Clients',        icon: UserCircle },
  { to: '/content',        label: 'Website Content',icon: FileText },
  { to: '/settings',       label: 'Settings',       icon: Settings },
  { to: '/notifications',  label: 'Notifications',  icon: Bell },
  { to: '/reports',        label: 'Reports',        icon: BarChart2 },
  { to: '/profile',        label: 'Profile',        icon: User },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => adminNotificationsApi.list(),
    refetchInterval: 30000, // poll every 30s
  });
  const unreadCount = (notifData?.data?.data?.notifications ?? []).filter((n: { readAt: null }) => !n.readAt).length;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const NavItems = () => (
    <nav aria-label="Admin navigation">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const hasUnread = label === 'Notifications' && unreadCount > 0;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group min-h-[44px] relative',
              isActive
                ? 'bg-brand-500/15 text-brand-600 font-semibold border border-brand-500/20'
                : 'text-cocoa/70 hover:text-brand-600 hover:bg-brand-50/70',
            )}
            aria-label={label}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{label}</span>
            {hasUnread && (
              <span className="ml-auto w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-admin-card border-r border-admin-border fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-admin-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-cocoa font-semibold text-sm leading-tight">Treendale</p>
            <p className="text-cocoa/30 text-xs">Admin Panel</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavItems />
        </div>

        <div className="border-t border-admin-border p-4">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 mb-3 p-2 -mx-2 rounded-lg hover:bg-brand-500/10 transition-colors group cursor-pointer"
            title="Open Admin Profile"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-700 font-bold text-sm group-hover:bg-brand-500/30 transition-colors">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-cocoa text-sm font-medium truncate group-hover:text-brand-700 transition-colors">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-cocoa/40 text-xs capitalize flex items-center justify-between">
                <span>{user?.role || 'Admin'}</span>
                <span className="text-[10px] text-brand-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Profile &rarr;</span>
              </p>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start text-xs">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-admin-card border-r border-admin-border flex flex-col lg:hidden transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-admin-border">
          <span className="text-cocoa font-semibold text-sm">Treendale Admin</span>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavItems />
        </div>
        <div className="border-t border-admin-border p-3 space-y-1">
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-500/10 text-xs font-medium text-cocoa transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-700 font-bold flex items-center justify-center">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-brand-600">Admin Profile &amp; Settings &rarr;</p>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="btn-ghost w-full text-xs justify-start">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-admin-bg/80 backdrop-blur border-b border-admin-border h-14 flex items-center px-4 gap-4">
          <button
            className="btn-ghost lg:hidden p-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <NavLink to="/notifications" className="btn-ghost relative p-2" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-500 text-cocoa text-xs flex items-center justify-center font-bold" aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-cocoa/80 hover:text-brand-700 hover:bg-brand-500/10 transition-colors"
            title="Edit Admin Profile &amp; Notification Email"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-700 font-bold text-xs flex items-center justify-center">
              {user?.firstName?.[0] || 'A'}
            </div>
            <span className="text-sm font-medium text-cocoa/80 hidden sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
          </NavLink>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

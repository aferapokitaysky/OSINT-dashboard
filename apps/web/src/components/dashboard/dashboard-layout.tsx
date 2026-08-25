 'use client';

import {
  Search, 
  LayoutDashboard, 
  ShieldAlert, 
  Database, 
  History, 
  Settings, 
  LogOut,
  Bell,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/' },
  { icon: Search, label: 'Intelligence', href: '/intelligence' },
  { icon: ShieldAlert, label: 'Investigations', href: '/investigations' },
  { icon: Database, label: 'Entity Registry', href: '/entities' },
  { icon: History, label: 'Audit Logs', href: '/logs' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { if (ready && !session && pathname !== '/login') router.replace('/login'); }, [pathname, ready, router, session]);
  if (pathname === '/login') return <>{children}</>;
  if (!ready || !session) return <main className="grid min-h-screen place-items-center bg-brand-black text-sm text-brand-gray-200">Securing workspace…</main>;
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <button onClick={() => setMobileOpen(!mobileOpen)} className="fixed right-4 top-4 z-50 rounded-md border border-white/15 bg-brand-deep p-3 lg:hidden" aria-label="Toggle navigation">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>

      {/* Sidebar */}
      <aside className={cn('fixed left-0 top-0 bottom-0 z-40 w-72 border-r border-white/10 bg-[#121a1a] flex flex-col transition-transform lg:w-64', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-300">
            <ShieldAlert className="w-5 h-5 text-[#101717]" />
          </div>
          <span className="title-serif text-2xl">FIELDWORK</span>
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[.17em] text-brand-gray-200">Open-source intelligence desk</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 border-l-2 px-4 py-3 text-sm transition-colors",
                pathname === item.href
                  ? "border-amber-300 bg-amber-300/10 text-white" 
                  : "border-transparent text-brand-gray-100 hover:bg-white/[.04] hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[11px] uppercase tracking-[0.12em]">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="mb-3 truncate px-3 font-mono text-[10px] text-brand-gray-200">{session.email}</p>
          <button onClick={() => { void signOut().then(() => router.replace('/login')); }} className="flex w-full items-center gap-3 px-3 py-3 text-brand-gray-100 hover:bg-white/5 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-[0.15em]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Close navigation" />}
      <main className="min-h-screen p-4 pt-20 lg:ml-64 lg:p-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="eyebrow">Workspace / Intelligence</p>
            <p className="mt-1 text-sm text-brand-gray-100">
              System status <span className="ml-1 text-emerald-300">Operational</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 border border-white/10 bg-white/[.03] px-3 py-2">
              <div className="h-2 w-2 bg-emerald-300" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-brand-gray-100">Live feed</span>
            </div>
            
            <button className="border border-white/10 p-2.5 hover:bg-white/5 transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[.03]" title={session.email}>
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        </header>

        <div>
          {children}
        </div>
      </main>
    </div>
  );
}

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
import { BackgroundOrbs } from '@/components/ui/design/background-orbs';
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
    <div className="min-h-screen bg-brand-black text-brand-white relative grain">
      <BackgroundOrbs />
      <button onClick={() => setMobileOpen(!mobileOpen)} className="fixed right-5 top-5 z-50 rounded-xl border border-white/10 bg-brand-deep/90 p-3 lg:hidden" aria-label="Toggle navigation">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>

      {/* Sidebar */}
      <aside className={cn('fixed left-4 top-4 bottom-4 z-40 w-72 glass-panel flex flex-col transition-transform lg:left-6 lg:top-6 lg:bottom-6 lg:w-64', mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] lg:translate-x-0')}>
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <span className="title-serif text-xl tracking-widest uppercase">Osint.io</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                pathname === item.href
                  ? "bg-white/10 text-white border border-white/10 shadow-lg" 
                  : "text-brand-gray-200 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[11px] uppercase tracking-[0.15em]">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button onClick={() => { void signOut().then(() => router.replace('/login')); }} className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-brand-gray-200 hover:bg-white/5 hover:text-white transition-all duration-300">
            <LogOut className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-[0.15em]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Close navigation" />}
      <main className="lg:pl-[300px] p-5 pt-20 lg:p-6 min-h-screen relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 px-4">
          <div>
            <h1 className="title-serif text-3xl mb-1">OSINT Workbench</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gray-300 font-mono">
              System Status: <span className="text-emerald-500 animate-pulse">Operational</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 glass-panel border-white/10 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] uppercase tracking-widest text-brand-gray-200">Live Feed</span>
            </div>
            
            <button className="p-3 glass-panel hover:bg-white/5 transition-all" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 glass-panel flex items-center justify-center hover:border-white/20 transition-all" title={session.email}>
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        </header>

        <div className="px-4">
          {children}
        </div>
      </main>
    </div>
  );
}

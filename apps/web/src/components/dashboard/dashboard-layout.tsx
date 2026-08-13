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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackgroundOrbs } from '@/components/ui/design/background-orbs';
import { CustomCursor } from '@/components/ui/design/custom-cursor';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

  const getPageTitle = () => {
    const item = navItems.find(i => i.href === pathname);
    return item ? `${item.label} Overview` : 'Dossier Overview';
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-white relative grain">
      <BackgroundOrbs />
      <CustomCursor />

      {/* Sidebar */}
      <aside className="fixed left-6 top-6 bottom-6 w-64 glass-panel z-40 hidden lg:flex flex-col">
        <Link href="/" className="p-8 flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <span className="title-serif text-xl tracking-widest uppercase">Osint.io</span>
        </Link>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                  isActive 
                    ? "bg-white/10 text-white border border-white/10 shadow-lg" 
                    : "text-brand-gray-200 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-brand-gray-400 group-hover:text-white")} />
                <span className="text-[11px] uppercase tracking-[0.15em]">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-brand-gray-200 hover:bg-white/5 hover:text-white transition-all duration-300">
            <LogOut className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-[0.15em]">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-[300px] p-6 min-h-screen relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 px-4">
          <div>
            <h1 className="title-serif text-3xl mb-1">{getPageTitle()}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gray-300 font-mono">
              System Status: <span className="text-emerald-500 animate-pulse">Operational</span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass-panel border-white/10 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] uppercase tracking-widest text-brand-gray-200">Live Feed</span>
            </div>
            
            <button className="p-3 glass-panel hover:bg-white/5 transition-all">
              <Bell className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 glass-panel flex items-center justify-center hover:border-white/20 transition-all cursor-none">
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

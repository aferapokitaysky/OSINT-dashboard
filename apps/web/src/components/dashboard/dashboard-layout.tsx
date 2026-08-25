'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, ClipboardList, Command, Database, FileSearch, LogOut, Menu, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers';

const sections = [
  { href: '/', label: 'Desk', code: '01', icon: Command },
  { href: '/intelligence', label: 'Collect', code: '02', icon: FileSearch },
  { href: '/investigations', label: 'Cases', code: '03', icon: ClipboardList },
  { href: '/entities', label: 'Registry', code: '04', icon: Database },
  { href: '/logs', label: 'Audit', code: '05', icon: BookOpen },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { session, ready, signOut } = useAuth(); const [open, setOpen] = useState(false);
  useEffect(() => { if (ready && !session && pathname !== '/login') router.replace('/login'); }, [pathname, ready, router, session]);
  if (pathname === '/login') return <>{children}</>;
  if (!ready || !session) return <main className="grid min-h-screen place-items-center bg-[#101722] font-mono text-xs uppercase tracking-[.18em] text-[#8aa5c6]">Opening secure workspace</main>;
  const active = sections.find(item => item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href))) ?? sections[0];
  const rail = <aside className="flex h-full w-[244px] flex-col border-r border-[#354256] bg-[#131c2a]">
    <Link href="/" className="flex h-[84px] items-center gap-3 border-b border-[#354256] px-6"><span className="grid h-8 w-8 place-items-center bg-[#62adff] font-mono text-xs font-black text-[#101722]">L</span><span className="title-serif text-[27px]">Ledger</span></Link>
    <div className="px-3 py-6"><p className="px-3 font-mono text-[9px] uppercase tracking-[.2em] text-[#6e819e]">Investigation desk</p><nav className="mt-4 space-y-1">{sections.map(item => { const selected = active.href === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn('group flex items-center gap-3 border-l-2 px-3 py-3 transition', selected ? 'border-[#62adff] bg-[#62adff]/10 text-[#f3eddf]' : 'border-transparent text-[#9dacbf] hover:bg-white/[.035] hover:text-[#f3eddf]')}><span className="w-5 font-mono text-[9px] text-[#657997]">{item.code}</span><Icon className="h-4 w-4"/><span className="text-[11px] font-bold uppercase tracking-[.12em]">{item.label}</span></Link>; })}</nav></div>
    <div className="mt-auto border-t border-[#354256] p-3"><Link href="/settings" className={cn('flex items-center gap-3 px-3 py-3 text-[11px] font-bold uppercase tracking-[.12em] transition hover:bg-white/[.035]', pathname === '/settings' ? 'text-[#f3eddf]' : 'text-[#9dacbf]')}><Settings className="h-4 w-4"/>Settings</Link><div className="mt-3 border-t border-[#354256] px-3 pt-4"><p className="truncate font-mono text-[10px] text-[#93a5bd]">{session.email}</p><button onClick={() => { void signOut().then(() => router.replace('/login')); }} className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#8394aa] hover:text-[#f3eddf]"><LogOut className="h-4 w-4"/>Sign out</button></div></div>
  </aside>;
  return <div className="min-h-screen bg-[#101722] text-[#f3eddf]"><div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{rail}</div>{open && <><button aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#07101b]/80 lg:hidden" onClick={() => setOpen(false)}/><div className="fixed inset-y-0 left-0 z-50 lg:hidden">{rail}</div></>}<main className="min-h-screen lg:pl-[244px]"><header className="flex h-[84px] items-center justify-between border-b border-[#354256] px-5 sm:px-8"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#6f86a7]">{active.code} / {active.label}</p><p className="mt-1 text-sm text-[#c9d2df]">Evidence-led investigation workspace</p></div><div className="flex items-center gap-3"><span className="hidden items-center gap-2 border border-[#354256] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#9cafc9] sm:flex"><i className="h-1.5 w-1.5 bg-[#61d6a0]"/>Systems normal</span><button className="grid h-10 w-10 place-items-center border border-[#354256] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5"/></button></div></header><div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">{children}</div></main></div>;
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { api, EntityKind } from '@/lib/api';
import { Badge, EmptyState, QueryError, Skeleton } from '@/components/ui/primitives';

const kinds: EntityKind[] = ['IP', 'DOMAIN', 'URL', 'EMAIL', 'HASH', 'USERNAME', 'PHONE', 'CRYPTO_WALLET', 'ASN', 'PERSON', 'COMPANY', 'SOCIAL_PROFILE'];

export default function EntitiesPage() {
  const [query, setQuery] = useState(''); const [kind, setKind] = useState<EntityKind | 'ALL'>('ALL');
  const entities = useQuery({ queryKey: ['entities'], queryFn: () => api.entities() });
  const items = useMemo(() => (entities.data?.items ?? []).filter(item => (kind === 'ALL' || item.kind === kind) && item.value.toLowerCase().includes(query.toLowerCase())), [entities.data, kind, query]);
  return <div className="mx-auto max-w-7xl animate-fade-up pb-12"><header className="border-b border-white/10 pb-8"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-200">Intelligence registry</p><h1 className="title-serif mt-3 text-5xl">Entities</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-brand-gray-200">Canonical indicators and subjects discovered through authorized investigations. Open a dossier to inspect source-backed facts.</p></header>
    <div className="mt-6 flex flex-col gap-3 lg:flex-row"><label className="glass-panel flex flex-1 items-center gap-3 p-3"><Search className="ml-2 h-4 w-4 text-brand-gray-200"/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Filter by exact value or partial indicator"/></label><div className="glass-panel flex items-center gap-2 overflow-x-auto p-2"><Filter className="ml-2 h-4 w-4 shrink-0 text-brand-gray-200"/><button onClick={() => setKind('ALL')} className={`filter-chip ${kind === 'ALL' ? 'filter-chip-active' : ''}`}>All</button>{kinds.map(item => <button key={item} onClick={() => setKind(item)} className={`filter-chip ${kind === item ? 'filter-chip-active' : ''}`}>{item}</button>)}</div></div>
    {entities.isLoading && <div className="mt-5 grid gap-3 md:grid-cols-2">{[1,2,3,4].map(x => <Skeleton key={x} className="h-32"/>)}</div>}{entities.isError && <div className="mt-5"><QueryError error={entities.error}/></div>}{!entities.isLoading && !entities.isError && !items.length && <div className="mt-5"><EmptyState title={query || kind !== 'ALL' ? 'No entities match these filters' : 'Registry is empty'} description={query || kind !== 'ALL' ? 'Try clearing a filter or use Intelligence to add a new indicator.' : 'Entities appear here after an analyst adds them to an investigation.'}/></div>}
    <div className="mt-5 grid gap-3 md:grid-cols-2">{items.map(item => <Link href={`/entities/${item.id}`} key={item.id} className="glass-panel group p-5 transition hover:border-white/20"><div className="flex items-start justify-between gap-4"><Badge value={item.kind}/><span className="text-xs text-brand-gray-200">Risk <b className="text-white">{item.riskScore.toFixed(1)}</b></span></div><p className="mt-5 truncate font-mono text-base text-white group-hover:text-cyan-100">{item.value}</p><p className="mt-2 text-xs text-brand-gray-200">Last enriched {item.lastEnrichedAt ? new Date(item.lastEnrichedAt).toLocaleString() : 'not yet'}</p></Link>)}</div>
  </div>;
}

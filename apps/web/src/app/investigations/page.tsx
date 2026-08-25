'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Button, EmptyState, QueryError, Skeleton } from '@/components/ui/primitives';

export default function InvestigationsPage() {
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const list = useQuery({ queryKey: ['investigations'], queryFn: () => api.investigations() });
  const create = useMutation({
    mutationFn: () => api.createInvestigation({ title, description: description || undefined }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['investigations'] }); setTitle(''); setDescription(''); setCreating(false); },
  });
  const items = (list.data?.items ?? []).filter(x => x.title.toLowerCase().includes(query.toLowerCase()) || x.status.toLowerCase().includes(query.toLowerCase()));
  function submit(event: FormEvent) { event.preventDefault(); if (title.trim()) create.mutate(); }

  return <div className="mx-auto max-w-6xl animate-fade-up pb-12">
    <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end"><div><p className="eyebrow">Case management / register</p><h1 className="title-serif mt-2 text-5xl">Investigations</h1><p className="mt-3 text-sm text-brand-gray-200">Every query, file and finding belongs to an accountable case.</p></div><Button onClick={() => setCreating(!creating)}><FolderPlus className="h-4 w-4" />New investigation</Button></div>
    {creating && <form onSubmit={submit} className="glass-panel mt-8 grid gap-3 p-5 md:grid-cols-[1fr_1fr_auto]"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Case title" className="field" autoFocus required /><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Purpose or working hypothesis (optional)" className="field" /><Button type="submit" loading={create.isPending}>Create case</Button>{create.isError && <p className="text-sm text-red-200 md:col-span-3">{create.error.message}</p>}</form>}
    <label className="glass-panel mt-8 flex items-center gap-3 p-3"><Search className="ml-2 h-4 w-4 text-brand-gray-200"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cases by title or status" className="w-full bg-transparent px-2 py-2 text-sm outline-none" /></label>
    {list.isLoading && <div className="mt-5 space-y-3">{[1,2,3].map(x => <Skeleton key={x} className="h-28" />)}</div>}
    {list.isError && <div className="mt-5"><QueryError error={list.error}/></div>}
    {!list.isLoading && !list.isError && items.length === 0 && <div className="mt-5"><EmptyState title={query ? 'No matching cases' : 'Create your first investigation'} description={query ? 'Try a different title or status.' : 'Start a case before gathering intelligence, so all evidence retains its context.'}/></div>}
    <div className="mt-5 space-y-3">{items.map(item => <Link href={`/investigations/${item.id}`} key={item.id} className="glass-panel flex flex-col gap-4 border-l-2 border-l-transparent p-6 transition hover:border-l-amber-300 hover:bg-black/10 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge value={item.status}/>{item.tags.map(tag => <span key={tag} className="font-mono text-[10px] text-brand-gray-200">#{tag}</span>)}</div><h2 className="title-serif mt-3 truncate text-2xl">{item.title}</h2><p className="mt-1 line-clamp-1 text-sm text-brand-gray-200">{item.description || 'No case description yet.'}</p></div><div className="grid grid-cols-3 gap-5 text-center text-xs text-brand-gray-200"><span><b className="block font-mono text-lg text-white">{item.counts.entities}</b>entities</span><span><b className="block font-mono text-lg text-white">{item.counts.findings}</b>findings</span><span><b className="block font-mono text-lg text-white">{item.counts.alerts}</b>alerts</span></div></Link>)}</div>
  </div>;
}

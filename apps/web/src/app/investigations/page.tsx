'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Calendar, Clock, User, ChevronRight, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:4000/investigations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInvestigations(data);
        } else {
          setInvestigations([]);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setInvestigations([]);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-white opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pt-12 animate-fade-up px-6 pb-24">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h1 className="title-serif text-5xl mb-2">Investigations</h1>
          <p className="text-brand-gray-300">Manage active dossiers and analytical case files.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl hover:opacity-90 transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">New Dossier</span>
        </button>
      </div>

      <div className="glass-panel p-2 mb-8 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl">
          <Search className="w-4 h-4 text-brand-gray-300" />
          <input 
            type="text" 
            placeholder="Filter by title, ID or status..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-brand-gray-300"
          />
        </div>
      </div>

      <div className="space-y-4">
        {Array.isArray(investigations) && investigations.map((inv) => (
          <Link 
            key={inv.id} 
            href={`/investigations/${inv.id}`}
            className="glass-panel p-6 flex items-center gap-8 group hover:border-white/20 transition-all block"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
              <ShieldAlert className={cn(
                "w-6 h-6 mb-1",
                inv.status === 'IN_PROGRESS' ? "text-yellow-500" : "text-emerald-500"
              )} />
              <span className="text-[8px] font-bold uppercase text-brand-gray-300">Active</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-mono text-brand-gray-300 uppercase">{inv.id.split('-')[0]}</span>
                <div className="w-1 h-1 rounded-full bg-brand-gray-300 opacity-30" />
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                  inv.status === 'IN_PROGRESS' ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" : "border-brand-gray-300/30 text-brand-gray-300"
                )}>
                  {inv.status}
                </span>
              </div>
              <h3 className="title-serif text-2xl group-hover:translate-x-1 transition-transform">{inv.title}</h3>
              <p className="text-[10px] text-brand-gray-400 mt-1 line-clamp-1">{inv.description || 'No description provided.'}</p>
            </div>

            <div className="flex items-center gap-12 text-brand-gray-200">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 opacity-50" />
                  <span className="text-[10px] uppercase tracking-wider">{new Date(inv.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 opacity-50" />
                  <span className="text-[10px] uppercase tracking-wider">Updated {new Date(inv.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="p-3 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        ))}

        {investigations.length === 0 && (
          <div className="text-center py-24 glass-panel opacity-40 italic text-sm">
            No investigations found. Create one to start building your graph.
          </div>
        )}
      </div>
    </div>
  );
}

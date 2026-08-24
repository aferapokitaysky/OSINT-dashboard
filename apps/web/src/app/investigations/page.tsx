'use client';

import React from 'react';
import { ShieldAlert, Plus, Clock, User, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const investigations = [
  { 
    id: 'INV-2026-001', 
    title: 'Phishing Campaign: Bank of Nexus', 
    status: 'ACTIVE', 
    priority: 'HIGH',
    updated: '12m ago',
    operator: 'Operator #2027',
    entities: 14
  },
  { 
    id: 'INV-2026-002', 
    title: 'Suspicious Domain: crypto-verify.sh', 
    status: 'PENDING', 
    priority: 'MEDIUM',
    updated: '2h ago',
    operator: 'System',
    entities: 5
  },
  { 
    id: 'INV-2026-003', 
    title: 'IP Block Analysis: Subnet 192.168.x.x', 
    status: 'COMPLETED', 
    priority: 'LOW',
    updated: '1d ago',
    operator: 'Operator #1994',
    entities: 142
  },
];

export default function InvestigationsPage() {
  return (
    <div className="max-w-6xl mx-auto pt-12 animate-fade-up">
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
        {investigations.map((inv) => (
          <div key={inv.id} className="glass-panel p-6 flex items-center gap-8 group hover:border-white/20 transition-all cursor-none">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
              <ShieldAlert className={cn(
                "w-6 h-6 mb-1",
                inv.priority === 'HIGH' ? "text-red-500" : inv.priority === 'MEDIUM' ? "text-yellow-500" : "text-brand-gray-200"
              )} />
              <span className="text-[8px] font-bold uppercase text-brand-gray-300">{inv.priority}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-mono text-brand-gray-300">{inv.id}</span>
                <div className="w-1 h-1 rounded-full bg-brand-gray-300 opacity-30" />
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                  inv.status === 'ACTIVE' ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-brand-gray-300/30 text-brand-gray-300"
                )}>
                  {inv.status}
                </span>
              </div>
              <h3 className="title-serif text-2xl group-hover:translate-x-1 transition-transform">{inv.title}</h3>
            </div>

            <div className="flex items-center gap-12 text-brand-gray-200">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 opacity-50" />
                  <span className="text-[10px] uppercase tracking-wider">{inv.operator}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 opacity-50" />
                  <span className="text-[10px] uppercase tracking-wider">{inv.updated}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-medium">{inv.entities}</div>
                <div className="text-[9px] uppercase tracking-widest text-brand-gray-300">Entities</div>
              </div>

              <div className="p-3 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

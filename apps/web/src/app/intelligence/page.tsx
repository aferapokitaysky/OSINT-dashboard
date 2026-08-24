'use client';

import React, { useState } from 'react';
import { Search, Shield, Globe, Mail, Hash, User, Wallet, Activity, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const entityTypes = [
  { id: 'ip', label: 'IP Address', icon: Globe, placeholder: '8.8.8.8' },
  { id: 'domain', label: 'Domain', icon: Zap, placeholder: 'google.com' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'target@example.com' },
  { id: 'hash', label: 'Hash', icon: Hash, placeholder: 'sha256...' },
  { id: 'username', label: 'Username', icon: User, placeholder: 'handle_name' },
  { id: 'crypto', label: 'Crypto Wallet', icon: Wallet, placeholder: '0x...' },
];

export default function IntelligencePage() {
  const [selectedType, setSelectedType] = useState('ip');
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-6xl mx-auto pt-12 animate-fade-up">
      {/* Header Area */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel border-white/10 rounded-full mb-6">
          <Shield className="w-4 h-4 text-brand-gray-200" />
          <span className="text-[10px] uppercase tracking-widest text-brand-gray-200">Enrichment Pipeline v2.4</span>
        </div>
        <h1 className="title-serif text-6xl mb-4">Entity Intelligence</h1>
        <p className="text-brand-gray-300 max-w-xl mx-auto">
          Deep enrichment across 15+ providers. Enter any entity below to start real-time intelligence gathering.
        </p>
      </div>

      {/* Search Console */}
      <div className="glass-panel p-2 mb-12">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Type Selector */}
          <div className="flex flex-wrap md:flex-nowrap gap-1 p-1 bg-white/5 rounded-[22px]">
            {entityTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 group",
                  selectedType === type.id 
                    ? "bg-white text-black shadow-lg" 
                    : "text-brand-gray-200 hover:bg-white/5 hover:text-white"
                )}
              >
                <type.icon className={cn("w-3.5 h-3.5", selectedType === type.id ? "text-black" : "text-brand-gray-300 group-hover:text-white")} />
                <span className="text-[10px] uppercase tracking-wider font-bold">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex-1 relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Enter ${entityTypes.find(t => t.id === selectedType)?.label}...`}
              className="w-full h-full bg-white/5 border border-white/5 rounded-[22px] px-6 py-4 text-sm font-mono placeholder:text-brand-gray-300 focus:outline-none focus:border-white/20 transition-all"
            />
            <button className="absolute right-2 top-2 bottom-2 px-6 bg-white text-black rounded-[18px] flex items-center gap-2 hover:opacity-90 transition-all group active:scale-95">
              <Search className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Investigate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-8 group hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-brand-gray-200" />
          </div>
          <h3 className="title-serif text-xl mb-3">Live Enrichment</h3>
          <p className="text-xs text-brand-gray-300 leading-relaxed">
            Every query triggers a background worker pipeline that hits Shodan, VirusTotal, AbuseIPDB and other providers in parallel.
          </p>
        </div>

        <div className="glass-panel p-8 group hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-brand-gray-200" />
          </div>
          <h3 className="title-serif text-xl mb-3">Graph Correlation</h3>
          <p className="text-xs text-brand-gray-300 leading-relaxed">
            Entities are automatically linked. Discovering an IP might reveal its related domains, subnets, and registrar info instantly.
          </p>
        </div>

        <div className="glass-panel p-8 group hover:border-white/20 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Info className="w-6 h-6 text-brand-gray-200" />
          </div>
          <h3 className="title-serif text-xl mb-3">Audit-Ready</h3>
          <p className="text-xs text-brand-gray-300 leading-relaxed">
            Every search is logged in the permanent audit trail with the operator&apos;s ID, ensuring chain of custody for all gathered data.
          </p>
        </div>
      </div>
    </div>
  );
}

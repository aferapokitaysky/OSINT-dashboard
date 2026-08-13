'use client';

import React, { useState, useEffect } from 'react';
import { Search, Shield, Globe, Mail, Hash, User, Wallet, Activity, Zap, Info, Loader2, CheckCircle2, AlertTriangle, Database, Phone, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const entityTypes = [
  { id: 'IP', label: 'IP Address', icon: Globe, placeholder: '8.8.8.8' },
  { id: 'DOMAIN', label: 'Domain', icon: Zap, placeholder: 'google.com' },
  { id: 'EMAIL', label: 'Email', icon: Mail, placeholder: 'target@example.com' },
  { id: 'PHONE', label: 'Phone Number', icon: Phone, placeholder: '+15550000000' },
  { id: 'TELEGRAM', label: 'Telegram', icon: Send, placeholder: '@username or ID' },
  { id: 'DISCORD', label: 'Discord', icon: MessageSquare, placeholder: 'Snowflake ID' },
  { id: 'HASH', label: 'Hash', icon: Hash, placeholder: 'sha256...' },
  { id: 'USERNAME', label: 'Username', icon: User, placeholder: 'handle_name' },
];

export default function IntelligencePage() {
  const [selectedType, setSelectedType] = useState('IP');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
    fetchInvestigations();
  }, []);

  const fetchInvestigations = async () => {
    const t = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:4000/investigations', {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setInvestigations(data);
      }
    } catch (e) {}
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 50));
  };

  const handleSearch = async () => {
    if (!query) return;
    setIsLoading(true);
    setResults([]);
    setLogs([]);
    addLog(`Initializing enrichment for ${selectedType}: ${query}`, 'info');
    
    try {
      const doRequest = async (currentToken: string | null) => {
        return fetch('http://localhost:4000/enrichment/quick', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify({ 
            type: selectedType, 
            value: query,
            investigationId: selectedInvestigation || undefined 
          }),
        });
      };

      let response = await doRequest(token);

      if (response.status === 401) {
        const authRes = await fetch('http://localhost:4000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@osint.io', password: 'admin123' })
        });
        
        if (authRes.ok) {
          const authData = await authRes.json();
          localStorage.setItem('token', authData.accessToken);
          setToken(authData.accessToken);
          response = await doRequest(authData.accessToken);
        }
      }

      const data = await response.json();
      pollStatus(data.jobId);
    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
      setIsLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const t = localStorage.getItem('token');
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:4000/enrichment/job/${id}`, {
          headers: { 'Authorization': `Bearer ${t}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
            setIsLoading(false);
            if (data.status === 'completed') {
              setResults(data.results || []);
              addLog('Enrichment finished', 'success');
            } else {
              addLog(`Failed: ${data.error}`, 'error');
            }
          }
        }
      } catch (e) {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 2000);
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-white/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto pt-20 px-6 pb-32 relative z-10">
        {/* Header Area */}
        <div className="flex flex-col items-center text-center mb-20">
          <div className="inline-flex items-center gap-3 px-5 py-2 glass-panel border-white/5 rounded-full mb-8 hover:border-white/20 transition-colors cursor-default">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-brand-gray-300 font-mono">Neural Pipeline: Operational</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-light tracking-tighter mb-6 title-serif">
            Entity <span className="italic opacity-50">Intelligence</span>
          </h1>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent mb-8" />
          <p className="text-brand-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
            Harness the power of autonomous discovery. Enter any digital footprint to initiate high-fidelity enrichment.
          </p>
        </div>

        {/* Search Console Grid Layout */}
        <div className="max-w-5xl mx-auto space-y-10 mb-24">
          {/* Type Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {entityTypes.map((type) => {
              const Icon = type.icon;
              const active = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border transition-all duration-500 group overflow-hidden",
                    active 
                      ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.15)] -translate-y-1" 
                      : "glass-panel border-white/5 hover:border-white/20 text-brand-gray-400 hover:-translate-y-1"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-500",
                    active ? "scale-110 drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]" : "group-hover:scale-110"
                  )} />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center leading-none">
                    {type.label.split(' ')[0]}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Input Bar */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/0 via-white/5 to-white/0 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative glass-panel p-3 border-white/10 rounded-[30px] shadow-2xl">
              <div className="flex flex-col lg:flex-row items-stretch gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-4 text-brand-gray-400">
                    <Search className="w-5 h-5 group-focus-within:text-white transition-colors" />
                    <div className="w-px h-6 bg-white/10" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={`Enter ${entityTypes.find(t => t.id === selectedType)?.label}...`}
                    className="w-full bg-transparent py-5 pl-24 pr-10 text-xl font-light tracking-tight focus:outline-none placeholder:text-brand-gray-600"
                  />
                  {isLoading && (
                    <div className="absolute bottom-0 left-24 right-10 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent animate-scan" />
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-[22px] border border-white/5 lg:w-[450px]">
                  <div className="flex-1 flex flex-col px-6 border-r border-white/10">
                    <span className="text-[9px] uppercase font-black tracking-widest text-brand-gray-500 mb-1">Target Workspace</span>
                    <select 
                      value={selectedInvestigation || ''} 
                      onChange={(e) => setSelectedInvestigation(e.target.value)}
                      className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer appearance-none"
                    >
                      <option value="">Global Sandbox</option>
                      {investigations.map(inv => (
                        <option key={inv.id} value={inv.id} className="bg-black">{inv.title}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSearch}
                    disabled={isLoading || !query}
                    className={cn(
                      "h-full px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all duration-500 flex items-center gap-3 active:scale-95",
                      isLoading 
                        ? "bg-white/10 text-white cursor-not-allowed" 
                        : "bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enriching</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Investigate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HUD Elements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Terminal Console */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-8 h-[600px] flex flex-col border-white/5 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-brand-gray-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-gray-300">Live Feed</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                  <span className="text-[8px] uppercase font-bold tracking-widest">Active</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] no-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "group flex items-start gap-4 transition-colors",
                    log.type === 'success' ? "text-emerald-400" : 
                    log.type === 'error' ? "text-red-400" : "text-brand-gray-400 hover:text-white"
                  )}>
                    <span className="opacity-20 shrink-0">{new Date().toLocaleTimeString()}</span>
                    <span className="leading-relaxed">{log.msg}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-brand-gray-600 font-light italic">System idle. Awaiting intelligence parameters...</div>}
              </div>
            </div>
          </div>

          {/* Discovery Output */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-8 min-h-[600px] border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                <Database className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-brand-gray-400" />
                  <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-gray-300">Discovery Engine</h3>
                </div>
                <span className="text-[10px] text-brand-gray-500 font-mono">{results.length} PROVIDERS RESPONDED</span>
              </div>
              
              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {results.map((res, i) => (
                    <div key={i} className="animate-fade-up group/card" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-[1px] flex-1 bg-white/10" />
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-brand-gray-300 group-hover/card:text-white transition-colors">{res.provider}</span>
                        <div className="h-[1px] w-8 bg-white/10" />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 pl-4">
                        {res.findings.map((f: any, fi: number) => (
                          <div key={fi} className="relative glass-panel p-5 border-white/5 hover:border-white/10 transition-all duration-500 group/finding cursor-default overflow-hidden">
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500 group-hover/finding:w-2",
                              f.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                              f.severity === 'HIGH' ? 'bg-orange-500' :
                              f.severity === 'INFO' ? 'bg-blue-500' : 'bg-emerald-500'
                            )} />
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-bold text-white tracking-tight">{f.title}</span>
                              <div className="h-px flex-1 bg-white/5" />
                              <span className="text-[8px] font-black uppercase tracking-tighter opacity-40">{f.severity}</span>
                            </div>
                            <p className="text-[12px] text-brand-gray-400 font-light leading-relaxed group-hover/finding:text-brand-gray-200 transition-colors">{f.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-20 group-hover:opacity-30 transition-opacity">
                  <div className="relative">
                    <Database className="w-20 h-20 mb-6 animate-pulse" />
                    <div className="absolute inset-0 bg-white blur-3xl opacity-10" />
                  </div>
                  <p className="text-sm font-light uppercase tracking-[0.6em]">Neural Scan Ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

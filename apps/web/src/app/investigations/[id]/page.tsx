'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OsintGraph } from '@/components/dashboard/graph/osint-graph';
import { Shield, Activity, Database, Info, Loader2, ArrowLeft, Maximize2, Share2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function InvestigationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [investigation, setInvestigation] = useState<any>(null);
  const [graphData, setGraphData] = useState<{elements: any[]}>({ elements: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;

    const fetchData = async () => {
      try {
        const [invRes, graphRes] = await Promise.all([
          fetch(`http://localhost:4000/investigations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:4000/investigations/${id}/graph`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (invRes.ok && graphRes.ok) {
          setInvestigation(await invRes.json());
          setGraphData(await graphRes.json());
        }
      } catch (e) {
        console.error('Failed to load investigation data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-white opacity-20" />
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-serif mb-4">Investigation Not Found</h2>
        <Link href="/investigations" className="text-brand-gray-300 hover:text-white underline text-sm">Return to Listing</Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-up">
      {/* HUD Header */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-6">
          <Link href="/investigations" className="p-3 glass-panel rounded-2xl hover:bg-white/5 transition-all group">
            <ArrowLeft className="w-4 h-4 text-brand-gray-300 group-hover:text-white" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-mono text-brand-gray-400 uppercase tracking-widest">{id.split('-')[0]}</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{investigation.status}</span>
            </div>
            <h1 className="title-serif text-3xl">{investigation.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 glass-panel rounded-xl hover:bg-white/5 transition-all text-brand-gray-200">
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Export</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl hover:opacity-90 transition-all font-bold">
            <Save className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest">Commit State</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 relative glass-panel overflow-hidden">
          <OsintGraph 
            elements={graphData.elements} 
            onNodeClick={(nodeId) => setSelectedNode(nodeId)}
          />
          
          {/* Legend HUD */}
          <div className="absolute bottom-6 left-6 z-20 flex gap-6 p-4 glass-panel bg-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[8px] uppercase font-bold text-brand-gray-200 tracking-widest">Network Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="text-[8px] uppercase font-bold text-brand-gray-200 tracking-widest">Asset Domain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <span className="text-[8px] uppercase font-bold text-brand-gray-200 tracking-widest">Metadata</span>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 flex flex-col gap-6">
          <div className="glass-panel p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-gray-200">Node Analysis</h3>
              <Info className="w-3 h-3 text-brand-gray-400" />
            </div>

            {selectedNode ? (
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-[8px] uppercase text-brand-gray-400 mb-1">UID: {selectedNode}</div>
                  <div className="text-xl font-medium break-all mb-2">
                    {graphData.elements.find(e => e.data.id === selectedNode)?.data.label}
                  </div>
                  <div className="inline-block px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold uppercase">
                    {graphData.elements.find(e => e.data.id === selectedNode)?.data.kind}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-brand-gray-400">Contextual Data</div>
                  <div className="p-3 glass-panel text-[10px] text-brand-gray-300 italic">
                    Fetching intelligence for node {selectedNode.split('-')[0]}...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                <Activity className="w-10 h-10 mb-4" />
                <p className="text-[10px] uppercase tracking-[0.2em]">Select a node to inspect relations</p>
              </div>
            )}
          </div>

          <div className="glass-panel p-6 h-48">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-gray-200 mb-4">Correlation Feed</h3>
            <div className="space-y-3">
              <div className="flex gap-3 text-[9px]">
                <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />
                <div className="text-brand-gray-300">New relation discovered: IP -> ASN</div>
              </div>
              <div className="flex gap-3 text-[9px]">
                <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />
                <div className="text-brand-gray-300">Geospatial link validated: Kremenchug, UA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

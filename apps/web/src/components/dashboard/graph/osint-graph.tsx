'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Download, Maximize2 } from 'lucide-react';

interface OsintGraphProps {
  elements: cytoscape.ElementDefinition[];
  onNodeClick?: (id: string) => void;
}

export function OsintGraph({ elements, onNodeClick }: OsintGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const nodeClickRef = useRef(onNodeClick);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { nodeClickRef.current = onNodeClick; }, [onNodeClick]);

  useEffect(() => {
    let isMounted = true;

    // Small delay to ensure container is fully rendered and stable
    const timer = setTimeout(() => {
      if (!containerRef.current || !isMounted) return;

      try {
        // Destroy existing instance if any
        if (cyRef.current) {
          cyRef.current.destroy();
          cyRef.current = null;
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: [],
          boxSelectionEnabled: false,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#1d2927',
                'label': 'data(label)',
                'color': '#d9e1d9',
                'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
                'font-size': '8px',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'width': '24px',
                'height': '24px',
                'border-width': 1,
                'border-color': '#6f817c',
                'overlay-opacity': 0,
                'text-background-opacity': 0.8,
                'text-background-color': '#111918',
                'text-background-shape': 'roundrectangle',
                'text-background-padding': '2px',
              }
            },
            {
              selector: 'node[kind="IP"]',
              style: {
                'border-color': '#f07060',
                'background-color': '#2b1918',
              }
            },
            {
              selector: 'node[kind="DOMAIN"]',
              style: {
                'border-color': '#e7b84b',
                'background-color': '#302919',
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 1,
                'line-color': '#53645f',
                'target-arrow-color': '#53645f',
                'target-arrow-shape': 'vee',
                'arrow-scale': 0.8,
                'curve-style': 'taxi',
                'taxi-direction': 'vertical',
                'label': 'data(relation)',
                'font-size': '6px',
                'color': '#96a7a1',
                'text-rotation': 'autorotate',
                'text-background-opacity': 1,
                'text-background-color': '#111918',
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 2,
                'border-color': '#f5c655',
                'width': '30px',
                'height': '30px',
                'font-size': '10px',
                'color': '#fff',
              }
            }
          ],
          layout: {
            name: 'cose',
            animate: false, // Disable initial animation to avoid renderer issues
            padding: 40,
          }
        });

        cy.on('tap', 'node', (evt) => {
          nodeClickRef.current?.(evt.target.id());
        });

        cyRef.current = cy;
        setIsReady(true);
      } catch (err) {
        console.error('Cytoscape init error:', err);
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (cyRef.current) {
        const cy = cyRef.current;
        cy.stop();
        cy.destroy();
        cyRef.current = null;
      }
    };
  }, []); // Only once

  useEffect(() => {
    if (!cyRef.current || !isReady) return;
    const cy = cyRef.current;
    
    // Safely update elements
    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    const layout = cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 500,
      padding: 40,
    });
    
    try {
      layout.run();
    } catch {
      // Ignore layout errors during rapid updates
    }
  }, [elements, isReady]);

  function fitGraph() {
    cyRef.current?.fit(undefined, 56);
  }

  function downloadPng() {
    const cy = cyRef.current;
    if (!cy) return;
    const image = cy.png({ full: true, scale: 2, bg: '#111918', output: 'blob' });
    if (!(image instanceof Blob)) return;
    const url = URL.createObjectURL(image);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'case-relationship-graph.png';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="field-panel w-full h-full relative overflow-hidden">
      <div className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#162020]/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="eyebrow">Relationship map</span>
          <span className="font-mono text-[10px] text-brand-gray-200">{elements.filter(item => 'source' in item.data === false).length} entities · {elements.filter(item => 'source' in item.data).length} links</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fitGraph} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-gray-100 transition hover:border-amber-300 hover:text-amber-200"><Maximize2 className="h-3.5 w-3.5"/>Fit view</button>
          <button type="button" onClick={downloadPng} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-gray-100 transition hover:border-amber-300 hover:text-amber-200"><Download className="h-3.5 w-3.5"/>PNG</button>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="w-full h-full opacity-0 transition-opacity duration-300"
        style={{ opacity: isReady ? 1 : 0 }}
      />
      <div className="absolute bottom-3 left-4 z-20 flex items-center gap-4 border border-white/10 bg-[#111918]/90 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-brand-gray-200">
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#e7b84b]"/>Domain</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#f07060]"/>IP</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#1d2927] ring-1 ring-[#6f817c]"/>Other</span>
      </div>
    </div>
  );
}

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
                'background-color': '#17253a',
                'label': 'data(label)',
                'color': '#dce8f7',
                'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
                'font-size': '8px',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'width': '24px',
                'height': '24px',
                'border-width': 1,
                'border-color': '#617797',
                'overlay-opacity': 0,
                'text-background-opacity': 0.8,
                'text-background-color': '#101722',
                'text-background-shape': 'roundrectangle',
                'text-background-padding': '2px',
              }
            },
            {
              selector: 'node[kind="IP"]',
              style: {
                'border-color': '#ef8074',
                'background-color': '#321e25',
              }
            },
            {
              selector: 'node[kind="DOMAIN"]',
              style: {
                'border-color': '#62adff',
                'background-color': '#172b48',
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 1,
                'line-color': '#526a8c',
                'target-arrow-color': '#526a8c',
                'target-arrow-shape': 'vee',
                'arrow-scale': 0.8,
                'curve-style': 'taxi',
                'taxi-direction': 'vertical',
                'label': 'data(relation)',
                'font-size': '6px',
                'color': '#a8bbd3',
                'text-rotation': 'autorotate',
                'text-background-opacity': 1,
                'text-background-color': '#101722',
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 2,
                'border-color': '#8bc4ff',
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
    const image = cy.png({ full: true, scale: 2, bg: '#101722', output: 'blob' });
    if (!(image instanceof Blob)) return;
    const url = URL.createObjectURL(image);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'case-relationship-graph.png';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative h-full w-full overflow-hidden border border-[#354256] bg-[#101722]">
      <div className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#354256] bg-[#131c2a]/95 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="eyebrow">Relationship map / live layout</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#8195b1]">{elements.filter(item => 'source' in item.data === false).length} entities · {elements.filter(item => 'source' in item.data).length} links</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fitGraph} className="inline-flex items-center gap-2 border border-[#42526a] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#c5d4e7] hover:border-[#62adff]"><Maximize2 className="h-3.5 w-3.5"/>Fit</button>
          <button type="button" onClick={downloadPng} className="inline-flex items-center gap-2 border border-[#42526a] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#c5d4e7] hover:border-[#62adff]"><Download className="h-3.5 w-3.5"/>Export PNG</button>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="w-full h-full opacity-0 transition-opacity duration-300"
        style={{ opacity: isReady ? 1 : 0 }}
      />
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 border border-[#354256] bg-[#131c2a]/95 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#a5b5c9]">
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#62adff]"/>Domain</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#ef8074]"/>IP</span>
        <span><i className="mr-1.5 inline-block h-2 w-2 bg-[#17253a] ring-1 ring-[#617797]"/>Other</span>
      </div>
    </div>
  );
}

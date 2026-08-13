'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

interface OsintGraphProps {
  elements: cytoscape.ElementDefinition[];
  onNodeClick?: (id: string) => void;
}

export function OsintGraph({ elements, onNodeClick }: OsintGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isReady, setIsReady] = useState(false);

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
          elements: elements,
          boxSelectionEnabled: false,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#000',
                'label': 'data(label)',
                'color': '#888',
                'font-family': 'DM Mono, monospace',
                'font-size': '8px',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'width': '24px',
                'height': '24px',
                'border-width': 1,
                'border-color': 'rgba(255,255,255,0.15)',
                'overlay-opacity': 0,
                'text-background-opacity': 0.8,
                'text-background-color': '#070707',
                'text-background-shape': 'roundrectangle',
                'text-background-padding': '2px',
              }
            },
            {
              selector: 'node[kind="IP"]',
              style: { 
                'border-color': '#ff3e3e', 
                'background-color': '#1a0a0a',
                'shadow-blur': 10,
                'shadow-color': '#ff3e3e',
                'shadow-opacity': 0.2
              }
            },
            {
              selector: 'node[kind="DOMAIN"]',
              style: { 
                'border-color': '#00f2ff', 
                'background-color': '#0a1a1a',
                'shadow-blur': 10,
                'shadow-color': '#00f2ff',
                'shadow-opacity': 0.2
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 1,
                'line-color': 'rgba(255,255,255,0.12)',
                'target-arrow-color': 'rgba(255,255,255,0.12)',
                'target-arrow-shape': 'triangle',
                'arrow-scale': 0.6,
                'curve-style': 'bezier',
                'label': 'data(relation)',
                'font-size': '6px',
                'color': 'rgba(255,255,255,0.4)',
                'text-rotation': 'autorotate',
                'text-background-opacity': 1,
                'text-background-color': '#070707',
                'text-background-padding': '2px',
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': 2,
                'border-color': '#fff',
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
          onNodeClick?.(evt.target.id());
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
    } catch (e) {
      // Ignore layout errors during rapid updates
    }
  }, [elements, isReady]);

  return (
    <div className="w-full h-full relative glass-panel overflow-hidden group">
      {/* HUD Elements */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 m-4 rounded-[20px] z-10" />
      
      <div className="absolute top-8 left-10 z-20 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-white opacity-80">
            Nexus Correlation Engine
          </span>
        </div>
        <div className="text-[8px] font-mono text-brand-gray-300 ml-4 opacity-50 uppercase tracking-widest">
          Active Scan: Recursive Depth 4
        </div>
      </div>

      <div className="absolute bottom-8 right-10 z-20 flex gap-4 text-[8px] font-mono text-brand-gray-300 uppercase tracking-widest opacity-40">
        <div>X: 42.092</div>
        <div>Y: 12.001</div>
        <div>Z: 0.000</div>
      </div>

      {/* The Graph */}
      <div 
        ref={containerRef} 
        className="w-full h-full opacity-0 transition-opacity duration-1000"
        style={{ opacity: isReady ? 1 : 0 }}
      />

      {/* Scanning Line Effect */}
      <div className="absolute inset-x-0 h-[1px] bg-white/5 top-0 animate-scan pointer-events-none z-10" />
    </div>
  );
}

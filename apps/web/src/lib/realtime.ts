'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ProviderStatus } from '@/lib/api';

export interface EnrichmentUpdate {
  jobId: string;
  entityId: string;
  providers?: string[];
  completed?: number;
  total?: number;
  provider?: string;
  status?: ProviderStatus | 'completed' | 'failed';
  resultId?: string;
  findingCount?: number;
  relationCount?: number;
  completedAt?: string;
}

function socketUrl() {
  return process.env.NEXT_PUBLIC_WS_URL ?? (typeof window === 'undefined' ? '' : window.location.origin);
}

export function useEnrichmentUpdates(entityId?: string) {
  const [updates, setUpdates] = useState<EnrichmentUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  useEffect(() => {
    if (!entityId) return;
    const token = localStorage.getItem('osint.access-token');
    if (!token) return;
    const socket: Socket = io(`${socketUrl()}/events`, { path: '/ws', auth: { token }, transports: ['websocket'], reconnectionAttempts: 5, reconnectionDelayMax: 5_000 });
    const append = (event: EnrichmentUpdate) => setUpdates(previous => [...previous, event]);
    socket.on('connect', () => { setConnected(true); setConnectionError(null); setReconnectAttempt(0); socket.emit('subscribe', { entityId }); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (error: Error) => { setConnected(false); setConnectionError(error.message || 'Live feed unavailable'); });
    socket.io.on('reconnect_attempt', attempt => { socket.auth = { token: localStorage.getItem('osint.access-token') ?? '' }; setReconnectAttempt(attempt); });
    socket.on('enrichment.started', append);
    socket.on('enrichment.provider.completed', append);
    socket.on('enrichment.progress', append);
    socket.on('enrichment.completed', append);
    return () => { socket.emit('unsubscribe', { entityId }); socket.disconnect(); };
  }, [entityId]);
  return { updates, connected, connectionError, reconnectAttempt };
}

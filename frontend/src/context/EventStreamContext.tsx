import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

/* ─── Types ─── */
export type EventType = 'intent_created' | 'intent_settled' | 'solver_matched' | 'simulation_complete' | 'cross_chain_detected' | 'sync';

export interface StreamEvent {
    id?: string;
    type: EventType;
    data: any;
    timestamp: number;
}

interface EventStreamContextType {
    isConnected: boolean;
    events: StreamEvent[];
    latestIntent: StreamEvent | null;
    latestSettlement: StreamEvent | null;
    connectionType: 'sse' | 'polling' | 'disconnected';
}

const EventStreamContext = createContext<EventStreamContextType | undefined>(undefined);

const API_BASE = 'https://anomapay-explorer.bidurandblog.workers.dev/api/v3';
const MAX_EVENTS = 100;

/* ─── Provider ─── */
export function EventStreamProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [latestIntent, setLatestIntent] = useState<StreamEvent | null>(null);
    const [latestSettlement, setLatestSettlement] = useState<StreamEvent | null>(null);
    const [connectionType, setConnectionType] = useState<'sse' | 'polling' | 'disconnected'>('disconnected');
    const lastTimestampRef = useRef(0);
    const retryCountRef = useRef(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const pollingRef = useRef<number | null>(null);

    const addEvent = useCallback((evt: StreamEvent) => {
        setEvents(prev => [evt, ...prev].slice(0, MAX_EVENTS));
        if (evt.type === 'intent_created') setLatestIntent(evt);
        if (evt.type === 'intent_settled') setLatestSettlement(evt);
    }, []);

    // SSE Connection
    const connectSSE = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const url = `${API_BASE}/stream/events?since=${lastTimestampRef.current}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            setIsConnected(true);
            setConnectionType('sse');
            retryCountRef.current = 0;
        };

        // Listen for typed events
        const eventTypes: EventType[] = ['intent_created', 'intent_settled', 'solver_matched', 'simulation_complete', 'cross_chain_detected'];

        eventTypes.forEach(type => {
            es.addEventListener(type, (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    addEvent({
                        id: e.lastEventId,
                        type,
                        data,
                        timestamp: data.timestamp || Math.floor(Date.now() / 1000),
                    });
                } catch { /* skip malformed */ }
            });
        });

        // Sync event — update latest timestamp for next reconnect
        es.addEventListener('sync', (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                if (data.latestTimestamp > lastTimestampRef.current) {
                    lastTimestampRef.current = data.latestTimestamp;
                }
            } catch { /* skip */ }
        });

        es.onerror = () => {
            setIsConnected(false);
            es.close();
            retryCountRef.current++;

            // After 5 SSE failures, fall back to polling
            if (retryCountRef.current > 5) {
                setConnectionType('polling');
                startPolling();
            } else {
                // Exponential backoff reconnect
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
                setTimeout(connectSSE, delay);
            }
        };
    }, [addEvent]);

    // Polling fallback
    const startPolling = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        const poll = async () => {
            try {
                const res = await fetch(`${API_BASE}/stream/events?since=${lastTimestampRef.current}&format=json`);
                if (!res.ok) return;
                const data = await res.json() as any;
                setIsConnected(true);

                if (data.events && Array.isArray(data.events)) {
                    data.events.forEach((evt: any) => {
                        addEvent({
                            type: evt.eventType,
                            data: evt.payload,
                            timestamp: evt.createdAt,
                        });
                        if (evt.createdAt > lastTimestampRef.current) {
                            lastTimestampRef.current = evt.createdAt;
                        }
                    });
                }
            } catch {
                setIsConnected(false);
            }
        };

        poll(); // Initial poll
        pollingRef.current = window.setInterval(poll, 5000); // Every 5s
    }, [addEvent]);

    useEffect(() => {
        // Try SSE first
        if (typeof EventSource !== 'undefined') {
            connectSSE();
        } else {
            // Browser doesn't support SSE, use polling
            setConnectionType('polling');
            startPolling();
        }

        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [connectSSE, startPolling]);

    return (
        <EventStreamContext.Provider value={{ isConnected, events, latestIntent, latestSettlement, connectionType }}>
            {children}
        </EventStreamContext.Provider>
    );
}

/* ─── Hook ─── */
export function useEventStream() {
    const context = useContext(EventStreamContext);
    if (context === undefined) {
        throw new Error('useEventStream must be used within an EventStreamProvider');
    }
    return context;
}

/* ─── Backward compat alias ─── */
export function useWebSocket() {
    const { isConnected, latestIntent } = useEventStream();
    return {
        isConnected,
        latestIntent: latestIntent?.data || null,
        latestResource: latestIntent?.data ? { transaction: latestIntent.data } as { transaction: any } : null as { transaction: any } | null,
    };
}

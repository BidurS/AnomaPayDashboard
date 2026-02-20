import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebSocketContextType {
    isConnected: boolean;
    latestIntent: any | null;
    latestResource: any | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [latestIntent, setLatestIntent] = useState<any | null>(null);
    const [latestResource, setLatestResource] = useState<any | null>(null);

    useEffect(() => {
        // In production, point to the deployed WS URL
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WebSocket] Connected to Anoma V2 node');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('[WebSocket] Disconnected');
            setIsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.topic === 'intent_gossiped') {
                    setLatestIntent(data.payload);
                } else if (data.topic === 'intent_settled') {
                    setLatestResource(data.payload);
                }
            } catch (err) {
                console.error('Failed to parse WS message', err);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ isConnected, latestIntent, latestResource }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

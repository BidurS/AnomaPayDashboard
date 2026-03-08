import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Zap, ArrowRightLeft, Brain, Globe, Link2 } from 'lucide-react';
import { useEventStream, type StreamEvent } from '../context/EventStreamContext';

const EVENT_ICONS: Record<string, any> = {
    intent_created: Zap,
    intent_settled: ArrowRightLeft,
    solver_matched: Link2,
    simulation_complete: Brain,
    cross_chain_detected: Globe,
};

const EVENT_COLORS: Record<string, string> = {
    intent_created: '#4ade80',
    intent_settled: '#60a5fa',
    solver_matched: '#fbbf24',
    simulation_complete: '#a78bfa',
    cross_chain_detected: '#f472b6',
};

export function LiveActivityFeed() {
    const { isConnected, events, connectionType } = useEventStream();
    const [visible, setVisible] = useState<StreamEvent[]>([]);

    useEffect(() => {
        setVisible(events.slice(0, 8));
    }, [events]);

    return (
        <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: 12,
            padding: 20,
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Radio size={16} style={{ color: isConnected ? '#4ade80' : '#666' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Live Activity
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isConnected ? '#4ade80' : '#666',
                        animation: isConnected ? 'pulse 2s infinite' : 'none',
                    }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#666', textTransform: 'uppercase' }}>
                        {connectionType === 'sse' ? 'Stream' : connectionType === 'polling' ? 'Polling' : 'Offline'}
                    </span>
                </div>
            </div>

            {/* Event List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence mode="popLayout">
                    {visible.length === 0 ? (
                        <div style={{
                            padding: '24px 0', textAlign: 'center', color: '#333',
                            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem'
                        }}>
                            Waiting for events…
                        </div>
                    ) : visible.map((evt, i) => {
                        const Icon = EVENT_ICONS[evt.type] || Zap;
                        const color = EVENT_COLORS[evt.type] || '#888';

                        return (
                            <motion.div
                                key={`${evt.type}-${evt.timestamp}-${i}`}
                                layout
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, x: 20, height: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 12px', borderRadius: 6,
                                    background: `${color}08`, borderLeft: `3px solid ${color}`,
                                }}
                            >
                                <Icon size={14} style={{ color, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#ccc',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {evt.data?.message || evt.type.replace(/_/g, ' ')}
                                    </div>
                                </div>
                                <span style={{
                                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: '#444', flexShrink: 0
                                }}>
                                    {evt.data?.chainId === 8453 ? 'BASE' : evt.data?.chainId === 1 ? 'ETH' : `#${evt.data?.chainId || '?'}`}
                                </span>
                                <span style={{
                                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: '#333', flexShrink: 0
                                }}>
                                    {formatTimeAgo(evt.timestamp)}
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Pulse animation CSS */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}

function formatTimeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 5) return 'now';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
}

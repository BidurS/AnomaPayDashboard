import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Zap, Database, Layers, ArrowRight, Anchor } from 'lucide-react'
import { cn } from '../lib/utils'
import { useWebSocket } from '../context/WebSocketContext'
import { useState, useEffect } from 'react'

const DOMAINS = [
    { id: 'eth', name: 'Ethereum', icon: '💎', color: '#627EEA', x: 10, y: 20 },
    { id: 'opt', name: 'Optimism', icon: '🔴', color: '#FF0420', x: 10, y: 50 },
    { id: 'arb', name: 'Arbitrum', icon: '🔵', color: '#28A0F0', x: 10, y: 80 },
    { id: 'sol', name: 'Solana', icon: '☀️', color: '#14F195', x: 10, y: 10 },
    { id: 'anoma', name: 'Anoma P2P', icon: '🛡️', color: '#FF0000', x: 50, y: 50, isHub: true },
    { id: 'base', name: 'Base (Settlement)', icon: '🔵', color: '#0052FF', x: 90, y: 50 },
]

interface FlowEvent {
    id: string
    origin: string
    destination: string
    timestamp: number
}

export function CrossChainTopology() {
    const { latestIntent } = useWebSocket()
    const [liveFlows, setLiveFlows] = useState<FlowEvent[]>([])

    useEffect(() => {
        if (latestIntent && latestIntent.originChain) {
            const newFlow = {
                id: latestIntent.hash,
                origin: latestIntent.originChain,
                destination: latestIntent.destinationChain || 'Anoma',
                timestamp: Date.now()
            }
            setLiveFlows(prev => [newFlow, ...prev].slice(0, 5))
        }
    }, [latestIntent])

    // Simulated flow fallback for showcase
    useEffect(() => {
        if (liveFlows.length > 0 && latestIntent) return; // Use real if available

        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const origins = ['Ethereum', 'Solana', 'Optimism', 'Arbitrum'];
                const mockFlow = {
                    id: '0x' + Math.random().toString(16).slice(2, 10),
                    origin: origins[Math.floor(Math.random() * origins.length)],
                    destination: 'Anoma',
                    timestamp: Date.now()
                }
                setLiveFlows(prev => [mockFlow, ...prev].slice(0, 5))
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [liveFlows.length, latestIntent])

    return (
        <section className="py-24 bg-white dark:bg-black transition-colors duration-300 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-16 bg-black dark:bg-white" />
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                Universal Intent<br />Bridge
                            </h2>
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-2">
                                Tracking Cross-Chain Origin-to-Destination (O-D) Flows
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-black dark:border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Live Links</span>
                            <span className="text-sm font-black text-green-500 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                                {liveFlows.length + 12} Active
                            </span>
                        </div>
                        <div className="p-4 border-2 border-black dark:border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Architecture</span>
                            <span className="text-sm font-black uppercase">O-D Tracker</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Topology Map */}
                    <div className="lg:col-span-3 swiss-card bg-gray-50 dark:bg-zinc-950 border-4 border-black dark:border-white/10 p-0 h-[500px] relative">
                        <div className="absolute inset-0 swiss-grid-bg opacity-30" />
                        
                        <svg className="w-full h-full relative z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Connecting Lines (Intent Flow) */}
                            <defs>
                                <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#666" stopOpacity="0.2" />
                                    <stop offset="50%" stopColor="#FF0000" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#0052FF" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>

                            {/* Origin to Anoma Hub */}
                            {[10, 20, 50, 80].map((y, i) => (
                                <motion.path
                                    key={`line-origin-${i}`}
                                    d={`M 15 ${y} L 45 50`}
                                    stroke="url(#flow-gradient)"
                                    strokeWidth="0.5"
                                    fill="none"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, repeatDelay: 3 }}
                                />
                            ))}

                            {/* Anoma Hub to Base Settlement */}
                            <motion.path
                                d="M 55 50 L 85 50"
                                stroke="#FF0000"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                                fill="none"
                                animate={{ strokeDashoffset: [0, -10] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                            />
                        </svg>

                        {/* Nodes (Domains) */}
                        <div className="absolute inset-0 pointer-events-none">
                            {DOMAINS.map((domain) => (
                                <motion.div
                                    key={domain.id}
                                    className={cn(
                                        "absolute w-20 md:w-28 p-2 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white flex flex-col items-center gap-1 shadow-[4px_4px_0_#000] dark:shadow-none pointer-events-auto cursor-pointer group hover:-translate-y-1 transition-transform",
                                        domain.isHub && "w-28 md:w-36 border-[#FF0000] dark:border-[#FF0000] scale-110 z-20"
                                    )}
                                    style={{ left: `${domain.x}%`, top: `${domain.y}%`, transform: 'translate(-50%, -50%)' }}
                                >
                                    <span className="text-xl">{domain.icon}</span>
                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-center">
                                        {domain.name}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Universal Intent Bridge O-D Tracker Particle */}
                        <motion.div
                            className="absolute w-6 h-6 bg-[#FF0000] rounded-none border-2 border-white z-30 flex items-center justify-center shadow-[0_0_20px_#FF0000]"
                            animate={{ 
                                left: ['10%', '50%', '90%'],
                                top: ['20%', '50%', '50%'],
                                opacity: [0, 1, 1, 0],
                                rotate: [0, 90, 180, 180]
                            }}
                            transition={{ 
                                duration: 5, 
                                repeat: Infinity, 
                                ease: "easeInOut",
                                times: [0, 0.4, 0.8, 1]
                            }}
                        >
                            <Layers className="w-3 h-3 text-white" />
                        </motion.div>
                    </div>

                    {/* Live O-D Feed */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                <Anchor className="w-3 h-3" /> Live O-D Tracker
                            </div>
                            <div className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-[7px] text-yellow-600 font-bold uppercase tracking-widest">
                                Simulation
                            </div>
                        </div>
                        <AnimatePresence mode="popLayout">
                            {liveFlows.map((flow) => (
                                <motion.div
                                    key={flow.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="p-4 border-2 border-black dark:border-white/10 bg-white dark:bg-zinc-900 shadow-[4px_4px_0_#000] dark:shadow-none"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase">{flow.origin}</span>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-[#FF0000]" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase">{flow.destination}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <code className="text-[8px] text-gray-400 truncate max-w-[100px]">{flow.id}</code>
                                        <span className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-black uppercase">Gossip</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {liveFlows.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 text-center text-[10px] uppercase font-bold text-gray-400">
                                Waiting for cross-chain activity...
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex gap-4">
                        <Globe className="w-6 h-6 shrink-0" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Intent Gossip</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Users broadcast intents across various domains. Anoma's P2P layer aggregates these into a global preference graph.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Database className="w-6 h-6 shrink-0" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Heterogeneous Settlement</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Solvers find the most efficient execution path, settling the intent on the domain that provides the best liquidity and privacy.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Zap className="w-6 h-6 shrink-0 text-[#FF0000]" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Taiga Execution</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Zero-knowledge state transitions ensure that only the result is revealed, while the path remains private.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

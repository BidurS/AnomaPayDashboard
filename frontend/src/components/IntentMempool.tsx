import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Shield, Timer, ArrowRight, User, Cpu, Activity, EyeOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { useWebSocket } from '../context/WebSocketContext'
import { useTrust } from '../context/TrustContext'

interface Intent {
    id: string
    user: string
    wants: string
    offers: string
    isShielded: boolean
    timestamp: number
    status: 'GOSSIPING' | 'MATCHING' | 'SOLVED'
    complexity: number
}

export function IntentMempool() {
    const { isConnected, latestIntent } = useWebSocket()
    const { isVisible } = useTrust()
    const [intents, setIntents] = useState<Intent[]>([])
    const [activeMatches, setActiveMatches] = useState<string[]>([])

    // Listen for real WS intents
    useEffect(() => {
        if (latestIntent && latestIntent.hash) {
            const mappedIntent: Intent = {
                id: latestIntent.hash,
                user: latestIntent.sender || '0xUNKNOWN',
                wants: latestIntent.appData?.wants || 'PRIVATE ASSET',
                offers: latestIntent.appData?.amount ? `${latestIntent.appData.amount} UNITS` : 'RESOURCES',
                isShielded: true,
                timestamp: Date.now(),
                status: 'GOSSIPING',
                complexity: 3
            }
            setIntents(prev => {
                if (prev.find(i => i.id === mappedIntent.id)) return prev;
                return [mappedIntent, ...prev.slice(0, 4)]
            })
        }
    }, [latestIntent])

    // Simulated gossip fallback for showcase (if WS is disconnected)
    useEffect(() => {
        if (isConnected) return;

        const interval = setInterval(() => {
            if (Math.random() > 0.6) {
                const mockId = '0x' + Math.random().toString(16).slice(2, 10);
                const newIntent: Intent = {
                    id: mockId,
                    user: '0x' + Math.random().toString(16).slice(2, 10),
                    wants: 'NAM',
                    offers: 'ETH',
                    isShielded: Math.random() > 0.5,
                    timestamp: Date.now(),
                    status: 'GOSSIPING',
                    complexity: Math.floor(Math.random() * 5) + 1
                }
                setIntents(prev => [newIntent, ...prev].slice(0, 5))
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isConnected])

    // Simulate matchmaking
    useEffect(() => {
        const interval = setInterval(() => {
            if (intents.length >= 2) {
                const i1 = 0
                const i2 = 1
                setActiveMatches([intents[i1].id, intents[i2].id])

                setTimeout(() => {
                    setIntents(prev => prev.map(intent =>
                        (intent.id === intents[i1].id || intent.id === intents[i2].id)
                            ? { ...intent, status: 'MATCHING' } : intent
                    ))
                }, 1000)

                setTimeout(() => {
                    setActiveMatches([])
                }, 3000)
            }
        }, 8000)
        return () => clearInterval(interval)
    }, [intents])

    return (
        <section className="py-24 bg-black text-white overflow-hidden relative">
            <div className="absolute inset-0 swiss-grid-bg opacity-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-16 bg-[#FF0000]" />
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                    Intent Mempool
                                </h2>
                                <span className={cn(
                                    "px-2 py-1 text-[10px] font-black uppercase tracking-widest animate-pulse",
                                    isConnected ? "bg-[#00FF00] text-black" : "bg-yellow-500 text-black"
                                )}>
                                    {isConnected ? "Live Stream" : "Simulated Stream"}
                                </span>
                            </div>
                            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                                P2P Gossip Network & Counterparty Discovery Simulation
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-4 py-3 border border-white/10 flex flex-col gap-1 bg-zinc-900/50 backdrop-blur-md">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Listening Peers</span>
                            <span className="text-xl font-black font-mono">1,242</span>
                        </div>
                        <div className="px-4 py-3 border border-white/10 flex flex-col gap-1 bg-zinc-900/50 backdrop-blur-md">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Daemon Link</span>
                            <span className={cn("text-xl font-black font-mono", isConnected ? "text-green-500" : "text-[#FF0000]")}>
                                {isConnected ? "CONNECTED" : "OFFLINE"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {intents.map((intent) => {
                                const visible = isVisible(intent.id)
                                return (
                                    <motion.div
                                        key={intent.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{
                                            opacity: 1,
                                            x: 0,
                                            borderColor: activeMatches.includes(intent.id) ? '#FF0000' : 'rgba(255,255,255,0.1)',
                                            filter: visible ? 'none' : 'grayscale(1) brightness(0.5)'
                                        }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "p-6 border-2 transition-all duration-500 relative group overflow-hidden bg-zinc-900/30 backdrop-blur-xl",
                                            intent.status === 'MATCHING' ? "border-[#FF0000]/50" : "border-white/10"
                                        )}
                                    >
                                        {!visible && (
                                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <EyeOff className="w-6 h-6 text-gray-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Unverified Intent (Out of Trust Radius)</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 flex items-center justify-center border-2",
                                                    intent.isShielded ? "border-purple-500 bg-purple-500/10" : "border-white/20 bg-white/5"
                                                )}>
                                                    {intent.isShielded ? <Shield className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-zinc-400" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-xs font-bold text-zinc-400">{intent.user}</span>
                                                        <span className={cn(
                                                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm",
                                                            intent.status === 'GOSSIPING' ? "bg-zinc-800 text-zinc-400" : "bg-[#FF0000] text-white"
                                                        )}>
                                                            {intent.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-xl font-black uppercase tracking-tighter", intent.isShielded && "blur-[2px] select-none")}>
                                                            {intent.offers}
                                                        </span>
                                                        <ArrowRight className="w-4 h-4 text-[#FF0000]" strokeWidth={3} />
                                                        <span className={cn("text-xl font-black uppercase tracking-tighter text-[#FFCC00]", intent.isShielded && "blur-[2px] select-none")}>
                                                            {intent.wants}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-right">
                                                <div className="hidden md:block">
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Complexity</p>
                                                    <div className="flex gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <div key={i} className={cn("w-3 h-1", i < intent.complexity ? "bg-[#FF0000]" : "bg-zinc-800")} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Timer className="w-4 h-4 text-zinc-600 mb-1 ml-auto" />
                                                    <span className="font-mono text-[10px] text-zinc-500">Exp: 59s</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="swiss-card bg-zinc-900 border-white/10 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Cpu className="w-5 h-5 text-[#FFCC00]" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Active Matchmakers</h3>
                            </div>

                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-white/5 bg-black/20 rounded">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="font-mono text-xs text-zinc-300">Solver_Node_0{i}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-500">POLLING...</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold uppercase text-zinc-500">P2P Heatmap</span>
                                    <Activity className="w-3 h-3 text-[#FF0000]" />
                                </div>
                                <div className="h-24 bg-black/40 relative flex items-end gap-1 px-2 pb-2">
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex-1 bg-[#FF0000]/40"
                                            animate={{ height: `${Math.random() * 80 + 20}%` }}
                                            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: i * 0.05 }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-2 border-dashed border-white/10 rounded-lg">
                            <Share2 className="w-6 h-6 text-zinc-600 mb-4" />
                            <h4 className="text-xs font-bold uppercase mb-2">Intent Gossip Architecture</h4>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                Unlike traditional mempools, Anoma nodes gossip intents off-chain. Solvers compete to bundle these into valid state transitions, minimizing gas and maximizing privacy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

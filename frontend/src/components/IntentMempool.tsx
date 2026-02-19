import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Shield, Timer, ArrowRight, User, Cpu, Activity } from 'lucide-react'
import { cn } from '../lib/utils'

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

const MOCK_INTENTS: Intent[] = [
    { id: '1', user: '0x...a3f2', wants: '2.5 ETH', offers: '6,250 USDC', isShielded: false, timestamp: Date.now(), status: 'GOSSIPING', complexity: 2 },
    { id: '2', user: 'SHIELDED', wants: '500 DAI', offers: 'RESOURCES', isShielded: true, timestamp: Date.now() - 5000, status: 'MATCHING', complexity: 4 },
    { id: '3', user: '0x...99b1', wants: 'SHIELDED ETH', offers: '1.2 WETH', isShielded: true, timestamp: Date.now() - 12000, status: 'GOSSIPING', complexity: 3 },
    { id: '4', user: '0x...c4d5', wants: '10,000 USDC', offers: '4 ETH', isShielded: false, timestamp: Date.now() - 20000, status: 'GOSSIPING', complexity: 2 },
]

export function IntentMempool() {
    const [intents, setIntents] = useState<Intent[]>(MOCK_INTENTS)
    const [activeMatches, setActiveMatches] = useState<string[]>([])

    // Simulate new intents arriving
    useEffect(() => {
        const interval = setInterval(() => {
            const isShielded = Math.random() > 0.5
            const newIntent: Intent = {
                id: Math.random().toString(36).substr(2, 9),
                user: isShielded ? 'SHIELDED' : `0x...${Math.random().toString(16).substr(2, 4)}`,
                wants: isShielded ? 'PRIVATE ASSET' : `${(Math.random() * 5).toFixed(1)} ETH`,
                offers: isShielded ? 'RESOURCES' : `${(Math.random() * 10000).toFixed(0)} USDC`,
                isShielded,
                timestamp: Date.now(),
                status: 'GOSSIPING',
                complexity: Math.floor(Math.random() * 5) + 1
            }
            setIntents(prev => [newIntent, ...prev.slice(0, 5)])
        }, 5000)
        return () => clearInterval(interval)
    }, [])

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
            
            {/* Header */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-16 bg-[#FF0000]" />
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                    Intent Mempool
                                </h2>
                                <span className="px-2 py-1 bg-[#FFCC00] text-black text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    Mock Data
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
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Gossip Latency</span>
                            <span className="text-xl font-black font-mono text-[#FF0000]">42ms</span>
                        </div>
                    </div>
                </div>

                {/* Mempool Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Live Stream */}
                    <div className="lg:col-span-8 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {intents.map((intent) => (
                                <motion.div
                                    key={intent.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ 
                                        opacity: 1, 
                                        x: 0,
                                        borderColor: activeMatches.includes(intent.id) ? '#FF0000' : 'rgba(255,255,255,0.1)'
                                    }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={cn(
                                        "p-6 border-2 transition-all duration-500 relative group overflow-hidden bg-zinc-900/30 backdrop-blur-xl",
                                        intent.status === 'MATCHING' ? "border-[#FF0000]/50" : "border-white/10"
                                    )}
                                >
                                    {/* Matching Overlay */}
                                    {intent.status === 'MATCHING' && (
                                        <motion.div 
                                            className="absolute inset-0 bg-[#FF0000]/5 z-0"
                                            animate={{ opacity: [0.1, 0.2, 0.1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
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
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Solver Sidebar */}
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

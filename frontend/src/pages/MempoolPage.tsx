import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Shield, Layers, Database, Timer, Check } from 'lucide-react'
import { SEO } from '../components/SEO'
import { shortenAddress } from '../lib/utils'

interface PendingIntent {
    id: string
    wants: string
    offers: string
    timestamp: number
    status: 'pending' | 'matched' | 'expired'
    solver?: string
    isShielded: boolean
}

const TOKENS = ['ETH', 'USDC', 'BTC', 'NAM', 'DAI', 'ATOM']

function generateMockIntent(): PendingIntent {
    const id = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const t1 = TOKENS[Math.floor(Math.random() * TOKENS.length)]
    let t2 = TOKENS[Math.floor(Math.random() * TOKENS.length)]
    while (t1 === t2) t2 = TOKENS[Math.floor(Math.random() * TOKENS.length)]

    const amount1 = (Math.random() * 10).toFixed(2)
    const amount2 = (Math.random() * 1000).toFixed(2)

    return {
        id,
        wants: `${amount1} ${t1}`,
        offers: `${amount2} ${t2}`,
        timestamp: Date.now(),
        status: 'pending',
        isShielded: Math.random() > 0.5 // 50% chance of being shielded
    }
}

export function MempoolPage() {
    const [intents, setIntents] = useState<PendingIntent[]>([])
    const [stats, setStats] = useState({ active: 0, matched: 0 })

    useEffect(() => {
        // Initial intents
        const initial = Array.from({ length: 5 }, generateMockIntent)
        setIntents(initial)
        setStats(s => ({ ...s, active: 5 }))

        // Simulate incoming intents
        const interval = setInterval(() => {
            if (Math.random() > 0.3) {
                const newIntent = generateMockIntent()
                setIntents(prev => [newIntent, ...prev].slice(0, 50)) // Keep top 50
                setStats(s => ({ ...s, active: s.active + 1 }))
            }

            // Simulate matching
            if (Math.random() > 0.7) {
                setIntents(prev => {
                    const pending = prev.filter(i => i.status === 'pending')
                    if (pending.length > 0) {
                        const idxToMatch = Math.floor(Math.random() * pending.length)
                        const matchedId = pending[idxToMatch].id
                        setStats(s => ({ active: Math.max(0, s.active - 1), matched: s.matched + 1 }))
                        return prev.map(i => i.id === matchedId ? { ...i, status: 'matched', solver: '0x' + Math.random().toString(16).slice(2, 10) } : i)
                    }
                    return prev
                })
            }
        }, 1500)

        // Cleanup old matched intents
        const cleanupInterval = setInterval(() => {
            setIntents(prev => prev.filter(i => {
                if (i.status === 'matched') {
                    // Remove if older than 5 seconds
                    return Date.now() - i.timestamp < 5000
                }
                return true
            }))
        }, 3000)

        return () => {
            clearInterval(interval)
            clearInterval(cleanupInterval)
        }
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20 pt-8 px-6 md:px-12 max-w-7xl mx-auto">
            <SEO title="Intent Mempool | Gnoma" description="Live visualization of the Anoma P2P Intent Gossip Network" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-8 h-8 text-[#FF0000] fill-[#FF0000] animate-pulse" />
                        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-[0.9]">
                            Intent<br />Mempool
                        </h1>
                    </div>
                    <p className="text-gray-500 uppercase tracking-widest text-sm max-w-xl leading-relaxed">
                        Live visualization of the Anoma P2P Gossip Network. Unsettled user intents stream in as "Wants vs Offers" before Solvers batch and settle them on-chain.
                    </p>
                    <div className="mt-4 inline-block bg-[#FF0000]/10 border border-[#FF0000]/20 px-3 py-1.5 text-xs text-[#FF0000] font-bold uppercase tracking-widest">
                        Demo Mode: Displaying Simulated Mock Data
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="swiss-border bg-gray-50 dark:bg-zinc-900 p-4 min-w-[120px]">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Pending
                        </div>
                        <div className="text-3xl font-mono-swiss text-black dark:text-white">{stats.active}</div>
                    </div>
                    <div className="swiss-border bg-gray-50 dark:bg-zinc-900 p-4 min-w-[120px]">
                        <div className="text-[10px] font-bold text-[#FF0000] uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Matched (Live)
                        </div>
                        <div className="text-3xl font-mono-swiss text-[#FF0000]">{stats.matched}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative min-h-[500px]">
                {/* Column Headers */}
                <div className="hidden lg:grid grid-cols-3 col-span-3 gap-8 absolute top-0 w-full z-10">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 border-b-2 border-black/10 dark:border-white/10 pb-2">User Offers</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#FF0000] text-center border-b-2 border-[#FF0000]/20 pb-2">Status / Settlement</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 text-right border-b-2 border-black/10 dark:border-white/10 pb-2">User Wants</div>
                </div>

                <div className="lg:col-span-3 lg:mt-12 space-y-4">
                    <AnimatePresence>
                        {intents.map((intent) => (
                            <motion.div
                                key={intent.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={`grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-center swiss-border p-4 transition-colors duration-500
                                    ${intent.status === 'matched'
                                        ? 'bg-[#FF0000]/10 border-[#FF0000] dark:bg-[#FF0000]/20'
                                        : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}
                                    ${intent.isShielded ? 'border-dashed border-red-500/50' : ''}
                                `}
                            >
                                {/* Offer Side */}
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 shrink-0 ${intent.status === 'matched' ? 'bg-[#FF0000] text-white' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Willing to give</span>
                                        <span className={`font-mono-swiss font-bold ${intent.isShielded && intent.status !== 'matched' ? 'text-transparent bg-clip-text bg-red-500 blur-[2px]' : 'text-black dark:text-white'}`}>
                                            {intent.isShielded && intent.status !== 'matched' ? '******' : intent.offers}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Center */}
                                <div className="flex flex-col items-center justify-center border-y lg:border-y-0 lg:border-x border-dashed border-gray-200 dark:border-zinc-800 py-4 lg:py-0">
                                    <div className="text-[10px] uppercase font-mono tracking-widest text-[#FF0000] mb-1">
                                        {intent.status === 'matched' ? 'Settled by Solver' : 'Awaiting Match'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {intent.status === 'pending' ? (
                                            <>
                                                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-700 animate-ping" />
                                                <Timer className="w-4 h-4 text-gray-400" />
                                            </>
                                        ) : (
                                            <span className="font-mono-swiss text-xs bg-black text-white px-2 py-1">
                                                {intent.solver} <Check className="inline w-3 h-3 ml-1 text-green-400" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 text-[cursor:help] relative group">
                                        {intent.isShielded ? (
                                            <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase tracking-widest">
                                                <Shield className="w-3 h-3" /> Shielded Intent
                                            </div>
                                        ) : (
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                Transparent Intent
                                            </div>
                                        )}
                                        <div className="font-mono text-[8px] text-gray-300 dark:text-zinc-700 mt-1">
                                            {shortenAddress(intent.id, 8, 8)}
                                        </div>
                                    </div>
                                </div>

                                {/* Want Side */}
                                <div className="flex items-center justify-end gap-3 text-right">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Wants to receive</span>
                                        <span className={`font-mono-swiss font-bold ${intent.isShielded && intent.status !== 'matched' ? 'text-transparent bg-clip-text bg-red-500 blur-[2px]' : 'text-black dark:text-white'}`}>
                                            {intent.isShielded && intent.status !== 'matched' ? '******' : intent.wants}
                                        </span>
                                    </div>
                                    <div className={`p-2 shrink-0 ${intent.status === 'matched' ? 'bg-[#FF0000] text-white' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {intents.length === 0 && (
                        <div className="text-center py-20 text-gray-400 dark:text-zinc-600 font-mono text-sm uppercase tracking-widest animate-pulse">
                            Waiting for network activity...
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

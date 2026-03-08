import { motion } from 'framer-motion'
import { Layers, Users, Fuel, Globe, TrendingUp, Zap } from 'lucide-react'
import { useMultiChainStats } from '../lib/api'
import { formatNumber } from '../lib/utils'

const CHAIN_META: Record<number, { name: string; icon: string; color: string }> = {
    1: { name: 'Ethereum', icon: '🔷', color: '#627EEA' },
    8453: { name: 'Base', icon: '🔵', color: '#0052FF' },
    10: { name: 'Optimism', icon: '🔴', color: '#FF0420' },
    42161: { name: 'Arbitrum', icon: '🔵', color: '#28A0F0' },
}

export function ARMOverview() {
    const { multiStats, loading } = useMultiChainStats()

    if (loading || !multiStats) {
        return (
            <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-black border-b border-black/5 dark:border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="h-8 w-64 bg-gray-200 dark:bg-zinc-800" />
                        <div className="h-4 w-96 bg-gray-100 dark:bg-zinc-900" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-32 bg-gray-100 dark:bg-zinc-900" />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    const { aggregate, perChain, chainCount } = multiStats
    const activeChains = perChain.filter(c => (c.stats.intentCount || 0) > 0)

    return (
        <section className="relative py-16 px-6 border-b-4 border-black dark:border-white/10 overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 swiss-grid-bg opacity-[0.03] dark:opacity-[0.02] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-black dark:bg-white flex items-center justify-center">
                                <Layers className="w-5 h-5 text-white dark:text-black" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">
                                    ARM Protocol
                                </h2>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 dark:text-zinc-600 mt-0.5">
                                    Anoma Resource Machine — Live Aggregate
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Active Chains Badges */}
                    <div className="flex items-center gap-2">
                        {perChain.map(chain => {
                            const meta = CHAIN_META[chain.chainId]
                            if (!meta) return null
                            const hasActivity = (chain.stats.intentCount || 0) > 0
                            return (
                                <motion.div
                                    key={chain.chainId}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-2 transition-colors ${hasActivity
                                            ? 'border-black dark:border-white/20 bg-white dark:bg-zinc-900 text-black dark:text-white'
                                            : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-gray-400 dark:text-zinc-600'
                                        }`}
                                >
                                    <span>{meta.icon}</span>
                                    <span className="hidden sm:inline">{meta.name}</span>
                                    {hasActivity && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black dark:border-white/10">
                    {/* Total ARM Intents */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 md:p-8 border-r border-b border-black/10 dark:border-white/5 bg-black dark:bg-white text-white dark:text-black"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 opacity-60" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Total ARM Intents</span>
                        </div>
                        <div className="text-3xl md:text-4xl font-black font-mono-swiss tabular-nums">
                            {formatNumber(aggregate.intentCount)}
                        </div>
                        {aggregate.intentCount24h > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-400 dark:text-green-600">
                                <TrendingUp className="w-3 h-3" /> +{formatNumber(aggregate.intentCount24h)} (24h)
                            </div>
                        )}
                    </motion.div>

                    {/* Unique Solvers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-6 md:p-8 border-r-0 md:border-r border-b border-black/10 dark:border-white/5 bg-white dark:bg-black"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-gray-400 dark:text-zinc-600" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-600">Active Solvers</span>
                        </div>
                        <div className="text-3xl md:text-4xl font-black font-mono-swiss tabular-nums text-black dark:text-white">
                            {formatNumber(aggregate.uniqueSolvers)}
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">
                            Across {chainCount} chain{chainCount !== 1 ? 's' : ''}
                        </div>
                    </motion.div>

                    {/* Total Gas Consumed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 md:p-8 border-r border-b-0 md:border-b border-black/10 dark:border-white/5 bg-white dark:bg-black"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Fuel className="w-4 h-4 text-gray-400 dark:text-zinc-600" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-600">ARM Gas Used</span>
                        </div>
                        <div className="text-3xl md:text-4xl font-black font-mono-swiss tabular-nums text-black dark:text-white">
                            {aggregate.totalGasUsed > 1_000_000
                                ? `${(aggregate.totalGasUsed / 1_000_000).toFixed(1)}M`
                                : formatNumber(aggregate.totalGasUsed)}
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">
                            Total gas consumed
                        </div>
                    </motion.div>

                    {/* Chains Live */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="p-6 md:p-8 bg-[#FF0000] text-white"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="w-4 h-4 opacity-80" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Chains Live</span>
                        </div>
                        <div className="text-3xl md:text-4xl font-black font-mono-swiss">
                            {chainCount}
                        </div>
                        <div className="mt-2 text-[10px] font-bold opacity-80 uppercase tracking-wider">
                            {activeChains.length} with activity
                        </div>
                    </motion.div>
                </div>

                {/* Per-Chain Breakdown — compact row */}
                {perChain.length > 1 && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {perChain.map((chain, i) => {
                            const meta = CHAIN_META[chain.chainId]
                            if (!meta) return null
                            const pct = aggregate.intentCount > 0
                                ? ((chain.stats.intentCount || 0) / aggregate.intentCount * 100).toFixed(0)
                                : '0'
                            return (
                                <motion.div
                                    key={chain.chainId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.05 }}
                                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/5"
                                >
                                    <span className="text-lg">{meta.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 truncate">{meta.name}</div>
                                        <div className="text-sm font-black font-mono-swiss text-black dark:text-white">
                                            {formatNumber(chain.stats.intentCount || 0)} <span className="text-gray-400 dark:text-zinc-600 font-normal text-[10px]">({pct}%)</span>
                                        </div>
                                    </div>
                                    {/* Mini bar */}
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                                        <div
                                            className="h-full bg-black dark:bg-white transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}

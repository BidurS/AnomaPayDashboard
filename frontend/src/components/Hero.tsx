import { motion } from 'framer-motion'
import { useState } from 'react'
import { useStats, useNetworkHealth } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatCurrency, cn } from '../lib/utils'

// Pulse Visualization Component
function PulseBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-20 dark:opacity-40">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#FF0000" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                <motion.path
                    d="M0,50 Q25,40 50,50 T100,50"
                    fill="none"
                    stroke="url(#pulse-gradient)"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.path
                    d="M0,60 Q35,30 70,60 T140,60"
                    fill="none"
                    stroke="url(#pulse-gradient)"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black to-transparent" />
        </div>
    )
}

interface BigStatProps {
    label: string
    value: string
    subValue?: string
    delay?: number
}

function BigStat({ label, value, subValue, delay = 0 }: BigStatProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start p-6 border-l border-black dark:border-white/20 first:border-l-0 md:first:border-l sm:border-l-0 sm:even:border-l lg:border-l relative group"
        >
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mb-2">
                {label}
            </span>
            <div className="text-swiss-lg md:text-5xl lg:text-6xl font-bold tracking-tighter text-black dark:text-white leading-none mb-1 group-hover:text-swiss-red transition-colors duration-300">
                {value}
            </div>
            {subValue && (
                <div className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wider">{subValue}</div>
            )}
        </motion.div>
    )
}

export function Hero() {
    const { activeChain } = useChainContext()
    const { stats, loading } = useStats(activeChain?.id || 8453)
    const { health } = useNetworkHealth(activeChain?.id || 8453)
    const [timeframe, setTimeframe] = useState<'24h' | '7d' | 'all'>('24h')

    const getVolume = () => {
        if (!stats) return 0
        if (timeframe === '24h') return stats.volume24h
        if (timeframe === '7d') return stats.volume7d
        return stats.totalVolume
    }

    return (
        <section className="relative w-full border-b border-black dark:border-white bg-white dark:bg-black overflow-hidden">
            <PulseBackground />

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 border-black dark:border-white">
                    {/* Main Title/Brand Block */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 lg:border-r border-black dark:border-white/20">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white uppercase leading-none">
                                    <span className="text-[#FF0000]">Gnoma</span><br />Explorer
                                </h1>
                            </div>
                            
                            {/* Timeframe Selector */}
                            <div className="flex gap-1 mt-4">
                                {(['24h', '7d', 'all'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t)}
                                        className={cn(
                                            "px-2 py-1 text-[9px] font-black uppercase tracking-tighter border border-black dark:border-white/20 transition-all",
                                            timeframe === t 
                                                ? "bg-[#FF0000] text-white border-[#FF0000]" 
                                                : "bg-transparent text-gray-400 hover:text-black dark:hover:text-white"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Big Stats */}
                    <BigStat
                        label="Value Shielded"
                        value={loading ? '—' : formatCurrency(health?.tvl || 0)}
                        subValue="Protocol TVL"
                        delay={0.1}
                    />

                    <BigStat
                        label={`${timeframe === 'all' ? 'Total' : timeframe} Volume`}
                        value={loading ? '—' : formatCurrency(getVolume())}
                        subValue="Settled USD"
                        delay={0.2}
                    />
                    
                    <BigStat
                        label="Intents"
                        value={loading ? '—' : (stats?.intentCount || 0).toLocaleString()}
                        subValue="Executed"
                        delay={0.3}
                    />
                </div>
            </div>
        </section>
    )
}

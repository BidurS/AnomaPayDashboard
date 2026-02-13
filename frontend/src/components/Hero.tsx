import { motion } from 'framer-motion'
import { Shield, Zap, Users, Layers } from 'lucide-react'
import { useStats, useNetworkHealth } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatCurrency, formatNumber } from '../lib/utils'

interface StatCardProps {
    title: string
    value: string
    subValue?: string
    icon: React.ElementType
    delay?: number
    accent?: 'red' | 'blue' | 'yellow' | 'black'
}

function StatCard({ title, value, subValue, icon: Icon, delay = 0, accent = 'black' }: StatCardProps) {
    const accentColors = {
        red: 'bg-[#FF0000]',
        blue: 'bg-[#0066CC]',
        yellow: 'bg-[#FFCC00]',
        black: 'bg-black'
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="swiss-card group"
        >
            <div className={`swiss-card-accent ${accentColors[accent]}`} />

            <div className="pt-2">
                <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                        {title}
                    </span>
                    <Icon className="w-5 h-5 text-gray-400" />
                </div>

                <div className="swiss-number text-black">
                    {value}
                </div>
                {subValue && (
                    <div className="text-xs text-gray-500 mt-2 uppercase tracking-wider">{subValue}</div>
                )}
            </div>
        </motion.div>
    )
}

export function Hero() {
    const { activeChain } = useChainContext()
    const { stats, loading } = useStats(activeChain?.id || 8453)
    const { health } = useNetworkHealth(activeChain?.id || 8453)

    return (
        <section className="relative py-16 md:py-24 swiss-grid">
            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <p className="swiss-subtitle mb-4">Real-time Analytics</p>
                    <h1 className="swiss-title">
                        <span className="text-[#FF0000]">Gnoma</span> Explorer
                    </h1>
                    <p className="text-gray-600 mt-6 max-w-xl mx-auto">
                        Tracking intents settled via the Anoma Protocol Adapter
                    </p>
                    <div className="swiss-divider w-24 mx-auto mt-8" />
                </motion.div>

                {/* Stats Grid - 6 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Value Shielded"
                        value={loading ? '—' : formatCurrency(health?.tvl || 0)}
                        subValue="TVL in Protocol"
                        icon={Shield}
                        delay={0.1}
                        accent="red"
                    />

                    <StatCard
                        title="Shielded Liquidity Depth"
                        value={loading ? '—' : formatCurrency(health?.tvl || 0)}
                        subValue={`${health?.shieldingRate || 0}% Shielding Rate`}
                        icon={Shield}
                        delay={0.1}
                        accent="red"
                    />

                    <StatCard
                        title="Settled USD Value"
                        value={loading ? '—' : formatCurrency(stats?.totalVolume || 0)}
                        subValue="All Protocol Assets"
                        icon={Layers}
                        delay={0.2}
                        accent="black"
                    />

                    <StatCard
                        title="Intent Satisfaction Index"
                        value={loading ? '—' : formatNumber(stats?.intentCount || 0)}
                        subValue="Intents Fully Resolved"
                        icon={Zap}
                        delay={0.25}
                        accent="yellow"
                    />

                    <StatCard
                        title="Ecosystem Participants"
                        value={loading ? '—' : formatNumber(stats?.uniqueSolvers || 0)}
                        subValue="Solvers & Relay Teams"
                        icon={Users}
                        delay={0.3}
                        accent="blue"
                    />

                    <StatCard
                        title="Solver Intelligence (IQ)"
                        value={loading ? '—' : '98.4'}
                        subValue="Intent Complexity Score"
                        icon={Zap}
                        delay={0.35}
                        accent="red"
                    />
                </div>
            </div>
        </section>
    )
}

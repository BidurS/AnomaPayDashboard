import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { Shield, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import { AnonymitySimulator } from './AnonymitySimulator'
import { useChainContext } from '../context/ChainContext'
import { formatNumber } from '../lib/utils'
import { usePrivacyStats } from '../lib/api'

// Animated counter component
function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
    const count = useMotionValue(0)
    const [display, setDisplay] = useState('0')

    useEffect(() => {
        const controls = animate(count, value, {
            duration,
            ease: 'easeOut',
            onUpdate: (v) => setDisplay(formatNumber(Math.round(v))),
        })
        return () => controls.stop()
    }, [value, duration])

    return <>{display}</>
}

// Pulsing dot for the latest data point
function PulsingDot({ cx, cy }: { cx?: number; cy?: number }) {
    if (!cx || !cy) return null
    return (
        <g>
            <motion.circle
                cx={cx} cy={cy} r={8}
                fill="#FF0000" opacity={0.3}
                animate={{ r: [8, 16, 8], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <circle cx={cx} cy={cy} r={5} fill="#FF0000" stroke="#fff" strokeWidth={2} />
        </g>
    )
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
        <div className="bg-white dark:bg-zinc-950 border-2 border-black dark:border-white/20 p-3 shadow-[4px_4px_0_#000] dark:shadow-none transition-colors">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
                    {entry.name}: {entry.value.toLocaleString()}
                </p>
            ))}
            {payload[0]?.payload?.root_hash && (
                <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-mono mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                    Root: {payload[0].payload.root_hash.slice(0, 10)}...
                </p>
            )}
        </div>
    )
}

export function PrivacyPulse() {
    const { activeChain } = useChainContext()
    const chainId = activeChain?.id || 8453
    const { stats, loading } = usePrivacyStats(chainId)

    // Data is already ASC from API (old to new)
    const data = Array.isArray(stats) ? stats : []
    const currentPoolSize = data.length > 0 ? data[data.length - 1].estimated_pool_size : 0

    const chartData = data.map(d => ({
        date: new Date(d.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actions: d.estimated_pool_size,
        root_hash: d.root_hash
    }))

    const hasData = chartData.length > 0
    const growthPercent = hasData && chartData.length > 1
        ? ((chartData[chartData.length - 1].actions - chartData[0].actions) / Math.max(chartData[0].actions, 1) * 100).toFixed(1)
        : '0'

    const stagger = {
        hidden: {},
        show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
    }
    const fadeUp = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    }

    return (
        <section className="py-16 bg-gray-50 dark:bg-black/40 swiss-grid transition-colors">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-50px' }}
                >
                    <motion.div className="swiss-card mb-8" variants={fadeUp}>
                        <div className="swiss-card-accent bg-[#FF0000]" />

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FF0000] flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase tracking-tight text-black dark:text-white">Privacy Pulse</h2>
                                    <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Commitment Tree State</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="swiss-number text-black dark:text-white">
                                        {loading ? '—' : <AnimatedNumber value={currentPoolSize} />}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-[0.2em]">
                                        True Anonymity Set
                                    </div>
                                </div>
                                {hasData && parseFloat(growthPercent) > 0 && (
                                    <div className="px-4 py-3 bg-[#0066CC] text-white flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="font-bold">+{growthPercent}%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <motion.div className="h-64" variants={fadeUp}>
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-600 uppercase text-sm tracking-wider"
                                    >
                                        Loading privacy data...
                                    </motion.div>
                                ) : hasData ? (
                                    <motion.div
                                        key="chart"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.6 }}
                                        className="h-full"
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="privacyGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#FF0000" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#FF0000" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" opacity={0.1} vertical={false} />
                                                <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: '#666', strokeWidth: 1, opacity: 0.3 }} />
                                                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="actions"
                                                    stroke="#FF0000"
                                                    strokeWidth={3}
                                                    fill="url(#privacyGradient)"
                                                    name="Shielded Actions"
                                                    isAnimationActive={true}
                                                    animationDuration={1500}
                                                    animationEasing="ease-out"
                                                />
                                                {chartData.length > 0 && (
                                                    <ReferenceDot
                                                        x={chartData[chartData.length - 1].date}
                                                        y={chartData[chartData.length - 1].actions}
                                                        shape={<PulsingDot />}
                                                    />
                                                )}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-600 uppercase text-sm tracking-wider"
                                    >
                                        No privacy data yet — indexer syncing
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        <div className="mt-6 pt-6 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-8 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#FF0000] border border-black/20 dark:border-white/20" />
                                <span className="text-gray-600 dark:text-zinc-500 uppercase tracking-wider">Cumulative shielded transactions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#0066CC] border border-black/20 dark:border-white/20" />
                                <span className="text-gray-600 dark:text-zinc-500 uppercase tracking-wider">Growing anonymity = stronger privacy</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                        <AnonymitySimulator poolSize={currentPoolSize || 1200} />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
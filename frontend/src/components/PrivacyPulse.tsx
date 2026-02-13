import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useChainContext } from '../context/ChainContext'
import { formatNumber } from '../lib/utils'

const API_URL = import.meta.env.DEV ? '' : 'https://anomapay-explorer.bidurandblog.workers.dev'

interface PrivacyPoolStat {
    block_number: number
    timestamp: number
    estimated_pool_size: number
    root_hash: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_#000]">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
                    {entry.name}: {entry.value.toLocaleString()}
                </p>
            ))}
            {payload[0]?.payload?.root_hash && (
                <p className="text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-gray-100">
                    Root: {payload[0].payload.root_hash.slice(0, 10)}...
                </p>
            )}
        </div>
    )
}

export function PrivacyPulse() {
    const { activeChain } = useChainContext()
    const [data, setData] = useState<PrivacyPoolStat[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPoolSize, setCurrentPoolSize] = useState(0)
    const [latestRoot, setLatestRoot] = useState<string | null>(null)

    useEffect(() => {
        setLoading(true)
        fetch(`${API_URL}/api/privacy-stats?chainId=${activeChain?.id || 8453}`)
            .then(res => res.json())
            .then(stats => {
                setData(stats || [])
                if (stats?.length > 0) {
                    const latest = stats[stats.length - 1] // API returns ASC, so last is latest
                    setCurrentPoolSize(latest.estimated_pool_size)
                    setLatestRoot(latest.root_hash)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [activeChain?.id])

    // Data is already ASC from API (old to new) — perfect for chart
    const chartData = data.map(d => ({
        date: new Date(d.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actions: d.estimated_pool_size,
        root_hash: d.root_hash
    }))

    const hasData = chartData.length > 0
    const displayPoolSize = currentPoolSize
    const growthPercent = hasData && chartData.length > 1
        ? ((chartData[chartData.length - 1].actions - chartData[0].actions) / chartData[0].actions * 100).toFixed(1)
        : '0'

    return (
        <section className="py-16 bg-gray-50 swiss-grid">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="swiss-card">
                        <div className="swiss-card-accent bg-[#FF0000]" />

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FF0000] flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold uppercase tracking-tight">Privacy Pulse</h2>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Commitment Tree State</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="swiss-number">
                                        {loading ? '—' : formatNumber(displayPoolSize)}
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
                                        Commitments
                                    </div>
                                    {latestRoot && (
                                        <div className="text-[10px] font-mono text-gray-400 mt-1">
                                            Root: {latestRoot.slice(0, 6)}...{latestRoot.slice(-4)}
                                        </div>
                                    )}
                                </div>
                                {hasData && parseFloat(growthPercent) > 0 && (
                                    <div className="px-4 py-3 bg-[#0066CC] text-white flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="font-bold">+{growthPercent}%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-64">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">
                                    Loading privacy data...
                                </div>
                            ) : hasData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="privacyGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#FF0000" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#FF0000" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                                        <XAxis dataKey="date" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
                                        <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="actions" stroke="#FF0000" strokeWidth={3} fill="url(#privacyGradient)" name="Shielded Actions" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">
                                    No privacy data yet — indexer syncing
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t-2 border-black flex flex-wrap gap-8 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#FF0000] border-2 border-black" />
                                <span className="text-gray-600 uppercase tracking-wider">Cumulative shielded transactions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-[#0066CC] border-2 border-black" />
                                <span className="text-gray-600 uppercase tracking-wider">Growing anonymity = stronger privacy</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

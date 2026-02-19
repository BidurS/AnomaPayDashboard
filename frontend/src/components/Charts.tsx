import { motion } from 'framer-motion'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useDailyStats, usePayloadStats, useResourceChurn } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatCurrency, formatNumber, cn } from '../lib/utils'

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
        <div className="bg-white dark:bg-zinc-950 border-2 border-black dark:border-white/20 p-3 shadow-[4px_4px_0_#000] dark:shadow-none transition-colors">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2">{label || payload[0]?.name}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: entry.color || entry.payload?.fill }}>
                    {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}
                </p>
            ))}
        </div>
    )
}

interface ChartCardProps {
    title: string
    accent: string
    loading: boolean
    hasData: boolean
    timeframe: '24h' | '7d' | '30d'
    onTimeframeChange: (t: '24h' | '7d' | '30d') => void
    children: React.ReactNode
}

function ChartCard({ title, accent, loading, timeframe, onTimeframeChange, children }: ChartCardProps) {
    return (
        <div className="swiss-card">
            <div className="swiss-card-accent" style={{ background: accent }} />
            <div className="flex items-center justify-between mb-6 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                    {title}
                </h3>
                <div className="flex gap-1">
                    {(['24h', '7d', '30d'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => onTimeframeChange(t)}
                            className={cn(
                                "px-1.5 py-0.5 text-[8px] font-black uppercase border border-black/10 dark:border-white/10 transition-all",
                                timeframe === t ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-400 hover:text-black dark:hover:text-white"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-64">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-zinc-600 uppercase text-[10px] font-bold tracking-widest">Loading Analytics...</div>
                ) : children}
            </div>
        </div>
    )
}

export function Charts() {
    const { activeChain } = useChainContext()
    const [volTimeframe, setVolTimeframe] = useState<'24h' | '7d' | '30d'>('7d')
    const [gasTimeframe, setGasTimeframe] = useState<'24h' | '7d' | '30d'>('7d')
    const [churnTimeframe, setChurnTimeframe] = useState<'24h' | '7d' | '30d'>('7d')

    const daysMap = { '24h': 1, '7d': 7, '30d': 30 }

    const { dailyStats: volStats, loading: loadingVol } = useDailyStats(activeChain?.id || 8453, daysMap[volTimeframe])
    const { dailyStats: gasStats, loading: loadingGas } = useDailyStats(activeChain?.id || 8453, daysMap[gasTimeframe])
    const { churn, loading: loadingChurn } = useResourceChurn(activeChain?.id || 8453, daysMap[churnTimeframe])
    const { stats: payloadStats, loading: loadingPayloads } = usePayloadStats(activeChain?.id || 8453)

    const volumeData = volStats.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: d.volume
    }))

    const gasData = gasStats.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        gas: d.total_gas_used
    }))

    const churnData = churn.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        commitments: d.commitments,
        pool: d.pool_size
    }))

    const distributionData = (payloadStats || []).map((p, i) => ({
        name: p.type,
        value: p.count,
        color: ['#0066CC', '#FF0000', '#FFCC00', '#888888'][i % 4]
    }))

    return (
        <section className="py-16 bg-gray-50 dark:bg-black/40 swiss-grid transition-colors">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-8 bg-[#FF0000]" />
                        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">Network Intelligence</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Intent Volume */}
                        <ChartCard title="Intent Volume (USD)" accent="#0066CC" loading={loadingVol} timeframe={volTimeframe} onTimeframeChange={setVolTimeframe} hasData={volumeData.length > 0}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={volumeData}>
                                    <defs>
                                        <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0066CC" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#0066CC" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={{ stroke: '#666', opacity: 0.2 }} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="volume" stroke="#0066CC" strokeWidth={3} fill="url(#volumeGradient)" name="Volume" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* ARM Churn / State Growth */}
                        <ChartCard title="ARM State Growth" accent="#FF0000" loading={loadingChurn} timeframe={churnTimeframe} onTimeframeChange={setChurnTimeframe} hasData={churnData.length > 0}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={churnData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={{ stroke: '#666', opacity: 0.2 }} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="commitments" fill="#FF0000" name="New Commitments" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Gas Usage */}
                        <ChartCard title="Prover / Gas Load" accent="#000000" loading={loadingGas} timeframe={gasTimeframe} onTimeframeChange={setGasTimeframe} hasData={gasData.length > 0}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={gasData}>
                                    <defs>
                                        <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#333" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#333" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" opacity={0.1} vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={{ stroke: '#666', opacity: 0.2 }} />
                                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="gas" stroke="#000" strokeWidth={2} fill="url(#gasGradient)" name="Gas Used" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Intent Distribution */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-[#FFCC00]" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 mb-6 pt-2">
                                Intent Distribution
                            </h3>
                            <div className="h-64 flex items-center justify-center">
                                {loadingPayloads ? (
                                    <div className="text-gray-400 dark:text-zinc-600 uppercase text-[10px] font-bold tracking-widest">Loading...</div>
                                ) : distributionData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-gray-400 dark:text-zinc-600 uppercase text-[10px] font-bold tracking-widest">No intents classified yet</div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-4 justify-center">
                                {distributionData.map((dist, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dist.color }} />
                                        <span className="text-[10px] font-bold uppercase text-black dark:text-zinc-300">{dist.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useDailyStats, useAssets, usePayloadStats } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatCurrency, formatNumber } from '../lib/utils'

const SWISS_COLORS = ['#FF0000', '#0066CC', '#FFCC00', '#000000', '#666666']

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
        <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_#000]">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{label || payload[0]?.name}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} className="text-sm font-bold" style={{ color: entry.color || entry.payload?.fill }}>
                    {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}
                </p>
            ))}
        </div>
    )
}

export function Charts() {
    const { activeChain } = useChainContext()
    const { dailyStats, loading: loadingStats } = useDailyStats(activeChain?.id || 8453, 90)
    const { assets, loading: loadingAssets } = useAssets(activeChain?.id || 8453)
    const { stats: payloadStats, loading: loadingPayloads } = usePayloadStats(activeChain?.id || 8453)

    // Format daily stats for charts - REAL DATA ONLY
    const volumeData = (dailyStats || []).map(d => ({
        date: new Date(d.date).toLocaleDateString(),
        volume: parseFloat(d.volume),
    }))

    const intentsData = (dailyStats || []).map(d => ({
        date: new Date(d.date).toLocaleDateString(),
        intents: d.count,
    }))

    const assetData = (assets || []).slice(0, 5).map((a, i) => ({
        name: a.asset_symbol,
        value: parseFloat(a.flow_in),
        color: SWISS_COLORS[i % SWISS_COLORS.length]
    }))

    const distributionData = (payloadStats || []).map((p, i) => ({
        name: p.type,
        value: p.count,
        color: ['#0066CC', '#FF0000', '#FFCC00', '#000000'][i % 4]
    }))

    const loading = loadingStats || loadingAssets || loadingPayloads
    const hasVolumeData = volumeData.length > 0
    const hasAssetData = assetData.length > 0
    const hasDistData = distributionData.length > 0

    return (
        <section className="py-16 bg-gray-50 swiss-grid">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-8 bg-[#FF0000]" />
                        <h2 className="text-2xl font-extrabold uppercase tracking-tight">Analytics</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Intent Volume Chart */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-[#0066CC]" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 pt-2">
                                Intent Volume (7d)
                            </h3>
                            <div className="h-64">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">Loading...</div>
                                ) : hasVolumeData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={volumeData}>
                                            <defs>
                                                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#0066CC" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#0066CC" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                                            <XAxis dataKey="date" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
                                            <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="volume" stroke="#0066CC" strokeWidth={3} fill="url(#volumeGradient)" name="Volume" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">
                                        No data yet — indexer syncing
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Intent Distribution */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-[#000000]" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 pt-2">
                                Intent Distribution
                            </h3>
                            <div className="h-64 flex items-center justify-center">
                                {loading ? (
                                    <div className="text-gray-400 uppercase text-sm tracking-wider">Loading...</div>
                                ) : hasDistData ? (
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
                                                stroke="#000"
                                                strokeWidth={2}
                                            >
                                                {distributionData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-gray-400 uppercase text-sm tracking-wider">
                                        No intents classified yet
                                    </div>
                                )}
                            </div>
                            {hasDistData && (
                                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                                    {distributionData.map((dist, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-black" style={{ background: dist.color }} />
                                            <span className="text-xs font-bold uppercase">{dist.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Asset Popularity */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-[#FF0000]" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 pt-2">
                                Bridge Flow (USDC Shielded)
                            </h3>
                            <div className="h-64">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">Loading...</div>
                                ) : hasAssetData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={assetData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                                            <XAxis dataKey="name" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
                                            <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v / 1e6)}`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill="#FF0000" stroke="#000" strokeWidth={2} name="Flow In" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-gray-400 uppercase text-sm tracking-wider flex items-center justify-center h-full">
                                        No assets indexed yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Daily Intents */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-[#FFCC00]" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-6 pt-2">
                                Daily Intents
                            </h3>
                            <div className="h-64">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">Loading...</div>
                                ) : hasVolumeData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={intentsData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                                            <XAxis dataKey="date" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
                                            <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="intents" fill="#FFCC00" stroke="#000" strokeWidth={2} name="Intents" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 uppercase text-sm tracking-wider">
                                        No data yet — indexer syncing
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
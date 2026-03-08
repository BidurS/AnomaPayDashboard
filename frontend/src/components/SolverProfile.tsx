import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Clock, Wallet, BarChart3, DollarSign, Shield, Globe, Zap } from 'lucide-react'
import { SEO } from './SEO'
import { useSolverDetail, useSolverEconomicHistory } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, formatCurrency, formatNumber, timeAgo, cn } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TransactionTable } from './TransactionTable'

interface SolverProfileProps {
    address: string
    onBack: () => void
    onTxClick: (hash: string) => void
}

const CHAIN_COLORS: Record<number, string> = {
    1: '#627EEA',
    8453: '#0052FF',
    42161: '#28A0F0',
    10: '#FF0420',
}

const TIER_CONFIG: Record<string, { color: string; bg: string; glow: string }> = {
    Diamond: { color: 'text-cyan-400', bg: 'bg-gradient-to-r from-cyan-500 to-blue-500', glow: 'shadow-cyan-500/30' },
    Gold: { color: 'text-yellow-400', bg: 'bg-gradient-to-r from-yellow-500 to-amber-500', glow: 'shadow-yellow-500/30' },
    Silver: { color: 'text-gray-300', bg: 'bg-gradient-to-r from-gray-400 to-gray-500', glow: 'shadow-gray-400/30' },
    Bronze: { color: 'text-orange-400', bg: 'bg-gradient-to-r from-orange-500 to-amber-600', glow: 'shadow-orange-500/30' },
}

export function SolverProfile({ address, onBack, onTxClick }: SolverProfileProps) {
    const { activeChain } = useChainContext()
    const { solver, loading, error } = useSolverDetail(activeChain?.id || 8453, address)
    const { econHistory } = useSolverEconomicHistory(activeChain?.id || 8453, address)

    // Build activity heatmap data (GitHub-style grid)
    const heatmapData = useMemo(() => {
        if (!solver?.dailyActivity) return []
        const map = new Map<string, number>()
        for (const d of solver.dailyActivity) {
            map.set(d.date, d.count)
        }
        // Generate last 90 days
        const days: { date: string; count: number; dayOfWeek: number; weekIndex: number }[] = []
        const now = new Date()
        for (let i = 89; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            days.push({
                date: dateStr,
                count: map.get(dateStr) || 0,
                dayOfWeek: d.getDay(),
                weekIndex: Math.floor((89 - i) / 7)
            })
        }
        return days
    }, [solver?.dailyActivity])

    const maxActivity = useMemo(() => Math.max(...heatmapData.map(d => d.count), 1), [heatmapData])

    if (loading) {
        return (
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center py-24">
                        <div className="inline-block w-8 h-8 border-4 border-black dark:border-white border-t-transparent animate-spin mb-4" />
                        <p className="text-gray-500 uppercase text-sm tracking-wider">Loading solver profile...</p>
                    </div>
                </div>
            </section>
        )
    }

    if (error || !solver) {
        return (
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-wider hover:text-red-600 transition-colors text-black dark:text-white">
                        <ArrowLeft className="w-4 h-4" /> Back to Solvers
                    </button>
                    <div className="swiss-card p-12 text-center">
                        <p className="text-gray-500 uppercase tracking-wider">Solver not found</p>
                        <code className="text-xs mt-2 block text-gray-400">{address}</code>
                    </div>
                </div>
            </section>
        )
    }

    const tier = TIER_CONFIG[solver.reputationTier || 'Bronze'] || TIER_CONFIG.Bronze
    const chainData = (solver.chainBreakdown || []).map((c: any) => ({
        name: c.chainName,
        value: c.txCount,
        chainId: c.chainId,
    }))
    const repBreakdown = solver.reputationBreakdown || { volume: 0, activity: 0, consistency: 0, chainDiversity: 0, longevity: 0 }

    const activityData = (solver.dailyActivity || []).map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        txs: d.count
    }))

    return (
        <>
            <SEO
                title={address ? `Solver ${shortenAddress(address)}` : 'Solver Profile'}
                description={`Cross-chain performance analytics for Anoma solver ${address}.`}
                type="profile"
            />
            <section className="py-16 swiss-grid min-h-screen">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Back button */}
                        <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-wider hover:text-red-600 transition-colors text-black dark:text-white">
                            <ArrowLeft className="w-4 h-4" /> Back to Solvers
                        </button>

                        {/* ─── Hero Header ─── */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                {/* Reputation Avatar */}
                                <div className={cn("w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-white font-black text-2xl md:text-3xl shadow-lg", tier.bg, tier.glow)}>
                                    {(solver.reputationScore || 0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-black dark:text-white">Solver Profile</h1>
                                        <span className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-widest", tier.bg, "text-white")}>
                                            {solver.reputationTier || 'Bronze'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="font-mono text-sm text-gray-600 dark:text-gray-400">{shortenAddress(address, 12, 10)}</code>
                                        {activeChain?.explorer_url && (
                                            <a href={`${activeChain.explorer_url}/address/${address}`} target="_blank" rel="noopener noreferrer"
                                                className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-black dark:text-white">
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                {solver.badges?.map((badge: string) => {
                                    const badgeColors: Record<string, string> = {
                                        'Whale': 'bg-blue-600', 'DeFi Router': 'bg-purple-600', 'CoW Master': 'bg-green-600',
                                        'Multi-Chain': 'bg-gradient-to-r from-blue-500 to-purple-500',
                                        'Power Solver': 'bg-[#FF0000]', 'Veteran': 'bg-zinc-800 dark:bg-zinc-200 dark:text-black',
                                    }
                                    return (
                                        <div key={badge} className={cn("px-3 py-1.5 text-white text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_#000]", badgeColors[badge] || 'bg-gray-600')}>
                                            {badge}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ─── Big Stat Cards ─── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                            {[
                                { label: 'Total Volume', value: formatCurrency(solver.totalVolumeUsd || 0), icon: DollarSign, color: 'text-green-500' },
                                { label: 'Transactions', value: formatNumber(solver.tx_count), icon: BarChart3, color: 'text-[#0066CC]' },
                                { label: 'Chains Active', value: (solver.chainBreakdown || []).length, icon: Globe, color: 'text-purple-500' },
                                { label: 'Active Since', value: timeAgo(solver.first_seen), icon: Clock, color: 'text-[#FF0000]' },
                            ].map(stat => (
                                <div key={stat.label} className="swiss-border bg-white dark:bg-zinc-950 p-4 md:p-6 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <stat.icon className={cn('w-4 h-4', stat.color)} />
                                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
                                    </div>
                                    <div className="text-xl md:text-2xl font-extrabold text-black dark:text-white">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ─── Reputation & Chain Breakdown Row ─── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            {/* Reputation Score Breakdown */}
                            <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-4 h-4 text-[#FF0000]" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Reputation Breakdown</h3>
                                </div>
                                {/* Score Ring */}
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="relative w-24 h-24 shrink-0">
                                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-zinc-800" />
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGradient)" strokeWidth="8"
                                                strokeDasharray={`${(solver.reputationScore || 0) * 2.64} 264`}
                                                strokeLinecap="round" />
                                            <defs>
                                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%">
                                                    <stop offset="0%" stopColor="#FF0000" />
                                                    <stop offset="100%" stopColor="#FFCC00" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-black text-black dark:text-white">{solver.reputationScore || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {[
                                            { label: 'Volume', value: repBreakdown.volume, max: 30, color: 'bg-green-500' },
                                            { label: 'Activity', value: repBreakdown.activity, max: 25, color: 'bg-blue-500' },
                                            { label: 'Consistency', value: repBreakdown.consistency, max: 20, color: 'bg-purple-500' },
                                            { label: 'Chain Diversity', value: repBreakdown.chainDiversity, max: 15, color: 'bg-orange-500' },
                                            { label: 'Longevity', value: repBreakdown.longevity, max: 10, color: 'bg-[#FF0000]' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center gap-2">
                                                <span className="text-[9px] uppercase tracking-widest text-gray-400 w-20 shrink-0 font-bold">{item.label}</span>
                                                <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                                    <motion.div
                                                        className={cn("h-full", item.color)}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(item.value / item.max) * 100}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{item.value}/{item.max}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Cross-Chain Breakdown */}
                            <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Globe className="w-4 h-4 text-[#0066CC]" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Cross-Chain Distribution</h3>
                                </div>
                                {chainData.length > 0 ? (
                                    <div className="flex items-center gap-6">
                                        <div className="w-36 h-36 shrink-0">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={chainData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" nameKey="name" strokeWidth={2} stroke="#1a1a1a">
                                                        {chainData.map((entry: any) => (
                                                            <Cell key={entry.chainId} fill={CHAIN_COLORS[entry.chainId] || '#666'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            {chainData.map((chain: any) => (
                                                <div key={chain.chainId} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3" style={{ backgroundColor: CHAIN_COLORS[chain.chainId] || '#666' }} />
                                                        <span className="text-sm font-bold text-black dark:text-white">{chain.name}</span>
                                                    </div>
                                                    <span className="font-mono text-sm text-gray-500">{formatNumber(chain.value)} txs</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">No chain data available</p>
                                )}
                            </div>
                        </div>

                        {/* ─── Activity Heatmap ─── */}
                        {heatmapData.length > 0 && (
                            <div className="swiss-border bg-white dark:bg-zinc-950 p-6 mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-4 h-4 text-[#FFCC00]" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Activity (Last 90 Days)</h3>
                                    <span className="text-[10px] font-mono text-gray-400 ml-auto">
                                        {heatmapData.filter(d => d.count > 0).length} active days
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="flex gap-[3px] min-w-[500px]">
                                        {Array.from({ length: 13 }).map((_, weekIdx) => (
                                            <div key={weekIdx} className="flex flex-col gap-[3px]">
                                                {Array.from({ length: 7 }).map((_, dayIdx) => {
                                                    const idx = weekIdx * 7 + dayIdx
                                                    const d = heatmapData[idx]
                                                    if (!d) return <div key={dayIdx} className="w-3 h-3 md:w-4 md:h-4" />
                                                    const intensity = d.count / maxActivity
                                                    const bg = d.count === 0
                                                        ? 'bg-gray-100 dark:bg-zinc-800'
                                                        : intensity > 0.75 ? 'bg-[#FF0000]'
                                                            : intensity > 0.5 ? 'bg-red-400'
                                                                : intensity > 0.25 ? 'bg-red-300'
                                                                    : 'bg-red-200 dark:bg-red-900'
                                                    return (
                                                        <div
                                                            key={dayIdx}
                                                            className={cn("w-3 h-3 md:w-4 md:h-4 transition-colors", bg)}
                                                            title={`${d.date}: ${d.count} txs`}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-[9px] text-gray-400 uppercase">Less</span>
                                        {['bg-gray-100 dark:bg-zinc-800', 'bg-red-200 dark:bg-red-900', 'bg-red-300', 'bg-red-400', 'bg-[#FF0000]'].map((c, i) => (
                                            <div key={i} className={cn("w-3 h-3", c)} />
                                        ))}
                                        <span className="text-[9px] text-gray-400 uppercase">More</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── Strategy Card ─── */}
                        <div className="swiss-border bg-zinc-900 text-white p-6 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Primary Logic</p>
                                    <div className="text-lg font-bold">
                                        {solver.forwarderCallsCount && solver.forwarderCallsCount > (solver.tx_count || 0) * 0.5 ? 'External Aggregator' : 'Direct Intent Matcher'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">DeFi Interaction Rate</p>
                                    <div className="text-lg font-bold">
                                        {((solver.forwarderCallsCount || 0) / (solver.tx_count || 1) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Gas Efficiency</p>
                                    <div className="text-lg font-bold text-green-400">
                                        {solver.tx_count > 0
                                            ? formatNumber(Math.round(parseInt(solver.total_gas_spent || '0') / solver.tx_count))
                                            : '—'
                                        } avg/tx
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Daily Activity Chart ─── */}
                        {activityData.length > 0 && (
                            <div className="swiss-border bg-white dark:bg-zinc-950 p-6 mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="w-4 h-4 text-[#0066CC]" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Daily Transaction Volume</h3>
                                </div>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activityData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                                            <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} />
                                            <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }}
                                            />
                                            <Bar dataKey="txs" fill="#0066CC" name="Transactions" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* ─── Economics Panel ─── */}
                        {econHistory && econHistory.totals && (
                            <div className="swiss-border bg-white dark:bg-zinc-950 p-6 mb-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <DollarSign className="w-4 h-4 text-[#FF0000]" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Economic Performance</h3>
                                </div>

                                {/* P&L Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                    {[
                                        { label: 'Total Revenue', value: formatCurrency(econHistory.totals.totalRevenue), color: 'text-green-500' },
                                        { label: 'Gas Costs', value: `-${formatCurrency(econHistory.totals.totalGasCost)}`, color: 'text-red-500' },
                                        { label: 'Net Profit', value: formatCurrency(econHistory.totals.netProfit), color: econHistory.totals.netProfit >= 0 ? 'text-green-500' : 'text-red-500' },
                                        { label: 'Active Days', value: econHistory.totals.totalDays, color: 'text-[#0066CC]' },
                                    ].map(stat => (
                                        <div key={stat.label} className="bg-gray-50 dark:bg-white/5 p-4">
                                            <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-1 font-bold">{stat.label}</div>
                                            <div className={cn('text-lg font-extrabold font-mono', stat.color)}>{stat.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Revenue vs Gas Chart */}
                                {econHistory.history.length > 0 && (
                                    <div className="h-52 mb-6">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={econHistory.history.slice(-30)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                                                <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#888' }} />
                                                <YAxis tick={{ fontSize: 9, fill: '#888' }} tickFormatter={v => `$${formatNumber(v)}`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 11 }}
                                                    formatter={(value: number | undefined) => [`$${formatNumber(value ?? 0)}`, '']}
                                                />
                                                <Area type="monotone" dataKey="totalRevenueUsd" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Revenue" />
                                                <Area type="monotone" dataKey="totalGasCostUsd" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} name="Gas Cost" />
                                                <Line type="monotone" dataKey="netProfitUsd" stroke="#FFCC00" strokeWidth={2} dot={false} name="Net Profit" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Intent Type Breakdown */}
                                {econHistory.intentBreakdown.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Intent Type Breakdown</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {econHistory.intentBreakdown.map((ib: any) => (
                                                <div key={ib.intentType} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 px-3 py-2">
                                                    <span className="text-xs font-bold uppercase text-black dark:text-zinc-200">{ib.intentType}</span>
                                                    <div className="text-right">
                                                        <span className="font-mono text-xs text-gray-500">{formatNumber(ib.count)}</span>
                                                        <span className="font-mono text-[10px] text-gray-400 ml-2">{formatCurrency(ib.totalVolumeUsd)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── Recent Transactions ─── */}
                        <div className="swiss-border bg-white dark:bg-zinc-950">
                            <div className="p-6 pb-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <Wallet className="w-4 h-4" />
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Recent Transactions</h3>
                                </div>
                            </div>
                            <TransactionTable
                                searchQuery={address}
                                onTxClick={onTxClick}
                                onSolverClick={(addr) => addr !== address && onBack()}
                                hideHeader={true}
                                compact={true}
                            />
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    )
}

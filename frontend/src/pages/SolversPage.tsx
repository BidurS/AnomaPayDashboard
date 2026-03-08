import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, TrendingUp, BarChart3, Zap, Users, DollarSign, ArrowRight, Search, Target, Percent } from 'lucide-react'
import { useSolvers, useSolverEconomics, useIntentTypes, type SolverEconEntry } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatNumber, shortenAddress, cn, formatCurrency } from '../lib/utils'
import { SEO } from '../components/SEO'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ─── Swiss-style Identicon ───
const SwissIdenticon = ({ address, size = 32 }: { address: string; size?: number }) => {
    const seed = parseInt(address.slice(2, 10), 16)
    const colors = ['#FF0000', '#000000', '#0066CC', '#FFCC00', '#333333']
    const color = colors[seed % colors.length]
    return (
        <div className="overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: 0 }}>
            <svg width={size} height={size} viewBox="0 0 24 24">
                <rect x="0" y="0" width="24" height="24" fill={color} fillOpacity="0.1" />
                <rect x={seed % 10} y={seed % 10} width={10 + (seed % 10)} height={10 + (seed % 10)} fill={color} />
                <circle cx={12} cy={12} r={seed % 6} fill="white" fillOpacity="0.2" />
            </svg>
        </div>
    )
}

const generateSparklineData = (seed: string) => {
    const val = parseInt(seed.slice(2, 6), 16)
    return Array.from({ length: 10 }).map((_, i) => ({ value: Math.abs(Math.sin(val + i) * 50 + 50) }))
}

type Tab = 'leaderboard' | 'economics' | 'analytics'
const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { key: 'economics', label: 'Economics', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const TIME_FILTERS = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
]

const PIE_COLORS = ['#FF0000', '#0066CC', '#FFCC00', '#10B981', '#8B5CF6', '#F97316', '#EC4899', '#6B7280']

export default function SolversPage() {
    const { activeChain } = useChainContext()
    const chainId = activeChain?.id || 8453
    const [activeTab, setActiveTab] = useState<Tab>('leaderboard')
    const [days, setDays] = useState(30)
    const [search, setSearch] = useState('')

    // Fetch ALL solvers across chains (chainId=0), economics scoped to active chain
    const { solvers, loading: solversLoading } = useSolvers(0)
    const { economics, loading: econLoading } = useSolverEconomics(chainId, days)
    const { types: intentTypes, loading: typesLoading } = useIntentTypes(chainId)

    // Compute mastery scores for leaderboard
    const solversWithMastery = useMemo(() => {
        return solvers.map(s => {
            const usdVolume = s.total_volume_usd || 0
            const ethVolume = parseFloat(s.total_value_processed || '0') / 1e18
            const txWeight = s.tx_count * 5
            const masteryScore = (usdVolume / 10) + (ethVolume * 250) + txWeight
            return { ...s, masteryScore, sparklineData: generateSparklineData(s.address) }
        }).sort((a, b) => b.masteryScore - a.masteryScore)
    }, [solvers])

    // Filter by search
    const filteredSolvers = useMemo(() => {
        if (!search) return solversWithMastery
        const q = search.toLowerCase()
        return solversWithMastery.filter(s => s.address.toLowerCase().includes(q))
    }, [solversWithMastery, search])

    const filteredEconomics = useMemo(() => {
        if (!search) return economics
        const q = search.toLowerCase()
        return economics.filter(e => e.solverAddress.toLowerCase().includes(q))
    }, [economics, search])

    // Aggregate stats for hero
    const heroStats = useMemo(() => {
        const totalSolvers = solvers.length
        const totalVolume = solvers.reduce((s, v) => s + (v.total_volume_usd || 0), 0)
        const totalTxs = solvers.reduce((s, v) => s + (v.tx_count || 0), 0)
        const avgSuccess = economics.length > 0 ? economics.reduce((s, e) => s + (e.avgSuccessRate || 0), 0) / economics.length : 0
        return { totalSolvers, totalVolume, totalTxs, avgSuccess }
    }, [solvers, economics])

    const loading = solversLoading || econLoading

    return (
        <>
            <SEO title="Solver Marketplace" description="Competitive marketplace with economics, P&L data, and performance analytics for Anoma network solvers." />
            <section className="py-16 md:py-24 bg-gray-50 dark:bg-zinc-900/20 transition-colors duration-300 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* ─── Hero Strip ─── */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-16 bg-[#FF0000]" />
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter text-black dark:text-white leading-[0.9]">
                                    Solver<br />Marketplace
                                </h1>
                                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-2">
                                    Competitive analytics · P&L · Performance
                                </p>
                            </div>
                        </div>

                        {/* Stats Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                            {[
                                { label: 'Active Solvers', value: heroStats.totalSolvers, icon: Users, color: 'text-[#0066CC]' },
                                { label: 'Total Volume', value: formatCurrency(heroStats.totalVolume), icon: DollarSign, color: 'text-green-500' },
                                { label: 'Total Settlements', value: formatNumber(heroStats.totalTxs), icon: Zap, color: 'text-[#FFCC00]' },
                                { label: 'Avg Success Rate', value: `${(heroStats.avgSuccess * 100).toFixed(1)}%`, icon: Target, color: 'text-[#FF0000]' },
                            ].map(stat => (
                                <div key={stat.label} className="swiss-border bg-white dark:bg-zinc-950 p-4 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <stat.icon className={cn('w-4 h-4', stat.color)} />
                                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
                                    </div>
                                    <div className="text-xl md:text-2xl font-extrabold text-black dark:text-white">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ─── Controls: Tabs + Search + Time Filter ─── */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                            {/* Tabs */}
                            <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 w-full sm:w-auto">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial justify-center',
                                            activeTab === tab.key
                                                ? 'bg-black dark:bg-white text-white dark:text-black'
                                                : 'text-gray-500 hover:text-black dark:hover:text-white'
                                        )}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 sm:flex-initial">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search solver..."
                                        className="w-full sm:w-56 pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#FF0000] font-mono"
                                    />
                                </div>

                                {/* Time Filter */}
                                {activeTab !== 'leaderboard' && (
                                    <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1">
                                        {TIME_FILTERS.map(f => (
                                            <button
                                                key={f.days}
                                                onClick={() => setDays(f.days)}
                                                className={cn(
                                                    'px-3 py-1.5 text-xs font-bold transition-all',
                                                    days === f.days
                                                        ? 'bg-[#FF0000] text-white'
                                                        : 'text-gray-500 hover:text-black dark:hover:text-white'
                                                )}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* ─── Tab Content ─── */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'leaderboard' && (
                            <LeaderboardTab key="leaderboard" solvers={filteredSolvers} loading={loading} />
                        )}
                        {activeTab === 'economics' && (
                            <EconomicsTab key="economics" economics={filteredEconomics} loading={econLoading} days={days} />
                        )}
                        {activeTab === 'analytics' && (
                            <AnalyticsTab key="analytics" solvers={solversWithMastery} economics={economics} intentTypes={intentTypes} loading={typesLoading || econLoading} />
                        )}
                    </AnimatePresence>
                </div>
            </section>
        </>
    )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LEADERBOARD TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LeaderboardTab({ solvers, loading }: { solvers: any[]; loading: boolean }) {
    const topThree = solvers.slice(0, 3)

    if (loading) return <LoadingSpinner label="Syncing Solvers..." />
    if (!solvers.length) return <EmptyState label="No Solver Activity Detected" />

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Podium - Desktop */}
            <div className="hidden md:flex items-end justify-center gap-4 mb-16 px-4">
                {topThree[1] && <PodiumCard solver={topThree[1]} rank={2} tier="Silver" color="bg-gray-200" />}
                {topThree[0] && <PodiumCard solver={topThree[0]} rank={1} tier="Top Performer" color="bg-[#FFCC00]" isChampion />}
                {topThree[2] && <PodiumCard solver={topThree[2]} rank={3} tier="Bronze" color="bg-orange-300" />}
            </div>

            {/* Table */}
            <div className="swiss-border bg-white dark:bg-zinc-950 overflow-hidden transition-colors">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black dark:border-white/10 text-[10px] uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-white/5">
                            <th className="p-4 w-16 text-center">#</th>
                            <th className="p-4">Solver</th>
                            <th className="p-4 w-32 hidden md:table-cell">Trend</th>
                            <th className="p-4 text-right">Txs</th>
                            <th className="p-4 text-right hidden md:table-cell">USD Volume</th>
                            <th className="p-4 text-right text-black dark:text-zinc-100 font-bold">Efficiency</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {solvers.map((solver, i) => (
                            <motion.tr
                                key={solver.address}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 + i * 0.02 }}
                                className="group border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <td className="p-4 text-center font-bold text-gray-400">{i + 1}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <SwissIdenticon address={solver.address} size={28} />
                                        <Link to={`/solver/${solver.address}`} className="font-mono text-sm font-bold text-black dark:text-zinc-200 hover:text-[#0066CC] transition-colors">
                                            {shortenAddress(solver.address)}
                                        </Link>
                                        {i < 3 && <Zap className="w-3 h-3 text-[#FFCC00] fill-current hidden sm:block" />}
                                    </div>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <div className="h-8 w-24 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={solver.sparklineData}>
                                                <Line type="monotone" dataKey="value" stroke={i < 3 ? "#FF0000" : "#666"} strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-sm text-gray-600 dark:text-zinc-400">
                                    {formatNumber(solver.tx_count || 0)}
                                </td>
                                <td className="p-4 text-right font-mono text-sm text-gray-600 dark:text-zinc-400 hidden md:table-cell">
                                    {formatCurrency(solver.total_volume_usd || 0)}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={cn(
                                        "font-bold font-mono px-2 py-1 bg-gray-100 dark:bg-white/5 text-black dark:text-zinc-300",
                                        i < 3 && "bg-[#FF0000]/10 text-[#FF0000] dark:bg-[#FF0000]/20 dark:text-[#FF0000]"
                                    )}>
                                        {formatNumber(solver.masteryScore)}
                                    </span>
                                </td>
                                <td className="p-4"><ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" /></td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ECONOMICS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EconomicsTab({ economics, loading, days }: { economics: SolverEconEntry[]; loading: boolean; days: number }) {
    if (loading) return <LoadingSpinner label="Loading Economics..." />
    if (!economics.length) return <EmptyState label={`No Economic Data (${days}D window)`} />

    const topRoi = economics.reduce((best, e) => e.roi > best ? e.roi : best, 0)
    const totalProfit = economics.reduce((s, e) => s + e.netProfitUsd, 0)
    const totalRevenue = economics.reduce((s, e) => s + e.totalRevenueUsd, 0)

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-500' },
                    { label: 'Net Profit', value: formatCurrency(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? 'text-green-500' : 'text-red-500' },
                    { label: 'Best ROI', value: `${topRoi.toFixed(1)}%`, icon: Percent, color: 'text-[#FFCC00]' },
                    { label: 'Active Solvers', value: economics.length, icon: Users, color: 'text-[#0066CC]' },
                ].map(stat => (
                    <div key={stat.label} className="swiss-border bg-white dark:bg-zinc-950 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <stat.icon className={cn('w-4 h-4', stat.color)} />
                            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</span>
                        </div>
                        <div className="text-xl font-extrabold text-black dark:text-white">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Profit Bar Chart */}
            <div className="swiss-border bg-white dark:bg-zinc-950 p-6 mb-8">
                <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Net Profit by Solver ({days}D)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={economics.slice(0, 15)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                            <XAxis dataKey="solverAddress" tickFormatter={a => shortenAddress(a)} tick={{ fontSize: 10, fill: '#888' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `$${formatNumber(v)}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }}
                                formatter={(value: number | undefined) => [`$${formatNumber(value ?? 0)}`, '']}
                                labelFormatter={l => shortenAddress(l as string)}
                            />
                            <Bar dataKey="netProfitUsd" name="Net Profit" fill="#FF0000" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Economics Table */}
            <div className="swiss-border bg-white dark:bg-zinc-950 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b-2 border-black dark:border-white/10 text-[10px] uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-white/5">
                            <th className="p-4 w-12">#</th>
                            <th className="p-4">Solver</th>
                            <th className="p-4 text-right">Intents</th>
                            <th className="p-4 text-right">Revenue</th>
                            <th className="p-4 text-right">Gas Cost</th>
                            <th className="p-4 text-right font-bold text-black dark:text-zinc-100">Net Profit</th>
                            <th className="p-4 text-right">ROI</th>
                            <th className="p-4 text-right">Success</th>
                            <th className="p-4 text-right hidden lg:table-cell">Active Days</th>
                            <th className="p-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {economics.map((e, i) => (
                            <motion.tr
                                key={e.solverAddress}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="group border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <td className="p-4 font-bold text-gray-400 text-center">{e.rank}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <SwissIdenticon address={e.solverAddress} size={24} />
                                        <Link to={`/solver/${e.solverAddress}`} className="font-mono text-sm font-bold text-black dark:text-zinc-200 hover:text-[#0066CC] transition-colors">
                                            {shortenAddress(e.solverAddress)}
                                        </Link>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-sm text-gray-600 dark:text-zinc-400">{formatNumber(e.totalIntentsSolved)}</td>
                                <td className="p-4 text-right font-mono text-sm text-green-600 dark:text-green-400">
                                    {formatCurrency(e.totalRevenueUsd)}
                                </td>
                                <td className="p-4 text-right font-mono text-sm text-red-500 dark:text-red-400">
                                    -{formatCurrency(e.totalGasCostUsd)}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={cn(
                                        "font-bold font-mono px-2 py-1",
                                        e.netProfitUsd >= 0
                                            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                            : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                                    )}>
                                        {e.netProfitUsd >= 0 ? '+' : ''}{formatCurrency(e.netProfitUsd)}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-mono text-sm">
                                    <span className={cn(e.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                                        {e.roi.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                                            <div className="h-full bg-[#FF0000]" style={{ width: `${(e.avgSuccessRate * 100)}%` }} />
                                        </div>
                                        <span className="font-mono text-xs text-gray-500">{(e.avgSuccessRate * 100).toFixed(0)}%</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono text-xs text-gray-500 hidden lg:table-cell">{e.activeDays}d</td>
                                <td className="p-4"><ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" /></td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ANALYTICS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnalyticsTab({ solvers, economics, intentTypes, loading }: {
    solvers: any[];
    economics: SolverEconEntry[];
    intentTypes: { intentType: string; count: number; totalVolumeUsd: number; avgGasCostUsd: number; shieldedCount: number }[];
    loading: boolean;
}) {
    if (loading) return <LoadingSpinner label="Loading Analytics..." />

    // Volume distribution among solvers (top 10)
    const volumeData = solvers.slice(0, 10).map(s => ({
        name: shortenAddress(s.address),
        volume: s.total_volume_usd || 0,
        txs: s.tx_count || 0,
    }))

    // ROI distribution
    const roiData = economics.slice(0, 10).map(e => ({
        name: shortenAddress(e.solverAddress),
        roi: parseFloat(e.roi.toFixed(1)),
        profit: e.netProfitUsd,
    }))

    // Intent type distribution for pie chart
    const typeData = intentTypes.map(t => ({
        name: t.intentType.charAt(0).toUpperCase() + t.intentType.slice(1),
        value: t.count,
        volume: t.totalVolumeUsd,
    }))

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Distribution */}
                <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Volume Distribution (Top 10)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={volumeData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `$${formatNumber(v)}`} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888' }} width={55} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }}
                                    formatter={(value: number | undefined) => [`$${formatNumber(value ?? 0)}`, 'Volume']}
                                />
                                <Bar dataKey="volume" fill="#0066CC" radius={[0, 2, 2, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Intent Type Breakdown */}
                <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Intent Type Distribution</h3>
                    <div className="h-64 flex items-center">
                        {typeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={{ stroke: '#666', strokeWidth: 1 }}
                                    >
                                        {typeData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }}
                                        formatter={(value: number | undefined, name: string | undefined) => [formatNumber(value ?? 0), name ?? '']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400 text-sm text-center w-full">No intent data available</p>
                        )}
                    </div>
                </div>

                {/* ROI Comparison */}
                <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">ROI Comparison (Top 10)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={roiData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `${v}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 0, fontSize: 12 }}
                                    formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'ROI']}
                                />
                                <Bar dataKey="roi" fill="#FFCC00" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Solver Performance Summary */}
                <div className="swiss-border bg-white dark:bg-zinc-950 p-6">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Performance Summary</h3>
                    <div className="space-y-3">
                        {economics.slice(0, 8).map((e, i) => (
                            <div key={e.solverAddress} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                                <SwissIdenticon address={e.solverAddress} size={24} />
                                <span className="font-mono text-sm text-black dark:text-zinc-200 flex-1 truncate">{shortenAddress(e.solverAddress)}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                        <div className="text-[9px] uppercase text-gray-400">Profit</div>
                                        <div className={cn('font-mono text-xs font-bold', e.netProfitUsd >= 0 ? 'text-green-500' : 'text-red-500')}>
                                            {e.netProfitUsd >= 0 ? '+' : ''}{formatCurrency(e.netProfitUsd)}
                                        </div>
                                    </div>
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                                        <div className="h-full bg-[#FF0000]" style={{ width: `${Math.min(e.avgSuccessRate * 100, 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Shared Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PodiumCard({ solver, rank, tier, color, isChampion }: { solver: any; rank: number; tier: string; color: string; isChampion?: boolean }) {
    return (
        <div className={cn("flex flex-col items-center w-full group", isChampion ? "max-w-sm z-10 -mt-12" : "max-w-xs order-" + (rank === 2 ? '1' : '3'))}>
            <div className={cn("mb-4 relative", isChampion && "mb-6")}>
                <SwissIdenticon address={solver.address} size={isChampion ? 96 : 64} />
                <div className={cn(
                    "absolute -bottom-3 -right-3 text-black flex items-center justify-center font-bold border-2 border-white",
                    color,
                    isChampion ? "w-10 h-10 text-lg -bottom-4 -right-4 border-4" : "w-8 h-8 text-sm"
                )}>
                    {rank}
                </div>
                {isChampion && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#FFCC00] animate-bounce">
                        <Trophy className="w-8 h-8 fill-current" />
                    </div>
                )}
            </div>
            <div className={cn(
                "w-full p-6 relative top-0 group-hover:-top-2 transition-all duration-300",
                isChampion
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-xl shadow-black/20 p-8"
                    : "bg-white dark:bg-zinc-900 border border-black dark:border-white/10"
            )}>
                <div className={cn("h-1 w-full absolute top-0 left-0", isChampion ? "h-1.5 bg-[#FFCC00]" : color)} />
                <Link to={`/solver/${solver.address}`} className={cn(
                    "font-mono font-bold text-lg hover:underline mb-1 block truncate text-center",
                    isChampion ? "" : "text-black dark:text-zinc-100 hover:text-[#FF0000]"
                )}>
                    {shortenAddress(solver.address)}
                </Link>
                <div className={cn(
                    "text-center text-xs uppercase font-bold tracking-wider mb-4",
                    isChampion ? "text-gray-400 dark:text-gray-600 mb-6" : "text-gray-500"
                )}>{tier}</div>
                <div className={cn(
                    "grid grid-cols-2 gap-2 text-center border-t pt-4",
                    isChampion ? "gap-4 border-gray-800 dark:border-gray-200 pt-6" : "border-gray-100 dark:border-white/10"
                )}>
                    <div>
                        <div className={cn("text-[10px] uppercase", isChampion ? "text-gray-400 dark:text-gray-500" : "text-gray-400")}>Mastery</div>
                        <div className={cn("font-bold", isChampion ? "text-2xl text-[#FFCC00]" : "text-lg text-black dark:text-zinc-200")}>{formatNumber(solver.masteryScore)}</div>
                    </div>
                    <div>
                        <div className={cn("text-[10px] uppercase", isChampion ? "text-gray-400 dark:text-gray-500" : "text-gray-400")}>USD Volume</div>
                        <div className={cn("font-bold", isChampion ? "text-lg" : "text-sm text-black dark:text-zinc-200")}>{formatCurrency(solver.total_volume_usd || 0)}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LoadingSpinner({ label }: { label: string }) {
    return (
        <div className="py-32 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">{label}</span>
        </div>
    )
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="py-24 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 uppercase tracking-widest text-sm">{label}</p>
        </div>
    )
}

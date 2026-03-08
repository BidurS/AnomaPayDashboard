import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChainContext } from '../context/ChainContext'
import { useIntents, useIntentTypes, useLifecycleFunnel, usePlatformOverview, useSolverEconomics, useDemandHeatmap } from '../lib/api'
import { SEO } from '../components/SEO'
import {
    Activity, ArrowUpRight, Shield, Zap, Filter, ChevronLeft, ChevronRight,
    TrendingUp, DollarSign, Flame, BarChart3, Clock, Layers
} from 'lucide-react'

const INTENT_TYPE_COLORS: Record<string, string> = {
    swap: '#FF4444',
    bridge: '#4488FF',
    resource: '#44FF88',
    discovery: '#FFAA44',
    application: '#AA44FF',
    external: '#FF44AA',
    unknown: '#888888',
}

const INTENT_TYPE_ICONS: Record<string, string> = {
    swap: '🔄', bridge: '🌉', resource: '📦', discovery: '🔍',
    application: '📱', external: '🌐', unknown: '❓',
}

function formatUsd(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toFixed(2)}`
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toLocaleString()
}

function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        settled: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        matched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        failed: 'bg-red-500/20 text-red-400 border-red-500/30',
        expired: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.expired}`}>
            {status}
        </span>
    )
}

function TypeBadge({ type }: { type: string }) {
    return (
        <span className="flex items-center gap-1 text-xs font-bold uppercase" style={{ color: INTENT_TYPE_COLORS[type] || '#888' }}>
            <span>{INTENT_TYPE_ICONS[type] || '❓'}</span> {type}
        </span>
    )
}

// ─── Overview Cards ──────────────────────────────────────

function OverviewCards({ chainId }: { chainId: number }) {
    const { overview, loading } = usePlatformOverview(chainId)
    if (loading || !overview) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-black dark:border-white/10">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 border-r border-black dark:border-white/10 last:border-r-0 animate-pulse">
                        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
                        <div className="h-8 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                ))}
            </div>
        )
    }

    const cards = [
        { label: 'Total Intents', value: formatNumber(overview.allTime.totalIntents), sub: `${overview.last24h.intentCount} / 24h`, icon: <Zap className="w-4 h-4" />, accent: '#FF0000' },
        { label: 'Total Volume', value: formatUsd(overview.allTime.totalVolumeUsd), sub: `${formatUsd(overview.last24h.volumeUsd)} / 24h`, icon: <DollarSign className="w-4 h-4" />, accent: '#44FF88' },
        { label: 'Unique Solvers', value: String(overview.allTime.uniqueSolvers), sub: `${overview.last24h.uniqueSolvers} active / 24h`, icon: <Activity className="w-4 h-4" />, accent: '#4488FF' },
        { label: 'Shielded', value: `${overview.allTime.shieldedPercentage}%`, sub: `${formatNumber(overview.allTime.shieldedIntents)} intents`, icon: <Shield className="w-4 h-4" />, accent: '#AA44FF' },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-black dark:border-white/10">
            {cards.map((c, i) => (
                <div key={i} className="p-6 border-r border-black dark:border-white/10 last:border-r-0 relative group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: c.accent }} />
                    <div className="flex items-center gap-2 mb-3">
                        <span style={{ color: c.accent }}>{c.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{c.label}</span>
                    </div>
                    <div className="font-mono-swiss text-2xl md:text-3xl font-black tracking-tighter">{c.value}</div>
                    <div className="text-xs text-zinc-500 mt-1 font-medium">{c.sub}</div>
                </div>
            ))}
        </div>
    )
}

// ─── Intent Type Distribution ────────────────────────────

function IntentTypeChart({ chainId }: { chainId: number }) {
    const { types, loading } = useIntentTypes(chainId)
    if (loading) return <div className="p-6 animate-pulse"><div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded" /></div>

    const total = types.reduce((s, t) => s + t.count, 0)
    if (total === 0) return <div className="p-6 text-zinc-500 text-sm">No intent data yet</div>

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-[#FF0000]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Intent Types</h3>
            </div>
            <div className="space-y-3">
                {types.map(t => {
                    const pct = (t.count / total * 100)
                    return (
                        <div key={t.intentType}>
                            <div className="flex justify-between items-center mb-1">
                                <TypeBadge type={t.intentType} />
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-zinc-500 font-mono">{formatUsd(t.totalVolumeUsd)}</span>
                                    <span className="text-xs font-bold font-mono">{t.count}</span>
                                </div>
                            </div>
                            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%`, background: INTENT_TYPE_COLORS[t.intentType] || '#888' }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Lifecycle Funnel ────────────────────────────────────

function LifecycleFunnelChart({ chainId }: { chainId: number }) {
    const { funnel, loading } = useLifecycleFunnel(chainId)
    if (loading) return <div className="p-6 animate-pulse"><div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded" /></div>

    const statusOrder = ['pending', 'matched', 'settling', 'settled', 'failed', 'expired']
    const ordered = statusOrder.map(s => funnel.find(f => f.status === s) || { status: s, count: 0, totalVolumeUsd: 0 })
    const max = Math.max(...ordered.map(f => f.count), 1)

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Flame className="w-5 h-5 text-[#FF0000]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Lifecycle Funnel</h3>
            </div>
            <div className="space-y-2">
                {ordered.filter(f => f.count > 0).map(f => (
                    <div key={f.status} className="flex items-center gap-3">
                        <StatusBadge status={f.status} />
                        <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden relative">
                            <div
                                className="h-full rounded transition-all duration-700"
                                style={{
                                    width: `${(f.count / max * 100)}%`,
                                    background: f.status === 'settled' ? '#22C55E' : f.status === 'failed' ? '#EF4444' : '#3B82F6'
                                }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold">
                                {f.count.toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Demand Heatmap ──────────────────────────────────────

function DemandHeatmap({ chainId }: { chainId: number }) {
    const { heatmap, loading } = useDemandHeatmap(chainId)
    if (loading) return <div className="p-6 animate-pulse"><div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded" /></div>

    const max = Math.max(...heatmap.map(h => h.count), 1)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const grid = Array.from({ length: 7 }, (_, d) =>
        Array.from({ length: 24 }, (_, h) => {
            const cell = heatmap.find(c => c.dayOfWeek === d && c.hourOfDay === h)
            return cell?.count || 0
        })
    )

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Clock className="w-5 h-5 text-[#FF0000]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Demand Heatmap</h3>
            </div>
            {heatmap.length === 0 ? (
                <div className="text-zinc-500 text-sm">No activity data yet</div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[500px]">
                        <div className="flex gap-0.5 mb-1">
                            <div className="w-8" />
                            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                                <div key={h} className="text-[8px] text-zinc-500 font-mono" style={{ width: `${100 / 8}%` }}>{h}h</div>
                            ))}
                        </div>
                        {grid.map((row, d) => (
                            <div key={d} className="flex items-center gap-0.5 mb-0.5">
                                <div className="w-8 text-[10px] font-bold text-zinc-400">{days[d]}</div>
                                <div className="flex-1 flex gap-0.5">
                                    {row.map((count, h) => {
                                        const intensity = count / max
                                        return (
                                            <div
                                                key={h}
                                                className="flex-1 h-4 rounded-sm transition-colors"
                                                style={{
                                                    background: intensity > 0 ? `rgba(255, 0, 0, ${0.1 + intensity * 0.8})` : 'rgba(128, 128, 128, 0.1)'
                                                }}
                                                title={`${days[d]} ${h}:00 — ${count} intents`}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Solver Economics Leaderboard ─────────────────────────

function SolverEconomicsTable({ chainId }: { chainId: number }) {
    const { economics, loading } = useSolverEconomics(chainId)
    const navigate = useNavigate()

    if (loading) return <div className="p-6 animate-pulse"><div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded" /></div>

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-[#FF0000]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Solver P&L Leaderboard</h3>
            </div>
            {economics.length === 0 ? (
                <div className="text-zinc-500 text-sm">No economics data yet — lifecycle engine will populate after next sync cycle</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b-2 border-black dark:border-white/20">
                                <th className="text-left py-2 font-black uppercase tracking-wider">#</th>
                                <th className="text-left py-2 font-black uppercase tracking-wider">Solver</th>
                                <th className="text-right py-2 font-black uppercase tracking-wider">Intents</th>
                                <th className="text-right py-2 font-black uppercase tracking-wider">Revenue</th>
                                <th className="text-right py-2 font-black uppercase tracking-wider">Gas Cost</th>
                                <th className="text-right py-2 font-black uppercase tracking-wider">Net P&L</th>
                                <th className="text-right py-2 font-black uppercase tracking-wider">ROI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {economics.slice(0, 10).map(s => (
                                <tr
                                    key={s.solverAddress}
                                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/solver/${s.solverAddress}`)}
                                >
                                    <td className="py-3 font-mono font-bold">{s.rank}</td>
                                    <td className="py-3 font-mono text-[11px]">{s.solverAddress.slice(0, 6)}…{s.solverAddress.slice(-4)}</td>
                                    <td className="py-3 text-right font-mono font-bold">{s.totalIntentsSolved}</td>
                                    <td className="py-3 text-right font-mono text-emerald-500">{formatUsd(s.totalRevenueUsd)}</td>
                                    <td className="py-3 text-right font-mono text-red-400">{formatUsd(s.totalGasCostUsd)}</td>
                                    <td className={`py-3 text-right font-mono font-bold ${s.netProfitUsd >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {s.netProfitUsd >= 0 ? '+' : ''}{formatUsd(s.netProfitUsd)}
                                    </td>
                                    <td className={`py-3 text-right font-mono ${s.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {s.roi.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// ─── Intent Table ────────────────────────────────────────

function IntentTable({ chainId }: { chainId: number }) {
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const [filter, setFilter] = useState<{ status?: string; type?: string; shielded?: string }>({})
    const [showFilters, setShowFilters] = useState(false)

    const { intents, pagination, loading } = useIntents(chainId, { ...filter, page, limit: 20 })

    return (
        <div className="border-t border-black dark:border-white/10">
            {/* Filter bar */}
            <div className="p-4 border-b border-black dark:border-white/10 flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn-swiss text-xs px-3 py-2 flex items-center gap-2"
                >
                    <Filter className="w-3 h-3" /> Filters
                </button>
                {Object.entries(filter).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1 text-[10px] font-bold uppercase flex items-center gap-1">
                        {k}: {v}
                        <button onClick={() => setFilter(f => ({ ...f, [k]: undefined }))} className="text-red-500 ml-1">×</button>
                    </span>
                ))}
                <span className="text-[10px] text-zinc-500 font-mono ml-auto">
                    {pagination.total.toLocaleString()} intents
                </span>
            </div>

            {showFilters && (
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-wrap gap-2">
                    {['settled', 'pending', 'failed', 'expired'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setFilter(f => ({ ...f, status: f.status === s ? undefined : s })); setPage(1) }}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${filter.status === s ? 'bg-[#FF0000] text-white border-[#FF0000]' : 'border-zinc-300 dark:border-zinc-700 hover:border-[#FF0000]'
                                }`}
                        >{s}</button>
                    ))}
                    <div className="w-px bg-zinc-300 dark:bg-zinc-700" />
                    {['swap', 'bridge', 'resource', 'discovery', 'application'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setFilter(f => ({ ...f, type: f.type === t ? undefined : t })); setPage(1) }}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${filter.type === t ? 'bg-[#FF0000] text-white border-[#FF0000]' : 'border-zinc-300 dark:border-zinc-700 hover:border-[#FF0000]'
                                }`}
                        >{INTENT_TYPE_ICONS[t]} {t}</button>
                    ))}
                    <div className="w-px bg-zinc-300 dark:bg-zinc-700" />
                    <button
                        onClick={() => { setFilter(f => ({ ...f, shielded: f.shielded === '1' ? undefined : '1' })); setPage(1) }}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${filter.shielded === '1' ? 'bg-[#AA44FF] text-white border-[#AA44FF]' : 'border-zinc-300 dark:border-zinc-700 hover:border-[#AA44FF]'
                            }`}
                    ><Shield className="w-3 h-3 inline mr-1" />Shielded</button>
                </div>
            )}

            {/* Table */}
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b-2 border-black dark:border-white/20 bg-zinc-50 dark:bg-zinc-900/30">
                            <th className="text-left p-3 font-black uppercase tracking-wider">Type</th>
                            <th className="text-left p-3 font-black uppercase tracking-wider">Status</th>
                            <th className="text-left p-3 font-black uppercase tracking-wider">Tx Hash</th>
                            <th className="text-left p-3 font-black uppercase tracking-wider">Solver</th>
                            <th className="text-right p-3 font-black uppercase tracking-wider">Volume</th>
                            <th className="text-right p-3 font-black uppercase tracking-wider">Gas</th>
                            <th className="text-right p-3 font-black uppercase tracking-wider">Payloads</th>
                            <th className="text-right p-3 font-black uppercase tracking-wider">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && intents.length === 0 ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                                    {[...Array(8)].map((_, j) => (
                                        <td key={j} className="p-3"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-16" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : intents.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center text-zinc-500">
                                    <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold uppercase tracking-wider">No intents found</p>
                                    <p className="text-[10px] mt-1">Lifecycle engine will populate after next indexer sync</p>
                                </td>
                            </tr>
                        ) : intents.map(intent => (
                            <tr
                                key={intent.id}
                                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors"
                                onClick={() => navigate(`/tx/${intent.txHash}`)}
                            >
                                <td className="p-3"><TypeBadge type={intent.intentType} /></td>
                                <td className="p-3"><StatusBadge status={intent.status} /></td>
                                <td className="p-3 font-mono text-[11px]">{intent.txHash.slice(0, 10)}…</td>
                                <td className="p-3 font-mono text-[11px] text-zinc-500">
                                    {intent.solver ? `${intent.solver.slice(0, 6)}…${intent.solver.slice(-4)}` : '—'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                    {intent.inputValueUsd > 0 ? formatUsd(intent.inputValueUsd) : '—'}
                                </td>
                                <td className="p-3 text-right font-mono text-zinc-500">
                                    {intent.gasUsed ? intent.gasUsed.toLocaleString() : '—'}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="font-mono font-bold">{intent.payloadCount}</span>
                                        {intent.isShielded === 1 && <Shield className="w-3 h-3 text-purple-400" />}
                                        {intent.hasForwarderCalls === 1 && <ArrowUpRight className="w-3 h-3 text-blue-400" />}
                                    </div>
                                </td>
                                <td className="p-3 text-right text-zinc-500 font-mono text-[10px]">
                                    {intent.createdAt ? timeAgo(intent.createdAt) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
                {loading && intents.length === 0 ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 border-b border-zinc-100 dark:border-zinc-800 animate-pulse">
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                        </div>
                    ))
                ) : intents.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p className="font-bold uppercase tracking-wider text-xs">No intents found</p>
                    </div>
                ) : intents.map(intent => (
                    <div
                        key={intent.id}
                        className="p-4 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-900/50 cursor-pointer"
                        onClick={() => navigate(`/tx/${intent.txHash}`)}
                    >
                        {/* Row 1: Type + Status + Time */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TypeBadge type={intent.intentType} />
                                <StatusBadge status={intent.status} />
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                {intent.createdAt ? timeAgo(intent.createdAt) : '—'}
                            </span>
                        </div>
                        {/* Row 2: Hash */}
                        <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-1">
                            <span>{intent.txHash.slice(0, 12)}…{intent.txHash.slice(-6)}</span>
                            <ArrowUpRight className="w-3 h-3 text-[#FF0000]" />
                        </div>
                        {/* Row 3: Solver + Volume */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-zinc-500">Solver:</span>
                                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                    {intent.solver ? `${intent.solver.slice(0, 6)}…${intent.solver.slice(-4)}` : '—'}
                                </span>
                                {intent.isShielded === 1 && <Shield className="w-3 h-3 text-purple-400" />}
                            </div>
                            <span className="font-mono font-bold text-xs">
                                {intent.inputValueUsd > 0 ? formatUsd(intent.inputValueUsd) : '—'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-mono">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="btn-swiss text-xs px-3 py-1.5 disabled:opacity-30"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="btn-swiss text-xs px-3 py-1.5 disabled:opacity-30"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────

export function IntentExplorerPage() {
    const { activeChain } = useChainContext()
    const chainId = activeChain?.id || 8453

    return (
        <>
            <SEO
                title="Intent Explorer — AnomaScan"
                description="Explore the full lifecycle of Anoma intents: types, settlement status, solver economics, and demand analytics."
            />

            {/* Header */}
            <div className="border-b border-black dark:border-white/10 py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-[#FF0000]" />
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Intent Explorer</h1>
                    </div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold ml-5">
                        Phase 1 Lifecycle Engine — Real-time intent tracking & solver analytics
                    </p>
                </div>
            </div>

            {/* Overview Cards */}
            <OverviewCards chainId={chainId} />

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-black dark:border-white/10">
                <div className="border-r border-black dark:border-white/10">
                    <IntentTypeChart chainId={chainId} />
                </div>
                <div className="border-r border-black dark:border-white/10">
                    <LifecycleFunnelChart chainId={chainId} />
                </div>
                <div>
                    <DemandHeatmap chainId={chainId} />
                </div>
            </div>

            {/* Solver Economics */}
            <div className="border-b border-black dark:border-white/10">
                <SolverEconomicsTable chainId={chainId} />
            </div>

            {/* Intent Table */}
            <IntentTable chainId={chainId} />
        </>
    )
}

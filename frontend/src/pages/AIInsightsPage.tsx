/**
 * AIInsightsPage — Phase 2 Intelligence Dashboard
 *
 * Dedicated AI analytics page with prediction accuracy,
 * cross-chain Sankey diagram, annotation feed, and route analysis.
 */
import { motion } from 'framer-motion';
import { useChainContext } from '../context/ChainContext';
import { useAIInsights, useCrossChainFlows } from '../lib/api';
import { SEO } from '../components/SEO';
import {
    Brain, Activity, TrendingUp, Target, Zap, AlertTriangle,
    CheckCircle, Shield, GitBranch, Timer, BarChart3
} from 'lucide-react';

// ─── Chain Label Map ─────────────────────────────────────

const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum',
    10: 'Optimism',
    8453: 'Base',
    42161: 'Arbitrum',
};

const CHAIN_COLORS: Record<number, string> = {
    1: '#627EEA',
    10: '#FF0420',
    8453: '#0052FF',
    42161: '#28A0F0',
};

// ─── Accuracy Gauge ──────────────────────────────────────

function AccuracyGauge({ accuracy, totalSimulations }: { accuracy: number; totalSimulations: number }) {
    const pct = accuracy * 100;
    const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';
    const gradientColor = pct >= 80 ? 'from-green-500 to-emerald-400' : pct >= 60 ? 'from-yellow-500 to-orange-400' : 'from-red-500 to-pink-400';

    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-cyan-400" />
                <h3 className="text-sm font-black tracking-wider uppercase">Prediction Accuracy</h3>
            </div>

            <div className="flex items-center gap-8">
                {/* Circular gauge */}
                <div className="relative w-28 h-28">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-black/5 dark:text-white/5" />
                        <motion.circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="url(#gauge-gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
                            initial={{ strokeDasharray: '0 264' }}
                            animate={{ strokeDasharray: `${pct * 2.64} ${264 - pct * 2.64}` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                        <defs>
                            <linearGradient id="gauge-gradient">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black ${color}`}>{pct.toFixed(0)}%</span>
                        <span className="text-[10px] text-black/40 dark:text-white/40 uppercase">accuracy</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 flex-1">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Total Simulations</p>
                        <p className="text-xl font-black text-black dark:text-white">{totalSimulations.toLocaleString()}</p>
                    </div>
                    <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full bg-gradient-to-r ${gradientColor} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, pct)}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Route Type Distribution ─────────────────────────────

function RouteTypeBreakdown({ routeTypes }: { routeTypes: { routeType: string; count: number; avgConfidence: number; avgRiskScore: number }[] }) {
    const total = routeTypes.reduce((s, r) => s + r.count, 0) || 1;

    const ROUTE_ICONS: Record<string, any> = {
        direct: Zap,
        'multi-hop': GitBranch,
        'cross-chain': Activity,
        internal: Shield,
        arbitrage: TrendingUp,
    };

    const ROUTE_COLORS: Record<string, string> = {
        direct: 'bg-cyan-500',
        'multi-hop': 'bg-purple-500',
        'cross-chain': 'bg-orange-500',
        internal: 'bg-green-500',
        arbitrage: 'bg-pink-500',
    };

    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-purple-400" />
                <h3 className="text-sm font-black tracking-wider uppercase">Route Distribution</h3>
            </div>

            {routeTypes.length === 0 ? (
                <p className="text-xs text-black/40 dark:text-white/40">No simulation data yet</p>
            ) : (
                <div className="space-y-3">
                    {routeTypes.map(rt => {
                        const Icon = ROUTE_ICONS[rt.routeType] || Activity;
                        const pct = (rt.count / total) * 100;
                        return (
                            <div key={rt.routeType}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Icon size={14} className="text-black/50 dark:text-white/50" />
                                        <span className="text-xs font-bold text-black dark:text-white capitalize">{rt.routeType}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
                                        <span>{rt.count} sims</span>
                                        <span>conf: {(rt.avgConfidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${ROUTE_COLORS[rt.routeType] || 'bg-gray-500'} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.6 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Cross-Chain Flow Visualization ──────────────────────

function CrossChainFlows({ flows }: { flows: { source: number; target: number; value: number; count: number }[] }) {
    if (flows.length === 0) {
        return (
            <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                    <GitBranch size={18} className="text-orange-400" />
                    <h3 className="text-sm font-black tracking-wider uppercase">Cross-Chain Flows</h3>
                </div>
                <p className="text-xs text-black/40 dark:text-white/40">No cross-chain correlations detected yet — correlation engine analyzes inter-chain patterns every 15 minutes.</p>
            </div>
        );
    }

    const maxVal = Math.max(...flows.map(f => f.value), 1);

    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
                <GitBranch size={18} className="text-orange-400" />
                <h3 className="text-sm font-black tracking-wider uppercase">Cross-Chain Flows</h3>
            </div>

            <div className="space-y-3">
                {flows.map((flow, i) => {
                    const sourceColor = CHAIN_COLORS[flow.source] || '#888';
                    const targetColor = CHAIN_COLORS[flow.target] || '#888';
                    const width = Math.max(10, (flow.value / maxVal) * 100);

                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3"
                        >
                            <span className="text-xs font-bold w-20 text-right" style={{ color: sourceColor }}>
                                {CHAIN_NAMES[flow.source] || `Chain ${flow.source}`}
                            </span>
                            <div className="flex-1 h-6 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 relative">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        background: `linear-gradient(90deg, ${sourceColor}, ${targetColor})`,
                                        width: `${width}%`,
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${width}%` }}
                                    transition={{ duration: 0.8 }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                    {flow.count} txs · ${flow.value.toFixed(0)}
                                </span>
                            </div>
                            <span className="text-xs font-bold w-20" style={{ color: targetColor }}>
                                {CHAIN_NAMES[flow.target] || `Chain ${flow.target}`}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Annotation Feed ─────────────────────────────────────

function AnnotationFeed({ annotations }: { annotations: any[] }) {
    const SEVERITY_STYLES: Record<string, string> = {
        critical: 'border-red-500/30 bg-red-500/5',
        warning: 'border-yellow-500/30 bg-yellow-500/5',
        info: 'border-blue-500/30 bg-blue-500/5',
    };

    const SEVERITY_ICONS: Record<string, any> = {
        critical: AlertTriangle,
        warning: AlertTriangle,
        info: CheckCircle,
    };

    return (
        <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
                <Brain size={18} className="text-pink-400" />
                <h3 className="text-sm font-black tracking-wider uppercase">AI Annotation Feed</h3>
            </div>

            {annotations.length === 0 ? (
                <p className="text-xs text-black/40 dark:text-white/40">No annotations yet — AI engine generates insights as intents are processed.</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {annotations.map((a: any, i: number) => {
                        const Icon = SEVERITY_ICONS[a.severity] || CheckCircle;
                        return (
                            <motion.div
                                key={a.id || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`p-3 rounded border ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
                            >
                                <div className="flex items-start gap-2">
                                    <Icon size={14} className={
                                        a.severity === 'critical' ? 'text-red-400' :
                                            a.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                    } />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-black dark:text-white">{a.title}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40">{a.annotationType}</span>
                                        </div>
                                        <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">{a.description}</p>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-black/30 dark:text-white/30">
                                            <span>{new Date(a.createdAt * 1000).toLocaleString()}</span>
                                            <span>conf: {(a.aiConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────

export default function AIInsightsPage() {
    const { activeChain } = useChainContext();
    const chainId = activeChain?.id ?? 8453;

    const { insights } = useAIInsights(chainId);
    const { flows } = useCrossChainFlows(30);

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
            <SEO title="AI Insights — AnomaScan | Gnoma Explorer" />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-10 bg-gradient-to-b from-purple-500 to-cyan-400 rounded-full" />
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-wider">AI INSIGHTS</h1>
                            <p className="text-sm text-black/50 dark:text-white/50 uppercase tracking-wider mt-1">
                                Phase 2 Intelligence Engine — Prediction analytics & cross-chain correlation
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                    {[
                        { icon: Target, label: 'Simulations', value: insights?.accuracy.totalSimulations || 0, color: 'text-cyan-400' },
                        { icon: CheckCircle, label: 'Avg Accuracy', value: `${((insights?.accuracy.avgAccuracy || 0) * 100).toFixed(0)}%`, color: 'text-green-400' },
                        { icon: Shield, label: 'High Confidence', value: insights?.accuracy.highConfidenceCount || 0, color: 'text-purple-400' },
                        { icon: AlertTriangle, label: 'Avg Risk', value: `${(insights?.accuracy.avgRiskScore || 50).toFixed(0)}/100`, color: 'text-yellow-400' },
                        { icon: Timer, label: 'Avg Duration', value: `${(insights?.accuracy.avgSimDurationMs || 0).toFixed(0)}ms`, color: 'text-pink-400' },
                    ].map(({ icon: Icon, label, value, color }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border border-black/10 dark:border-white/10 rounded-lg p-4 bg-gray-50 dark:bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-1">
                                <Icon size={12} className={color} /> {label}
                            </div>
                            <p className="text-lg font-black text-black dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Accuracy Gauge */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <AccuracyGauge
                            accuracy={insights?.accuracy.avgAccuracy || 0}
                            totalSimulations={insights?.accuracy.totalSimulations || 0}
                        />
                    </motion.div>

                    {/* Route Type Distribution */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                        <RouteTypeBreakdown routeTypes={insights?.routeTypes || []} />
                    </motion.div>

                    {/* Cross-Chain Flows */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
                        <CrossChainFlows flows={flows} />
                    </motion.div>

                    {/* Annotation Feed */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-2">
                        <AnnotationFeed annotations={insights?.recentAnnotations || []} />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

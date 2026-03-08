/**
 * IntentDetailPage — Phase 2 Intelligence Layer
 *
 * Full intent detail view with lifecycle timeline, resource viewer,
 * token transfers, simulation results, and AI annotations.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useChainContext } from '../context/ChainContext';
import {
    useIntentDetail,
    useIntentSimulation,
    type SimulationResult,
    type IntentAnnotation,
} from '../lib/api';
import { SEO } from '../components/SEO';
import {
    ArrowLeft, Clock, Shield, Zap, TrendingUp, AlertTriangle,
    CheckCircle, XCircle, Loader2, Activity, Brain, Route,
    ChevronDown, ChevronRight, ExternalLink, Box
} from 'lucide-react';
import { useState } from 'react';

// ─── Status / Type Badges ────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    matched: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    settling: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    settled: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_ICONS: Record<string, any> = {
    pending: Clock,
    matched: Activity,
    settling: Loader2,
    settled: CheckCircle,
    failed: XCircle,
    expired: Clock,
};

function StatusBadge({ status }: { status: string }) {
    const Icon = STATUS_ICONS[status] || Activity;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
            <Icon size={12} />
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        swap: 'bg-cyan-500/20 text-cyan-400',
        bridge: 'bg-orange-500/20 text-orange-400',
        transfer: 'bg-green-500/20 text-green-400',
        resource: 'bg-purple-500/20 text-purple-400',
        discovery: 'bg-pink-500/20 text-pink-400',
        application: 'bg-indigo-500/20 text-indigo-400',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase ${colors[type] || 'bg-gray-500/20 text-gray-400'}`}>
            {type}
        </span>
    );
}

// ─── Lifecycle Timeline ──────────────────────────────────

function LifecycleTimeline({ lifecycle, createdAt }: {
    lifecycle: any[];
    createdAt: number;
}) {
    const events = [
        { status: 'created', timestamp: createdAt, label: 'Intent Created' },
        ...lifecycle.map(e => ({
            status: e.toStatus,
            timestamp: e.timestamp,
            label: `${e.fromStatus} → ${e.toStatus}`,
            triggeredBy: e.triggeredBy,
            metadata: e.metadata,
        })),
    ];

    return (
        <div className="space-y-0">
            {events.map((event, i) => {
                const Icon = STATUS_ICONS[event.status] || Activity;
                const isLast = i === events.length - 1;
                return (
                    <div key={i} className="flex gap-4">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLast ? 'bg-red-500/20 border-2 border-red-500' : 'bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20'}`}>
                                <Icon size={14} className={isLast ? 'text-red-400' : 'text-black/60 dark:text-white/60'} />
                            </div>
                            {!isLast && <div className="w-px h-8 bg-black/10 dark:bg-white/10" />}
                        </div>
                        {/* Content */}
                        <div className={`pb-4 ${isLast ? '' : ''}`}>
                            <p className="text-sm font-bold">{event.label}</p>
                            <p className="text-xs text-black/50 dark:text-white/50 font-mono mt-0.5">
                                {new Date(event.timestamp * 1000).toLocaleString()}
                            </p>
                            {'triggeredBy' in event && event.triggeredBy && (
                                <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">by {event.triggeredBy.slice(0, 10)}…</p>
                            )}
                        </div>
                    </div>
                );
            })}
            {events.length === 1 && (
                <p className="text-xs text-black/40 dark:text-white/40 ml-12">Awaiting lifecycle transitions…</p>
            )}
        </div>
    );
}

// ─── Simulation Panel ────────────────────────────────────

function SimulationPanel({ simulations, annotations }: {
    simulations: SimulationResult[];
    annotations: IntentAnnotation[];
}) {
    const [expanded, setExpanded] = useState(false);

    if (simulations.length === 0 && annotations.length === 0) {
        return (
            <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                    <Brain size={18} className="text-purple-400" />
                    <h3 className="text-sm font-black tracking-wider uppercase">AI Simulation</h3>
                </div>
                <p className="text-xs text-black/40 dark:text-white/40">No simulation data yet — AI engine will analyze this intent during the next processing cycle.</p>
            </div>
        );
    }

    const latestSim = simulations[0];

    return (
        <div className="border border-purple-500/20 rounded-lg p-6 bg-purple-500/[0.03]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain size={18} className="text-purple-400" />
                    <h3 className="text-sm font-black tracking-wider uppercase">AI Simulation</h3>
                </div>
                {latestSim && (
                    <span className="text-xs text-black/40 dark:text-white/40 font-mono">
                        {latestSim.aiModel} · {latestSim.simulationDurationMs}ms
                    </span>
                )}
            </div>

            {latestSim && (
                <div className="space-y-4">
                    {/* Prediction metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MetricCard label="Route" value={latestSim.routeType} icon={<Route size={14} />} />
                        <MetricCard label="Output" value={`$${latestSim.predictedOutputUsd.toFixed(2)}`} icon={<TrendingUp size={14} />} />
                        <MetricCard label="Slippage" value={`${latestSim.predictedSlippage.toFixed(2)}%`} icon={<Activity size={14} />} />
                        <MetricCard
                            label="Risk"
                            value={`${latestSim.riskScore}/100`}
                            icon={<AlertTriangle size={14} />}
                            color={latestSim.riskScore > 70 ? 'text-red-400' : latestSim.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'}
                        />
                    </div>

                    {/* Confidence bar */}
                    <div>
                        <div className="flex justify-between text-xs text-black/50 dark:text-white/50 mb-1">
                            <span>Confidence</span>
                            <span>{(latestSim.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${latestSim.confidence * 100}%` }}
                                transition={{ duration: 0.8 }}
                            />
                        </div>
                    </div>

                    {/* Risk factors */}
                    {latestSim.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {latestSim.riskFactors.map((factor, i) => (
                                <span key={i} className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">
                                    ⚠ {factor}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* AI Reasoning (expandable) */}
                    {latestSim.aiReasoning && (
                        <div>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                AI Reasoning
                            </button>
                            {expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded text-xs text-black/60 dark:text-white/60 leading-relaxed font-mono"
                                >
                                    {latestSim.aiReasoning}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Prediction accuracy (if available) */}
                    {latestSim.predictionAccuracy !== null && (
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle size={12} className="text-green-400" />
                            <span className="text-black/50 dark:text-white/50">
                                Prediction accuracy: <span className="font-bold">{(latestSim.predictionAccuracy * 100).toFixed(1)}%</span>
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Annotations */}
            {annotations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-2">AI Annotations</h4>
                    <div className="space-y-2">
                        {annotations.map(a => (
                            <div key={a.id} className={`text-xs p-2 rounded border ${a.severity === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                                a.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
                                    'bg-blue-500/10 border-blue-500/20 text-blue-300'
                                }`}>
                                <span className="font-bold">{a.title}</span>
                                <span className="text-black/40 dark:text-white/40 ml-2">{a.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
    return (
        <div className="bg-black/5 dark:bg-white/5 rounded p-2.5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-black/40 dark:text-white/40 text-[10px] uppercase tracking-wider mb-1">
                {icon} {label}
            </div>
            <p className={`text-sm font-bold ${color || ''}`}>{value}</p>
        </div>
    );
}

// ─── Resource Viewer ─────────────────────────────────────

function ResourceViewer({ payloads }: { payloads: any[] }) {
    if (!payloads || payloads.length === 0) {
        return <p className="text-xs text-black/40 dark:text-white/40">No payload data available</p>;
    }

    return (
        <div className="space-y-2">
            {payloads.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <Box size={14} className="text-cyan-400" />
                        <span className="text-xs font-bold">{p.payloadType}</span>
                        <span className="text-xs text-black/40 dark:text-white/40">#{p.payloadIndex}</span>
                    </div>
                    {p.tag && <span className="text-xs font-mono text-black/30 dark:text-white/30">{p.tag.slice(0, 16)}…</span>}
                </div>
            ))}
        </div>
    );
}

// ─── Token Transfers Table ───────────────────────────────

function TransfersTable({ transfers }: { transfers: any[] }) {
    if (!transfers || transfers.length === 0) {
        return <p className="text-xs text-black/40 dark:text-white/40">No token transfers recorded</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-black/40 dark:text-white/40 uppercase tracking-wider border-b border-black/10 dark:border-white/10">
                        <th className="text-left py-2 font-bold">Token</th>
                        <th className="text-left py-2 font-bold">From</th>
                        <th className="text-left py-2 font-bold">To</th>
                        <th className="text-right py-2 font-bold">Amount</th>
                        <th className="text-right py-2 font-bold">USD</th>
                    </tr>
                </thead>
                <tbody>
                    {transfers.map((t: any, i: number) => (
                        <tr key={i} className="border-b border-black/5 dark:border-white/5">
                            <td className="py-2 font-bold">{t.tokenSymbol || 'UNKNOWN'}</td>
                            <td className="py-2 font-mono text-black/50 dark:text-white/50">{t.fromAddress?.slice(0, 8)}…</td>
                            <td className="py-2 font-mono text-black/50 dark:text-white/50">{t.toAddress?.slice(0, 8)}…</td>
                            <td className="py-2 text-right text-black/70 dark:text-white/70">{t.amountDisplay || '—'}</td>
                            <td className="py-2 text-right text-green-500 dark:text-green-400 font-bold">${(t.amountUsd || 0).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────

export default function IntentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeChain } = useChainContext();
    const chainId = activeChain?.id ?? 8453;

    const { intent: detail, loading } = useIntentDetail(chainId, id || '');
    const { simulations, annotations, loading: simLoading } = useIntentSimulation(id || '');

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center gap-4">
                <XCircle size={48} className="text-red-500" />
                <h1 className="text-xl font-black uppercase tracking-wider">Intent Not Found</h1>
                <p className="text-black/50 dark:text-white/50 text-sm">ID: {id}</p>
                <button onClick={() => navigate('/intents')} className="mt-4 btn-swiss text-sm">
                    ← Back to Explorer
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
            <SEO title={`Intent ${detail.txHash?.slice(0, 10)}… — AnomaScan`} />

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Back button */}
                <button
                    onClick={() => navigate('/intents')}
                    className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft size={16} /> Back to Intent Explorer
                </button>

                {/* Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02] mb-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-12 bg-red-500 rounded-full" />
                            <div>
                                <h1 className="text-lg font-black uppercase tracking-wider">Intent Detail</h1>
                                <p className="text-xs font-mono text-black/40 dark:text-white/40 mt-0.5">{detail.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TypeBadge type={detail.intentType} />
                            <StatusBadge status={detail.status} />
                            {detail.isShielded === 1 && (
                                <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                                    <Shield size={12} /> Shielded
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Volume</p>
                            <p className="text-lg font-black">${(detail.inputValueUsd || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Gas Cost</p>
                            <p className="text-lg font-black">${(detail.gasCostUsd || 0).toFixed(4)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Solver</p>
                            <p className="text-sm font-mono text-black/70 dark:text-white/70 truncate">{detail.solver || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">Block</p>
                            <p className="text-sm font-mono text-black/70 dark:text-white/70">#{detail.blockNumber}</p>
                        </div>
                    </div>

                    {/* Tx Hash link */}
                    <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex items-center gap-2">
                        <span className="text-xs text-black/40 dark:text-white/40">TX:</span>
                        <a
                            href={`https://basescan.org/tx/${detail.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                            {detail.txHash} <ExternalLink size={10} />
                        </a>
                    </div>
                </motion.div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column: Timeline + Resources */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Lifecycle Timeline */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={18} className="text-cyan-400" />
                                <h3 className="text-sm font-black tracking-wider uppercase">Lifecycle</h3>
                            </div>
                            <LifecycleTimeline
                                lifecycle={detail.lifecycle || []}
                                createdAt={detail.createdAt}
                            />
                        </motion.div>

                        {/* Payloads / Resources */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Box size={18} className="text-orange-400" />
                                <h3 className="text-sm font-black tracking-wider uppercase">Payloads</h3>
                                <span className="text-xs text-black/30 dark:text-white/30">({detail.payloads?.length || 0})</span>
                            </div>
                            <ResourceViewer payloads={detail.payloads || []} />
                        </motion.div>
                    </div>

                    {/* Right column: Simulation + Transfers */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* AI Simulation */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            {simLoading ? (
                                <div className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02] flex items-center gap-2">
                                    <Loader2 className="animate-spin text-purple-400" size={16} />
                                    <span className="text-xs text-black/50 dark:text-white/50">Loading simulation data…</span>
                                </div>
                            ) : (
                                <SimulationPanel simulations={simulations} annotations={annotations} />
                            )}
                        </motion.div>

                        {/* Token Transfers */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                            className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Zap size={18} className="text-yellow-400" />
                                <h3 className="text-sm font-black tracking-wider uppercase">Token Transfers</h3>
                                <span className="text-xs text-black/30 dark:text-white/30">({detail.tokenTransfers?.length || 0})</span>
                            </div>
                            <TransfersTable transfers={detail.tokenTransfers || []} />
                        </motion.div>

                        {/* Forwarder Calls */}
                        {detail.forwarderCalls && detail.forwarderCalls.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 }}
                                className="border border-black/10 dark:border-white/10 rounded-lg p-6 bg-gray-50 dark:bg-white/[0.02]"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <ExternalLink size={18} className="text-indigo-400" />
                                    <h3 className="text-sm font-black tracking-wider uppercase">Forwarder Calls</h3>
                                </div>
                                <div className="space-y-2">
                                    {detail.forwarderCalls.map((fc: any, i: number) => (
                                        <div key={i} className="text-xs p-2 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5">
                                            <span className="text-black/40 dark:text-white/40">Forwarder:</span>{' '}
                                            <span className="font-mono text-indigo-500 dark:text-indigo-400">{fc.untrustedForwarder?.slice(0, 20)}…</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Layers, Timer, Users, TrendingUp, ChevronRight,
    ArrowRightLeft, Zap, Package, Clock
} from 'lucide-react'
import { useMultiChainBatchAuctions, type Batch } from '../hooks/useBatchAuctions'
import { formatNumber } from '../lib/utils'

const CHAIN_META: Record<number, { name: string; icon: string; color: string }> = {
    1: { name: 'Ethereum', icon: '🔷', color: '#627EEA' },
    8453: { name: 'Base', icon: '🔵', color: '#0052FF' },
    10: { name: 'Optimism', icon: '🔴', color: '#FF0420' },
    42161: { name: 'Arbitrum', icon: '🔵', color: '#28A0F0' },
}

export default function BatchAuctionPage() {
    const { batches, stats, loading } = useMultiChainBatchAuctions()
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
    const [batchPhase, setBatchPhase] = useState<'collecting' | 'solving' | 'settled'>('collecting')
    const [countdown, setCountdown] = useState(30)

    // Simulate batch cycle animation
    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setBatchPhase(p => p === 'collecting' ? 'solving' : p === 'solving' ? 'settled' : 'collecting')
                    return 30
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (batchPhase === 'solving') {
            const t = setTimeout(() => {
                setBatchPhase('settled')
                setCountdown(30)
            }, 5000)
            return () => clearTimeout(t)
        } else if (batchPhase === 'settled') {
            const t = setTimeout(() => {
                setBatchPhase('collecting')
                setCountdown(30)
            }, 3000)
            return () => clearTimeout(t)
        }
    }, [batchPhase])

    return (
        <div className="min-h-screen">
            {/* Header */}
            <section className="py-12 md:py-16 px-4 md:px-6 bg-black dark:bg-zinc-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 swiss-grid-bg opacity-10 pointer-events-none" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-[#FF0000] flex items-center justify-center">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">
                                Batch Auctions
                            </h1>
                            <p className="text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400 mt-1">
                                CowSwap-Style Settlement Visualization
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                        Watch how ARM intents are collected, batched, and settled by competing solvers.
                        Transactions in the same block from the same solver form a batch — and opposing intents
                        create <span className="text-white font-bold">Coincidences of Wants (CoWs)</span> for gasless peer-to-peer settlement.
                    </p>
                </div>
            </section>

            {/* Live Batch Cycle */}
            <section className="py-10 px-6 border-b-4 border-black dark:border-white/10">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <Timer className="w-4 h-4 text-[#FF0000]" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Live Batch Cycle</span>
                    </div>

                    {/* Batch Phases */}
                    <div className="grid grid-cols-3 gap-0 border-2 border-black dark:border-white/10 mb-4 md:mb-6">
                        <BatchPhaseCard
                            active={batchPhase === 'collecting'}
                            icon={<Layers className="w-5 h-5" />}
                            label="Collecting Intents"
                            detail={batchPhase === 'collecting' ? `${countdown}s remaining` : 'Waiting'}
                        />
                        <BatchPhaseCard
                            active={batchPhase === 'solving'}
                            icon={<Zap className="w-5 h-5" />}
                            label="Solvers Competing"
                            detail={batchPhase === 'solving' ? 'Finding optimal settlement...' : 'Waiting'}
                        />
                        <BatchPhaseCard
                            active={batchPhase === 'settled'}
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Batch Settled"
                            detail={batchPhase === 'settled' ? 'On-chain ✓' : 'Waiting'}
                        />
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/5 overflow-hidden">
                        <motion.div
                            className={`h-full ${batchPhase === 'collecting' ? 'bg-blue-500' :
                                batchPhase === 'solving' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            animate={{
                                width: batchPhase === 'collecting' ? `${((30 - countdown) / 30) * 100}%` :
                                    batchPhase === 'solving' ? '100%' : '100%'
                            }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </section>

            {/* Stats */}
            {stats && (
                <section className="py-6 md:py-8 px-4 md:px-6 border-b-2 border-black/5 dark:border-white/5">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-black dark:border-white/10">
                            <StatCard
                                icon={<Package className="w-4 h-4" />}
                                label="Total Batches"
                                value={formatNumber(stats.totalBatches)}
                                accent
                            />
                            <StatCard
                                icon={<Layers className="w-4 h-4" />}
                                label="Avg Intents/Batch"
                                value={stats.avgIntentsPerBatch.toFixed(1)}
                            />
                            <StatCard
                                icon={<ArrowRightLeft className="w-4 h-4" />}
                                label="CoW Match Rate"
                                value={`${stats.cowMatchRate.toFixed(0)}%`}
                            />
                            <StatCard
                                icon={<Users className="w-4 h-4" />}
                                label="Active Solvers"
                                value={formatNumber(stats.activeSolvers.length)}
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* Batch List + Detail */}
            <section className="py-8 md:py-10 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-8 bg-black dark:bg-white" />
                        <h2 className="text-xl font-black uppercase tracking-tighter">Settlement History</h2>
                        <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 ml-2">{batches.length} batches</span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-900 animate-pulse" />
                            ))}
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="py-20 text-center">
                            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-zinc-700" />
                            <p className="text-sm text-gray-400 dark:text-zinc-600 uppercase font-bold tracking-wider">No batches found yet</p>
                            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">ARM transactions will appear here as they are settled on-chain</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Batch List */}
                            <div className="lg:col-span-2 space-y-2">
                                {batches.slice(0, 20).map((batch, i) => (
                                    <BatchRow
                                        key={batch.id}
                                        batch={batch}
                                        index={i}
                                        isSelected={selectedBatch?.id === batch.id}
                                        onClick={() => setSelectedBatch(batch)}
                                    />
                                ))}
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-1">
                                <AnimatePresence mode="wait">
                                    {selectedBatch ? (
                                        <BatchDetail key={selectedBatch.id} batch={selectedBatch} />
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="sticky top-6 p-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 text-center"
                                        >
                                            <ArrowRightLeft className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-zinc-700" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
                                                Select a batch to view settlement details
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* How It Works */}
            <section className="py-6 md:py-8 px-4 md:px-6 bg-white dark:bg-zinc-900 border-t-2 border-black/5 dark:border-white/5">
                <div className="max-w-6xl mx-auto">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-8">How Batch Auctions Work</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <HowItWorksCard
                            step={1}
                            title="Collect Intents"
                            desc="Users submit intents expressing what they want — buy, sell, swap. These are collected off-chain in batching windows."
                            icon={<Layers className="w-6 h-6" />}
                        />
                        <HowItWorksCard
                            step={2}
                            title="Solver Competition"
                            desc="Solvers compete to find the optimal settlement: matching opposing intents (CoWs), routing through AMMs, minimizing gas."
                            icon={<Zap className="w-6 h-6" />}
                        />
                        <HowItWorksCard
                            step={3}
                            title="On-Chain Settlement"
                            desc="The winning solver submits the batch transaction on-chain via ARM's execute() function with compliance proofs."
                            icon={<TrendingUp className="w-6 h-6" />}
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}

// ============================================================
// Sub-Components
// ============================================================

function BatchPhaseCard({ active, icon, label, detail }: {
    active: boolean; icon: React.ReactNode; label: string; detail: string
}) {
    return (
        <div className={`p-3 md:p-6 border-r border-black/10 dark:border-white/5 last:border-r-0 transition-all duration-300 ${active
            ? 'bg-black dark:bg-white text-white dark:text-black'
            : 'bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-600'
            }`}>
            <div className={`mb-1 md:mb-2 ${active ? 'opacity-100' : 'opacity-40'}`}>{icon}</div>
            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight">{label}</div>
            <div className={`text-[7px] md:text-[9px] mt-1 font-bold ${active ? 'opacity-80' : 'opacity-40'} hidden sm:block`}>{detail}</div>
            {active && (
                <motion.div
                    className="w-2 h-2 rounded-full bg-green-400 mt-2"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                />
            )}
        </div>
    )
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
    return (
        <div className={`p-4 md:p-6 border-r border-b border-black/10 dark:border-white/5 last:border-r-0 ${accent ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-zinc-900'
            }`}>
            <div className="flex items-center gap-1.5 mb-2 opacity-60">{icon}
                <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
            </div>
            <div className="text-2xl font-black font-mono-swiss">{value}</div>
        </div>
    )
}

function BatchRow({ batch, index, isSelected, onClick }: { batch: Batch; index: number; isSelected: boolean; onClick: () => void }) {
    const chain = CHAIN_META[batch.chainId]
    const timeAgo = getTimeAgo(batch.timestamp)

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onClick}
            className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${isSelected
                ? 'border-[#FF0000] bg-red-50/50 dark:bg-red-950/10'
                : 'border-black/10 dark:border-white/5 hover:border-black/30 dark:hover:border-white/20 bg-white dark:bg-zinc-900'
                }`}
        >
            {/* Batch number */}
            <div className={`w-10 h-10 flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'bg-[#FF0000] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}>
                B{index + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase">
                        Block #{formatNumber(batch.blockNumber)}
                    </span>
                    <span className="text-lg">{chain?.icon || '🔗'}</span>
                    <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase">{chain?.name}</span>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-zinc-600 font-mono truncate mt-0.5">
                    Solver: {batch.solver.substring(0, 10)}...{batch.solver.slice(-6)}
                </div>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0 hidden sm:block">
                <div className="text-sm font-black">{batch.transactions.length} intent{batch.transactions.length !== 1 ? 's' : ''}</div>
                <div className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" /> {timeAgo}
                </div>
            </div>

            {/* CoW badge */}
            {batch.cowMatches > 0 && (
                <div className="shrink-0 px-2 py-1 bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 text-[9px] font-black uppercase">
                    {batch.cowMatches} CoW
                </div>
            )}

            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-700 shrink-0" />
        </motion.div>
    )
}

function BatchDetail({ batch }: { batch: Batch }) {
    const chain = CHAIN_META[batch.chainId]

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-6 border-2 border-black dark:border-white/10"
        >
            {/* Header */}
            <div className="p-4 bg-black dark:bg-white text-white dark:text-black">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{chain?.icon}</span>
                    <span className="text-sm font-black uppercase">Batch Detail</span>
                </div>
                <div className="text-xs font-mono opacity-80">Block #{formatNumber(batch.blockNumber)}</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-0 border-b border-black/10 dark:border-white/5">
                <div className="p-3 border-r border-black/10 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500 block">Intents</span>
                    <span className="text-lg font-black">{batch.transactions.length}</span>
                </div>
                <div className="p-3">
                    <span className="text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500 block">Gas Used</span>
                    <span className="text-lg font-black">{formatNumber(batch.totalGas)}</span>
                </div>
            </div>

            {batch.cowMatches > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-bold text-green-700 dark:text-green-400">
                            {batch.cowMatches} CoW Match{batch.cowMatches > 1 ? 'es' : ''} — Direct P2P settlement
                        </span>
                    </div>
                </div>
            )}

            {/* Settlement Graph — Simplified */}
            <div className="p-4 border-b border-black/10 dark:border-white/5">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-zinc-500 mb-3 block">Settlement Flow</span>
                <div className="flex flex-col items-center gap-2">
                    {batch.transactions.map((_tx, i) => (
                        <div key={i} className="flex items-center gap-2 w-full">
                            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-[8px] font-black text-blue-600 shrink-0">
                                I{i + 1}
                            </div>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700 relative">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-[#FF0000]/60 h-px"
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ delay: i * 0.15, duration: 0.5 }}
                                />
                            </div>
                            <div className="w-6 h-6 bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800 flex items-center justify-center text-[8px] font-black text-green-600 shrink-0">
                                ✓
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Solver */}
            <div className="p-4 border-b border-black/10 dark:border-white/5">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-zinc-500 block mb-1">Winning Solver</span>
                <Link
                    to={`/solver/${batch.solver}`}
                    className="text-xs font-mono text-[#FF0000] hover:underline break-all"
                >
                    {batch.solver}
                </Link>
            </div>

            {/* Transaction List */}
            <div className="p-4">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-zinc-500 block mb-2">Transactions</span>
                <div className="space-y-1">
                    {batch.transactions.map((tx, i) => (
                        <Link
                            key={i}
                            to={`/tx/${tx.tx_hash}`}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-xs"
                        >
                            <span className="font-mono text-[10px] truncate flex-1 text-gray-600 dark:text-zinc-400">
                                {tx.tx_hash.substring(0, 14)}...{tx.tx_hash.slice(-6)}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-zinc-500 shrink-0">{formatNumber(tx.gas_used || 0)} gas</span>
                        </Link>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

function HowItWorksCard({ step, title, desc, icon }: { step: number; title: string; desc: string; icon: React.ReactNode }) {
    return (
        <div className="p-6 border-2 border-black/10 dark:border-white/5 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-black">
                    {step}
                </div>
                <div className="text-gray-400 dark:text-zinc-600">{icon}</div>
            </div>
            <h4 className="font-black uppercase text-sm mb-2">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    )
}

// Helpers
function getTimeAgo(timestamp: string): string {
    if (!timestamp) return 'Unknown'
    const diff = Date.now() - new Date(timestamp).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${mins}m ago`
}

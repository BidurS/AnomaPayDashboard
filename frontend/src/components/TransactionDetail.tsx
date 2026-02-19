import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check, Shield, ArrowRight, Box, Network, ArrowRightLeft, Code, Eye, EyeOff } from 'lucide-react'
import { SEO } from './SEO'
import { HexDecoder } from './HexDecoder'
import { ResourceScale } from './ResourceScale'
import { RingTradeVisualizer } from './RingTradeVisualizer'
import { useTxDetail } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, formatNumber, timeAgo } from '../lib/utils'
import { getZKProgram } from '../lib/zkMapping'
import { useState } from 'react'

interface TransactionDetailProps {
    txHash: string
    onBack: () => void
    onSolverClick: (address: string) => void
}

export function TransactionDetail({ txHash, onBack, onSolverClick }: TransactionDetailProps) {
    const { activeChain } = useChainContext()
    const { tx, loading, error } = useTxDetail(activeChain?.id || 8453, txHash)
    const [copiedHash, setCopiedHash] = useState(false)
    const [xRayMode, setXRayMode] = useState(false)

    // Inspector State
    const [inspectorData, setInspectorData] = useState<{ title: string, data: string } | null>(null)

    // Set default inspector data when tx loads
    if (tx && !inspectorData) {
        setInspectorData({
            title: 'Raw Transaction Data',
            data: JSON.stringify(tx, null, 2)
        })
    }

    const copyHash = () => {
        navigator.clipboard.writeText(txHash)
        setCopiedHash(true)
        setTimeout(() => setCopiedHash(false), 2000)
    }

    if (loading) {
        return (
            <section className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-6 mx-auto" />
                    <p className="font-mono text-sm uppercase tracking-widest text-gray-500 animate-pulse">Syncing Transaction...</p>
                </div>
            </section>
        )
    }

    if (error || !tx) {
        return (
            <section className="min-h-screen py-20 px-6 max-w-5xl mx-auto">
                <button onClick={onBack} className="group flex items-center gap-2 mb-12 text-sm font-bold uppercase tracking-wider hover:text-[#FF0000] transition-colors">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                </button>
                <div className="swiss-border p-12 text-center bg-gray-50 dark:bg-zinc-900">
                    <h2 className="text-2xl font-bold uppercase mb-4">Transaction Missing</h2>
                    <p className="text-gray-500 uppercase tracking-wider text-sm mb-6">The requested transaction could not be indexed</p>
                    <code className="font-mono text-xs bg-gray-200 dark:bg-black px-3 py-1.5 rounded">{txHash}</code>
                </div>
            </section>
        )
    }

    const hasTokenTransfers = tx.tokenTransfers && tx.tokenTransfers.length > 0
    const hasPayloads = tx.payloads && tx.payloads.length > 0

    // Derive ARM metrics for visualization
    const totalTags = tx.actionEvents?.reduce((sum, ae) => sum + ae.action_tag_count, 0) || 2
    const nullifierCount = Math.floor(totalTags / 2)
    const commitmentCount = Math.ceil(totalTags / 2)

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20">
            <SEO
                title={tx ? `Tx ${shortenAddress(txHash)}` : 'Transaction Detail'}
                description={`View transaction details for ${txHash} on Gnoma Explorer.`}
                type="article"
            />

            {/* Split Pane Layout: 5 Columns Left (Flow), 7 Columns Right (Inspector) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">

                {/* Left Pane: Execution Flow (Scrollable) */}
                <aside className="lg:col-span-5 border-r border-black dark:border-white flex flex-col">
                    <div className="p-6 lg:p-8 space-y-8">
                        {/* Header & Nav */}
                        <div>
                            <button onClick={onBack} className="group flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-[0.15em] hover:text-[#FF0000] transition-colors">
                                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Back
                            </button>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="inline-block px-2 py-1 bg-[#FF0000] text-white text-[10px] font-bold uppercase tracking-widest mb-4">
                                    {tx.primary_type || 'Shielded Intent'}
                                </div>
                                <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-4 break-words leading-[0.9]">
                                    Transaction<br />Detail
                                </h1>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="group flex items-center gap-2 relative">
                                        <code className="font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors break-all">
                                            {txHash}
                                        </code>
                                        <button onClick={copyHash} className="shrink-0 p-1.5 hover:text-[#FF0000] transition-colors opacity-0 group-hover:opacity-100">
                                            {copiedHash ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setXRayMode(!xRayMode)}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${xRayMode ? 'bg-[#FF0000] text-white' : 'border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        {xRayMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        X-Ray
                                    </button>
                                </div>
                            </motion.div>
                        </div>

                        {/* ARM Visualizer */}
                        <div className={`transition-all ${xRayMode ? 'p-4 border-2 border-[#FF0000] bg-red-50/20 dark:bg-[#FF0000]/5' : ''}`}>
                            {xRayMode && <div className="text-[10px] font-bold text-[#FF0000] uppercase tracking-widest mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Shielded Resource Logic</div>}
                            <ResourceScale
                                nullifierCount={nullifierCount}
                                commitmentCount={commitmentCount}
                                txHash={txHash}
                            />
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10">
                                <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Block</div>
                                <div className="font-mono font-bold text-lg">{tx.block_number?.toLocaleString()}</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10">
                                <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Time</div>
                                <div className="font-mono font-bold text-lg">{timeAgo(tx.timestamp)}</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10">
                                <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Solver</div>
                                <button onClick={() => onSolverClick(tx.solver_address)} className="font-mono text-sm underline decoration-dotted hover:text-[#FF0000]">
                                    {shortenAddress(tx.solver_address, 6, 6)}
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10">
                                <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Gas</div>
                                <div className="font-mono font-bold text-lg">{formatNumber(tx.gas_used)}</div>
                            </div>
                        </div>

                        {/* Token Transfers (Ring Trade Visualizer) */}
                        {hasTokenTransfers && (
                            <RingTradeVisualizer transfers={tx.tokenTransfers} />
                        )}

                        {/* Payloads */}
                        {hasPayloads && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Box className="w-4 h-4" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Intents & Payloads</h3>
                                </div>
                                <div className="space-y-3">
                                    {tx.payloads.map((p, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setInspectorData({
                                                title: `${p.payload_type} Payload #${p.payload_index}`,
                                                data: p.blob || JSON.stringify(p, null, 2)
                                            })}
                                            className={`swiss-border p-3 cursor-pointer transition-colors flex items-center justify-between group ${xRayMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                        >
                                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest border border-black/5 dark:border-white/5
                                                ${p.payload_type === 'Resource' ? 'bg-green-100/50 text-green-800' :
                                                    p.payload_type === 'Discovery' ? 'bg-purple-100/50 text-purple-800' :
                                                        'bg-blue-100/50 text-blue-800'}`}>
                                                {p.payload_type} #{p.payload_index}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                INSPECT &rarr;
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* DeFi Interactions (Forwarder Calls) */}
                        {tx.forwarderCalls && tx.forwarderCalls.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">DeFi Interactions</h3>
                                </div>
                                <div className="space-y-3">
                                    {tx.forwarderCalls.map((fc, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setInspectorData({
                                                title: `DeFi Call: ${shortenAddress(fc.untrusted_forwarder)}`,
                                                data: JSON.stringify(fc, null, 2)
                                            })}
                                            className={`swiss-border p-4 cursor-pointer transition-colors group ${xRayMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-sm uppercase">
                                                    Forwarder Call
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF0000] transition-colors" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                                <span>Target: {shortenAddress(fc.untrusted_forwarder)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ZK Logic Proofs */}
                        {(() => {
                            try {
                                const parsed = JSON.parse(tx.data_json || '{}')
                                const logicRefs = parsed.logicRefs || []
                                if (logicRefs.length === 0) return null
                                return (
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield className="w-4 h-4" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider">ZK Logic Proofs</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {logicRefs.map((ref: string, i: number) => {
                                                const program = getZKProgram(ref)
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => setInspectorData({
                                                            title: program.name,
                                                            data: JSON.stringify({ program, logicRef: ref }, null, 2)
                                                        })}
                                                        className={`swiss-border p-4 cursor-pointer transition-colors group ${xRayMode ? 'border-[#FF0000] bg-red-50 dark:bg-[#FF0000]/10' : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black uppercase text-[#FF0000] mb-1">
                                                                    Verified Logic #{i + 1}
                                                                </span>
                                                                <h4 className="font-bold text-base text-black dark:text-zinc-100">{program.name}</h4>
                                                            </div>
                                                            <a
                                                                href={program.sourceUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 border border-black/10 hover:bg-black hover:text-white transition-colors"
                                                                title="Verify Source on GitHub"
                                                            >
                                                                <Code className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3 leading-relaxed">
                                                            {program.description}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-1">
                                                                {program.tags.map(tag => (
                                                                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[8px] font-bold uppercase tracking-widest text-gray-600 dark:text-zinc-400">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <span className="font-mono text-[9px] text-gray-400 truncate max-w-[100px]">
                                                                {shortenAddress(ref, 6, 6)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>
                                )
                            } catch (e) { return null }
                        })()}

                        {/* Intent Batch Tree */}
                        {tx.actionEvents && tx.actionEvents.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Network className="w-4 h-4" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Intent Batch Tree</h3>
                                </div>
                                <div className="space-y-3">
                                    {tx.actionEvents.map((ae, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setInspectorData({
                                                title: `Action Tree Root`,
                                                data: JSON.stringify(ae, null, 2)
                                            })}
                                            className={`swiss-border p-4 cursor-pointer transition-colors group ${xRayMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-sm">
                                                    {ae.action_tag_count} Actions Bundled
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF0000] transition-colors" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                                <span>Root: {shortenAddress(ae.action_tree_root)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Shielded State Info */}
                        {tx.privacyRoot && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-4 h-4" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Shielded State</h3>
                                </div>
                                <div
                                    onClick={() => setInspectorData({
                                        title: 'Privacy Verification',
                                        data: JSON.stringify(tx.privacyRoot, null, 2)
                                    })}
                                    className={`swiss-border p-4 cursor-pointer transition-colors ${xRayMode ? 'border-[#FF0000] bg-red-50 dark:bg-[#FF0000]/10' : 'bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Resource Commitments</div>
                                            <div className="font-mono font-bold">{formatNumber(Number(tx.privacyRoot.estimated_pool_size || 0))} Shielded Resources</div>
                                            <div className="text-[9px] text-gray-400 mt-1 uppercase tracking-tight">Anoma uses a commitment tree to track the creation of new private state.</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </aside>

                {/* Right Pane: The Inspector (Sticky) */}
                <main className="lg:col-span-7 bg-[#0a0a0a] min-h-[50vh] lg:h-screen lg:sticky lg:top-0 border-l border-white/10 flex flex-col">
                    {inspectorData ? (
                        <HexDecoder
                            title={inspectorData.title}
                            hexData={inspectorData.data}
                            className="h-full border-0 text-gray-300"
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs uppercase tracking-widest">
                            Select an item to inspect
                        </div>
                    )}
                </main>

            </div>
        </div>
    )
}


import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Copy, Check, Layers, Wallet, Clock, Fuel, Shield, ArrowRight, FileJson, Activity, Box } from 'lucide-react'
import { SEO } from './SEO'
import { HexDecoder } from './HexDecoder'
import { useTxDetail } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, formatCurrency, formatNumber, timeAgo } from '../lib/utils'
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

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20">
            <SEO
                title={tx ? `Tx ${shortenAddress(txHash)}` : 'Transaction Detail'}
                description={`View transaction details for ${txHash} on Gnoma Explorer.`}
                type="article"
            />

            {/* Split Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">

                {/* Left Pane: Core Metrics & Metadata (Sticky) */}
                <aside className="lg:col-span-4 lg:h-screen lg:sticky lg:top-0 bg-gray-50 dark:bg-zinc-900 border-r border-black dark:border-white p-6 lg:p-10 flex flex-col overflow-y-auto no-scrollbar">
                    <button onClick={onBack} className="group flex items-center gap-2 mb-10 text-xs font-bold uppercase tracking-[0.15em] hover:text-[#FF0000] transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Back
                    </button>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <div className="inline-block px-2 py-1 bg-[#FF0000] text-white text-[10px] font-bold uppercase tracking-widest mb-4">
                            {tx.event_type}
                        </div>
                        <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-4 break-words leading-[0.9]">
                            Transaction<br />Detail
                        </h1>
                        <div className="group flex items-center gap-2 relative">
                            <code className="font-mono text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors break-all">
                                {txHash}
                            </code>
                            <button onClick={copyHash} className="shrink-0 p-1.5 hover:text-[#FF0000] transition-colors opacity-0 group-hover:opacity-100">
                                {copiedHash ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-4 mt-auto">
                        <div className="p-5 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                                <Layers className="w-3.5 h-3.5" /> Block
                            </div>
                            <div className="font-mono text-xl font-bold">{tx.block_number?.toLocaleString()}</div>
                        </div>

                        <div className="p-5 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                                <Clock className="w-3.5 h-3.5" /> Time
                            </div>
                            <div className="font-mono text-lg font-bold">{timeAgo(tx.timestamp)}</div>
                            <div className="text-[10px] text-gray-400 mt-1">{new Date(tx.timestamp * 1000).toUTCString()}</div>
                        </div>

                        <div className="p-5 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                                <Wallet className="w-3.5 h-3.5" /> Solver
                            </div>
                            <button onClick={() => onSolverClick(tx.solver_address)} className="font-mono text-sm underline decoration-gray-300 hover:decoration-[#FF0000] hover:text-[#FF0000] transition-all">
                                {shortenAddress(tx.solver_address, 8, 8)}
                            </button>
                        </div>

                        <div className="p-5 bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
                                <Fuel className="w-3.5 h-3.5" /> Gas Used
                            </div>
                            <div className="font-mono text-sm">{formatNumber(tx.gas_used)} UNITS</div>
                        </div>
                    </div>

                    {activeChain?.explorer_url && (
                        <a
                            href={`${activeChain.explorer_url}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-8 flex items-center justify-between text-xs font-bold uppercase tracking-widest border-t border-gray-200 dark:border-zinc-800 pt-6 hover:text-[#FF0000] transition-colors"
                        >
                            View on Block Explorer <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </aside>

                {/* Right Pane: Content (Scrollable) */}
                <main className="lg:col-span-8 p-6 lg:p-12 space-y-12">

                    {/* Token Transfers */}
                    {hasTokenTransfers && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-black text-white dark:bg-white dark:text-black">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">Token Transfers</h3>
                                <span className="ml-auto bg-gray-100 dark:bg-zinc-800 text-xs font-bold px-2 py-1 rounded-full">{tx.tokenTransfers.length}</span>
                            </div>

                            <div className="space-y-3">
                                {tx.tokenTransfers.map((t, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="swiss-border p-5 bg-white dark:bg-black hover:shadow-lg transition-shadow"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center font-bold text-xs ring-1 ring-black/5">
                                                    {t.token_symbol?.substring(0, 2) || '?'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-xs text-gray-500">{shortenAddress(t.from_address)}</span>
                                                        <ArrowRight className="w-3 h-3 text-gray-300" />
                                                        <span className="font-mono text-xs text-gray-500">{shortenAddress(t.to_address)}</span>
                                                    </div>
                                                    <div className="font-bold text-lg">
                                                        {t.amount_display?.toFixed(Math.min(t.token_decimals, 4))} {t.token_symbol}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {t.amount_usd > 0 ? (
                                                    <div className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(t.amount_usd)}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] uppercase text-gray-300 font-bold tracking-widest">Price Unknown</span>
                                                )}
                                                <div className="text-[10px] text-gray-400 mt-1 font-mono uppercase truncate max-w-[150px]">
                                                    {t.token_address}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Payloads & Intents */}
                    {hasPayloads && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-[#FFCC00] text-black">
                                    <Box className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">Intents & Payloads</h3>
                                <span className="ml-auto bg-gray-100 dark:bg-zinc-800 text-xs font-bold px-2 py-1 rounded-full">{tx.payloads.length}</span>
                            </div>

                            <div className="space-y-6">
                                {tx.payloads.map((p, i) => (
                                    <div key={i} className="swiss-border bg-white dark:bg-black overflow-hidden">
                                        <div className="border-b border-black dark:border-white bg-gray-50 dark:bg-zinc-900 p-3 flex items-center justify-between">
                                            <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest border border-black/10 dark:border-white/10
                                                ${p.payload_type === 'Resource' ? 'bg-green-100/50 text-green-800' :
                                                    p.payload_type === 'Discovery' ? 'bg-purple-100/50 text-purple-800' :
                                                        'bg-blue-100/50 text-blue-800'}`}>
                                                {p.payload_type} Payload #{p.payload_index}
                                            </span>
                                            <span className="font-mono text-[10px] text-gray-400">Decoded View</span>
                                        </div>
                                        {p.blob && <HexDecoder hexData={p.blob} className="border-0 border-t-0" />}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Privacy State */}
                    {tx.privacyRoot && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-[#FF0000] text-white">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">Privacy State</h3>
                            </div>
                            <div className="swiss-border p-6 bg-white dark:bg-black">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2 block">Merkle Root</span>
                                        <code className="font-mono text-xs break-all bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-2 block">
                                            {tx.privacyRoot.root_hash}
                                        </code>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2 block">Pool Details</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold">{formatNumber(Number(tx.privacyRoot.estimated_pool_size || 0))}</span>
                                            <span className="text-xs font-bold uppercase text-gray-400">Commitments</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Raw JSON Data */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 border border-black dark:border-white">
                                <FileJson className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Raw Data</h3>
                        </div>
                        <div className="swiss-border bg-black text-white p-6 overflow-x-auto">
                            <pre className="font-mono text-[10px] leading-relaxed opacity-80">
                                {JSON.stringify({
                                    tx_hash: tx.tx_hash,
                                    block_number: tx.block_number,
                                    event_type: tx.event_type,
                                    solver_address: tx.solver_address,
                                    gas_used: tx.gas_used,
                                    timestamp: tx.timestamp,
                                    decoded_input: (() => { try { return JSON.parse(tx.data_json || '{}') } catch { return {} } })()
                                }, null, 2)}
                            </pre>
                        </div>
                    </section>

                </main>
            </div>
        </div>
    )
}


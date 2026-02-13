import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Copy, Check, Layers, Wallet, Clock, Fuel, Shield, ArrowRight } from 'lucide-react'
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
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center py-24">
                        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
                        <p className="text-gray-500 uppercase text-sm tracking-wider">Loading transaction...</p>
                    </div>
                </div>
            </section>
        )
    }

    if (error || !tx) {
        return (
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-wider hover:text-red-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Explorer
                    </button>
                    <div className="swiss-card p-12 text-center">
                        <p className="text-gray-500 uppercase tracking-wider">Transaction not found</p>
                        <code className="text-xs mt-2 block text-gray-400">{txHash}</code>
                    </div>
                </div>
            </section>
        )
    }

    const hasTokenTransfers = tx.tokenTransfers && tx.tokenTransfers.length > 0
    const hasPayloads = tx.payloads && tx.payloads.length > 0

    return (
        <>
            <SEO
                title={tx ? `Tx ${shortenAddress(txHash)}` : 'Transaction Detail'}
                description={`View transaction details for ${txHash} on Gnoma Explorer.`}
                type="article"
            />
            <section className="py-16 swiss-grid">
                <div className="max-w-5xl mx-auto px-6 lg:px-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Back button */}
                        <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-wider hover:text-red-600 transition-colors text-black dark:text-white">
                            <ArrowLeft className="w-4 h-4" /> Back to Explorer
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-12 bg-[#FF0000]" />
                            <div>
                                <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">Transaction Detail</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="font-mono text-sm text-gray-600 dark:text-gray-400">{shortenAddress(txHash, 16, 12)}</code>
                                    <button onClick={copyHash} className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-black dark:text-white">
                                        {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                    {activeChain?.explorer_url && (
                                        <a href={`${activeChain.explorer_url}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                            className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-black dark:text-white">
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-black dark:bg-white" />
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Layers className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Block</span>
                                    </div>
                                    <div className="font-bold tabular-nums text-lg text-black dark:text-white">{tx.block_number?.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#0066CC]" />
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Time</span>
                                    </div>
                                    <div className="font-bold text-lg text-black dark:text-white">{timeAgo(tx.timestamp)}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(tx.timestamp * 1000).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#FFCC00]" />
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Fuel className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Gas Used</span>
                                    </div>
                                    <div className="font-bold text-lg text-black dark:text-white">{formatNumber(tx.gas_used)}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#FF0000]" />
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wallet className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Solver</span>
                                    </div>
                                    <button onClick={() => onSolverClick(tx.solver_address)} className="font-mono text-sm font-bold hover:text-[#0066CC] transition-colors text-black dark:text-white dark:hover:text-[#3399FF]">
                                        {shortenAddress(tx.solver_address, 8, 6)}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Token Transfers */}
                        {hasTokenTransfers && (
                            <div className="swiss-card mb-8">
                                <div className="swiss-card-accent bg-[#0066CC]" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                    💰 Token Transfers ({tx.tokenTransfers.length})
                                </h3>
                                <div className="space-y-3">
                                    {tx.tokenTransfers.map((t, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                                            <div className="w-8 h-8 bg-[#0066CC] text-white flex items-center justify-center font-bold text-xs">
                                                {t.token_symbol?.substring(0, 2) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <code className="font-mono text-xs text-black dark:text-gray-300">{shortenAddress(t.from_address)}</code>
                                                    <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <code className="font-mono text-xs text-black dark:text-gray-300">{shortenAddress(t.to_address)}</code>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {t.token_symbol} • {t.token_address ? shortenAddress(t.token_address, 8, 6) : ''}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="font-bold text-sm text-black dark:text-white">{t.amount_display?.toFixed(t.token_decimals <= 6 ? 2 : 6)} {t.token_symbol}</div>
                                                {t.amount_usd > 0 && (
                                                    <div className="text-xs text-gray-500">{formatCurrency(t.amount_usd)}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payloads */}
                        {hasPayloads && (
                            <div className="swiss-card mb-8">
                                <div className="swiss-card-accent bg-[#FFCC00]" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                    📦 Payloads ({tx.payloads.length})
                                </h3>
                                <div className="space-y-3">
                                    {tx.payloads.map((p, i) => (
                                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border border-black dark:border-white
                                                ${p.payload_type === 'Resource' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                                                        p.payload_type === 'Discovery' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' :
                                                            p.payload_type === 'External' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                                                                p.payload_type === 'Application' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                                                                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                                                    {p.payload_type} #{p.payload_index}
                                                </span>
                                            </div>
                                            {p.blob && (
                                                <HexDecoder hexData={p.blob} className="mt-2" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Privacy Root */}
                        {tx.privacyRoot && (
                            <div className="swiss-card mb-8">
                                <div className="swiss-card-accent bg-[#FF0000]" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                    <Shield className="w-4 h-4 inline mr-1" /> Privacy Pool State
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase mb-1">Commitment Root</span>
                                        <code className="font-mono text-xs break-all text-black dark:text-gray-300">{tx.privacyRoot.root_hash}</code>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase mb-1">Pool Size</span>
                                        <span className="font-bold text-black dark:text-white">{tx.privacyRoot.estimated_pool_size} commitments</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw Data */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-black dark:bg-white" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                Raw Transaction Data
                            </h3>
                            <div className="bg-gray-900 text-green-400 p-4 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                                <pre>{JSON.stringify({
                                    tx_hash: tx.tx_hash,
                                    block_number: tx.block_number,
                                    event_type: tx.event_type,
                                    solver_address: tx.solver_address,
                                    gas_used: tx.gas_used,
                                    timestamp: tx.timestamp,
                                    decoded_input: (() => { try { return JSON.parse(tx.data_json || '{}') } catch { return {} } })()
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    )
}

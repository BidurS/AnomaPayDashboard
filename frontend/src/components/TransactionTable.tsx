import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, Check, Layers, Download, RefreshCw, ArrowRight, X } from 'lucide-react'
import { useLatestTransactions, type Transaction } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, cn, formatWei } from '../lib/utils'

interface TransactionTableProps {
    searchQuery?: string
    onTxClick?: (hash: string) => void
    onSolverClick?: (address: string) => void
    hideHeader?: boolean
    compact?: boolean
}

export function TransactionTable({ searchQuery, onTxClick, onSolverClick, hideHeader, compact }: TransactionTableProps) {
    const { activeChain } = useChainContext()
    const [page, setPage] = useState(1)
    const { transactions, pagination, loading, refetch } = useLatestTransactions(activeChain?.id || 8453, searchQuery, page)
    const [copiedHash, setCopiedHash] = useState<string | null>(null)
    const [hoveredRow, setHoveredRow] = useState<string | null>(null)
    // Sticky note hint to educate users that they can click elements
    const [showTxHint, setShowTxHint] = useState(true)
    const [showSolverHint, setShowSolverHint] = useState(true)

    // Derived state for pagination/data
    const hasData = transactions.length > 0

    const copyHash = (hash: string) => {
        navigator.clipboard.writeText(hash)
        setCopiedHash(hash)
        setTimeout(() => setCopiedHash(null), 2000)
    }

    const exportCSV = () => {
        if (!transactions.length) return
        const headers = ['Tx Hash', 'Type', 'Value (Wei)', 'Solver', 'Block', 'Timestamp']
        const rows = transactions.map((tx: Transaction) => [
            tx.tx_hash,
            tx.primary_type,
            tx.value_wei,
            tx.solver_address,
            tx.block_number,
            new Date(tx.timestamp).toISOString()
        ])
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "transactions.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const formatTime = (timestamp: string | number) => {
        return new Date(timestamp).toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            month: 'short',
            day: 'numeric'
        })
    }

    const getHumanReadableDescription = (tx: Transaction) => {
        if (tx.primary_type === 'Swap') return `Swap via ${shortenAddress(tx.solver_address)}`
        if (tx.primary_type === 'Transfer') return `Transfer ${formatWei(tx.value_wei)} ETH`
        return 'Interaction'
    }

    const TableContent = (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {!hideHeader && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-[#FF0000]" />
                        <div>
                            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-zinc-100 leading-none">
                                {searchQuery ? 'Search Results' : 'Recent Activity'}
                            </h2>
                            <p className="text-xs font-mono text-gray-500 dark:text-zinc-500 uppercase tracking-widest mt-1">
                                Live Intent Stream
                            </p>
                        </div>

                        {/* Live indicator */}
                        <div className="relative flex h-3 w-3 ml-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF0000]"></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportCSV}
                            className="btn-swiss text-xs py-2 px-4 h-10 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-white/5"
                            title="Export CSV"
                        >
                            <Download className="w-3 h-3" /> CSV
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="btn-swiss text-xs py-2 px-3 h-10 border-l-0 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-white/5"
                            title="Refresh"
                        >
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            <div className={cn(
                "swiss-border bg-white dark:bg-zinc-950 overflow-hidden relative min-h-[400px] dark:border-white/10",
                compact && "border-0 shadow-none"
            )}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 z-10 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest text-black dark:text-white">Loading Live Data...</span>
                        </div>
                    </div>
                ) : null}

                {!loading && !hasData ? (
                    <div className="py-32 text-center flex flex-col items-center">
                        <Layers className="w-12 h-12 text-gray-300 dark:text-zinc-800 mb-4 stroke-1" />
                        <p className="text-gray-500 dark:text-zinc-600 uppercase text-sm tracking-widest font-mono">
                            {searchQuery
                                ? `No transactions found for "${shortenAddress(searchQuery, 8, 8)}"`
                                : "No transactions indexed yet"}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b-2 border-black dark:border-white/10">
                                        <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 bg-gray-50 dark:bg-white/5">Intent Hash</th>
                                        <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 bg-gray-50 dark:bg-white/5">Action</th>
                                        <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 bg-gray-50 dark:bg-white/5">Value</th>
                                        <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 bg-gray-50 dark:bg-white/5">Solver</th>
                                        <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 bg-gray-50 dark:bg-white/5">Block / Time</th>
                                        <th className="p-4 w-16 bg-gray-50 dark:bg-white/5"></th>
                                    </tr>
                                </thead>
                                <tbody onMouseLeave={() => setHoveredRow(null)}>
                                    {transactions.map((tx: Transaction, i: number) => (
                                        <motion.tr
                                            key={tx.tx_hash}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-default"
                                            onMouseEnter={() => setHoveredRow(tx.tx_hash)}
                                            style={{
                                                opacity: hoveredRow && hoveredRow !== tx.tx_hash ? 0.3 : 1,
                                                transition: 'opacity 0.2s ease'
                                            }}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-1 h-8 bg-gray-200 dark:bg-white/10 transition-colors group-hover:bg-[#FF0000]",
                                                        tx.primary_type === 'Swap' && "bg-blue-200 dark:bg-blue-900/30",
                                                        tx.primary_type === 'Transfer' && "bg-green-200 dark:bg-green-900/30"
                                                    )} />
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onTxClick?.(tx.tx_hash) }}
                                                                className="inline-flex items-center gap-1 font-mono-swiss text-sm font-bold text-black dark:text-zinc-200 border-b-2 border-transparent hover:border-[#FF0000] hover:text-[#FF0000] transition-colors group/link relative"
                                                                title="View Transaction Details"
                                                            >
                                                                {i === 0 && showTxHint && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="absolute z-20 -top-8 left-0 bg-[#FF0000] text-white text-[9px] font-bold px-2 py-1 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] uppercase tracking-wider whitespace-nowrap cursor-default"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        Click to view tx
                                                                        <button onClick={() => setShowTxHint(false)} className="hover:text-black transition-colors" title="Dismiss">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-[#FF0000] rotate-45" />
                                                                    </motion.div>
                                                                )}

                                                                {shortenAddress(tx.tx_hash, 6, 6)}
                                                                <ArrowUpRight className="w-3 h-3 opacity-0 -ml-2 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all text-[#FF0000]" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); copyHash(tx.tx_hash) }}
                                                                className="text-gray-400 hover:text-black dark:hover:text-zinc-200 transition-colors"
                                                            >
                                                                {copiedHash === tx.tx_hash ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                        {tx.primary_type && tx.primary_type !== 'Unknown' && (
                                                            <span className="text-[10px] text-gray-400 dark:text-zinc-600 uppercase tracking-wider">{tx.primary_type}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-zinc-200">
                                                    <ArrowRight className="w-3 h-3 text-gray-400 dark:text-zinc-600" />
                                                    {getHumanReadableDescription(tx)}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono-swiss text-sm text-black dark:text-zinc-300">
                                                {formatWei(tx.value_wei)} ETH
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSolverClick?.(tx.solver_address); }}
                                                    className="inline-flex items-center gap-1 font-mono-swiss text-xs font-bold text-[#666] dark:text-zinc-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group/solver relative"
                                                    title="View Solver Profile"
                                                >
                                                    {i === 0 && showSolverHint && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.1 }}
                                                            className="absolute z-20 -top-8 left-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider whitespace-nowrap cursor-default"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            Click for Solver
                                                            <button onClick={() => setShowSolverHint(false)} className="hover:text-black transition-colors" title="Dismiss">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-blue-500 rotate-45" />
                                                        </motion.div>
                                                    )}

                                                    {shortenAddress(tx.solver_address)}
                                                    <ArrowRight className="w-3 h-3 opacity-0 -ml-2 group-hover/solver:opacity-100 group-hover/solver:ml-0 transition-all" />
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono-swiss text-xs text-black dark:text-zinc-400">#{tx.block_number}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-zinc-600 uppercase tracking-widest">{formatTime(tx.timestamp)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {activeChain?.explorer_url && (
                                                    <a
                                                        href={`${activeChain.explorer_url}/tx/${tx.tx_hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex p-2 text-gray-400 hover:text-black dark:hover:text-zinc-200 transition-colors"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View - Optimized for width */}
                        <div className="md:hidden">
                            {transactions.map((tx: Transaction, i: number) => (
                                <motion.div
                                    key={tx.tx_hash}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="border-b border-gray-100 dark:border-white/5 p-4 active:bg-gray-50 dark:active:bg-zinc-900 relative group"
                                    onClick={() => onTxClick?.(tx.tx_hash)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-mono-swiss text-xs font-bold text-black dark:text-zinc-200 mb-1 flex items-center gap-2">
                                                {getHumanReadableDescription(tx)}
                                                <ArrowRight className="w-3 h-3 text-[#FF0000] opacity-0 group-active:opacity-100 transition-opacity" />
                                            </span>
                                            <span className="font-mono-swiss text-[10px] text-gray-500 dark:text-zinc-500">
                                                {shortenAddress(tx.tx_hash, 8, 8)}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                            {formatTime(tx.timestamp).split(',')[1]}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs mt-3">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                tx.primary_type === 'Swap' ? "bg-blue-500" :
                                                    tx.primary_type === 'Transfer' ? "bg-green-500" : "bg-gray-500"
                                            )} />
                                            <span className="text-gray-600 dark:text-zinc-400 text-[10px] uppercase tracking-wider">{tx.primary_type}</span>
                                        </div>

                                        <div className="font-mono-swiss text-black dark:text-zinc-300">
                                            {formatWei(tx.value_wei)} ETH
                                        </div>
                                    </div>

                                    {/* Mobile Explicit Click Affordance */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <ArrowUpRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination Controls - Swiss Style */}
            {transactions.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 border-t border-black dark:border-white/10 pt-6">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-600">
                        Page {pagination?.page || 1} / {pagination?.totalPages || 1}
                    </div>

                    <div className="flex gap-[-1px]">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn-swiss text-xs h-10 px-6 border-r-0 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={pagination && page >= pagination.totalPages}
                            className="btn-swiss text-xs h-10 px-8 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    if (compact) {
        return <div className="py-4">{TableContent}</div>
    }

    return (
        <section id="transaction-table" className="py-12 md:py-24 bg-white dark:bg-black transition-colors duration-300">
            {TableContent}
        </section>
    )
}
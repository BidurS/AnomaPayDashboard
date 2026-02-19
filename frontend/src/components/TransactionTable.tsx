import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, Check, Layers, Download, RefreshCw, ArrowRight } from 'lucide-react'
import { useLatestTransactions, type Transaction } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, cn, formatWei } from '../lib/utils'

interface TransactionTableProps {
    searchQuery?: string
    onTxClick?: (hash: string) => void
    onSolverClick?: (address: string) => void
}

export function TransactionTable({ searchQuery, onTxClick, onSolverClick }: TransactionTableProps) {
    const { activeChain } = useChainContext()
    const [page, setPage] = useState(1)
    const { transactions, pagination, loading, refetch } = useLatestTransactions(activeChain?.id || 8453, searchQuery, page, 20)
    const [copiedHash, setCopiedHash] = useState<string | null>(null)
    const [hoveredRow, setHoveredRow] = useState<string | null>(null)

    const copyHash = (hash: string) => {
        navigator.clipboard.writeText(hash)
        setCopiedHash(hash)
        setTimeout(() => setCopiedHash(null), 2000)
    }

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    const getHumanReadableDescription = (tx: Transaction) => {
        if (tx.primary_type === 'Transfer') return `Moved ${formatWei(tx.value_wei)} ETH`
        if (tx.primary_type === 'Swap') return `Swapped Assets`
        if (tx.value_wei && BigInt(tx.value_wei) > 0) return `Transfer ${formatWei(tx.value_wei)} ETH`
        return `Executed ${tx.primary_type || 'Unknown'} Intent`
    }

    const exportCSV = () => {
        if (!transactions.length) return
        const headers = ['tx_hash', 'block_number', 'solver_address', 'value_wei', 'gas_used', 'timestamp', 'type']
        const rows = transactions.map((tx: Transaction) => [
            tx.tx_hash, tx.block_number, tx.solver_address, tx.value_wei, tx.gas_used,
            new Date(tx.timestamp * 1000).toISOString(), tx.primary_type || ''
        ])
        const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gnoma-transactions-page${page}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const hasData = transactions.length > 0

    return (
        <section id="transaction-table" className="py-12 md:py-24 bg-white dark:bg-black transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-[#FF0000]" />
                        <div>
                            <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tighter text-black dark:text-white leading-none">
                                {searchQuery ? 'Search Results' : 'Recent Activity'}
                            </h2>
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">
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
                            className="btn-swiss text-xs py-2 px-4 h-10"
                            title="Export CSV"
                        >
                            <Download className="w-3 h-3" /> CSV
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="btn-swiss text-xs py-2 px-3 h-10 border-l-0"
                            title="Refresh"
                        >
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="swiss-border bg-white dark:bg-black overflow-hidden relative min-h-[400px]">
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
                            <Layers className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4 stroke-1" />
                            <p className="text-gray-500 uppercase text-sm tracking-widest font-mono">
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
                                        <tr className="border-b-2 border-black dark:border-white">
                                            <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">Intent Hash</th>
                                            <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">Action</th>
                                            <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">Value</th>
                                            <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">Solver</th>
                                            <th className="p-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">Block / Time</th>
                                            <th className="p-4 w-16 bg-gray-50 dark:bg-zinc-900/50"></th>
                                        </tr>
                                    </thead>
                                    <tbody onMouseLeave={() => setHoveredRow(null)}>
                                        {transactions.map((tx: Transaction, i: number) => (
                                            <motion.tr
                                                key={tx.tx_hash}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="group border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-default"
                                                onMouseEnter={() => setHoveredRow(tx.tx_hash)}
                                                style={{
                                                    opacity: hoveredRow && hoveredRow !== tx.tx_hash ? 0.3 : 1,
                                                    transition: 'opacity 0.2s ease'
                                                }}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-1 h-8 bg-gray-200 dark:bg-gray-800 transition-colors group-hover:bg-[#FF0000]",
                                                            tx.primary_type === 'Swap' && "bg-blue-200 dark:bg-blue-900",
                                                            tx.primary_type === 'Transfer' && "bg-green-200 dark:bg-green-900"
                                                        )} />
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    onClick={() => onTxClick?.(tx.tx_hash)}
                                                                    className="font-mono-swiss text-sm text-black dark:text-white cursor-pointer hover:text-[#FF0000] transition-colors"
                                                                >
                                                                    {shortenAddress(tx.tx_hash, 6, 6)}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); copyHash(tx.tx_hash) }}
                                                                    className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                                                                >
                                                                    {copiedHash === tx.tx_hash ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{tx.primary_type || 'Unknown'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-gray-200">
                                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                                        {getHumanReadableDescription(tx)}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono-swiss text-sm text-black dark:text-white">
                                                    {formatWei(tx.value_wei)} ETH
                                                </td>
                                                <td className="p-4">
                                                    <button onClick={() => onSolverClick?.(tx.solver_address)} className="font-mono-swiss text-xs text-[#666] dark:text-[#999] hover:text-[#FF0000] dark:hover:text-[#FF0000] border-b border-dotted border-gray-400 hover:border-[#FF0000] transition-all">
                                                        {shortenAddress(tx.solver_address)}
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono-swiss text-xs text-black dark:text-white">#{tx.block_number}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{formatTime(tx.timestamp)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {activeChain?.explorer_url && (
                                                        <a
                                                            href={`${activeChain.explorer_url}/tx/${tx.tx_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
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
                                        className="border-b border-gray-100 dark:border-gray-800 p-4 active:bg-gray-50 dark:active:bg-zinc-900"
                                        onClick={() => onTxClick?.(tx.tx_hash)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="font-mono-swiss text-xs font-bold text-black dark:text-white mb-1">
                                                    {getHumanReadableDescription(tx)}
                                                </span>
                                                <span className="font-mono-swiss text-[10px] text-gray-500">
                                                    {shortenAddress(tx.tx_hash, 8, 8)}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
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
                                                <span className="text-gray-600 dark:text-gray-400 text-[10px] uppercase tracking-wider">{tx.primary_type}</span>
                                            </div>

                                            <div className="font-mono-swiss text-black dark:text-white">
                                                {formatWei(tx.value_wei)} ETH
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Pagination Controls - Swiss Style */}
                {transactions.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 border-t border-black dark:border-white pt-6">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                            Page {pagination?.page || 1} / {pagination?.totalPages || 1}
                        </div>

                        <div className="flex gap-[-1px]">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn-swiss text-xs h-10 px-6 border-r-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={pagination && page >= pagination.totalPages}
                                className="btn-swiss text-xs h-10 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
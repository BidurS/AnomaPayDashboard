import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, Check, Layers, Download, RefreshCw } from 'lucide-react'
import { useLatestTransactions } from '../lib/api'
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
            minute: '2-digit'
        })
    }

    const exportCSV = () => {
        if (!transactions.length) return
        const headers = ['tx_hash', 'block_number', 'solver_address', 'value_wei', 'gas_used', 'timestamp', 'type']
        const rows = transactions.map(tx => [
            tx.tx_hash, tx.block_number, tx.solver_address, tx.value_wei, tx.gas_used,
            new Date(tx.timestamp * 1000).toISOString(), tx.primary_type || ''
        ])
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
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
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-8 bg-black dark:bg-white" />
                            <Layers className="w-6 h-6 text-black dark:text-white" />
                            <h2 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">
                                {searchQuery ? 'Search Results' : 'Recent Transactions'}
                            </h2>
                            {/* Live indicator */}
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Live
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1 px-3 py-1.5 border-2 border-black dark:border-white text-black dark:text-white text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                                title="Export CSV"
                            >
                                <Download className="w-3 h-3" /> CSV
                            </button>
                            <button
                                onClick={() => refetch()}
                                className="p-1.5 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="swiss-card overflow-hidden">
                        <div className="swiss-card-accent" />

                        {loading ? (
                            <div className="py-16 text-center text-gray-400 uppercase text-sm tracking-wider">
                                Loading transactions...
                            </div>
                        ) : hasData ? (
                            <div className="overflow-x-auto pt-2">
                                <table className="swiss-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction Hash</th>
                                            <th>Type</th>
                                            <th>Value (ETH)</th>
                                            <th>Solver</th>
                                            <th>Block</th>
                                            <th>Time</th>
                                            <th className="w-16">Link</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx, i) => (
                                            <motion.tr
                                                key={tx.tx_hash}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.03 }}
                                            >
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => onTxClick?.(tx.tx_hash)}
                                                            className="font-mono text-sm font-bold text-[#0066CC] dark:text-[#3399FF] hover:underline cursor-pointer"
                                                        >
                                                            {shortenAddress(tx.tx_hash, 8, 6)}
                                                        </button>
                                                        <button
                                                            onClick={() => copyHash(tx.tx_hash)}
                                                            className={cn(
                                                                "p-1.5 border-2 border-black dark:border-white text-black dark:text-white transition-colors",
                                                                copiedHash === tx.tx_hash ? "bg-[#0066CC] text-white border-[#0066CC]" : "hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                                                            )}
                                                        >
                                                            {copiedHash === tx.tx_hash ? (
                                                                <Check className="w-3 h-3" />
                                                            ) : (
                                                                <Copy className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    {tx.primary_type ? (
                                                        <span className={cn(
                                                            "px-2 py-1 text-[10px] uppercase font-bold tracking-wider border border-black dark:border-gray-600",
                                                            tx.primary_type === 'Resource' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                                                                tx.primary_type === 'Discovery' ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" :
                                                                    tx.primary_type === 'Application' ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" :
                                                                        tx.primary_type === 'External' ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" :
                                                                            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                                        )}>
                                                            {tx.primary_type}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="font-mono text-sm text-black dark:text-gray-200">
                                                    {formatWei(tx.value_wei)}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => onSolverClick?.(tx.solver_address)}
                                                        className="font-mono text-sm text-[#0066CC] dark:text-[#3399FF] hover:underline cursor-pointer"
                                                    >
                                                        {shortenAddress(tx.solver_address)}
                                                    </button>
                                                </td>
                                                <td className="font-bold tabular-nums text-black dark:text-gray-200">
                                                    {tx.block_number.toLocaleString()}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-400 text-sm">
                                                    {formatTime(tx.timestamp)}
                                                </td>
                                                <td>
                                                    {activeChain?.explorer_url && (
                                                        <a
                                                            href={`${activeChain.explorer_url}/tx/${tx.tx_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors inline-flex"
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
                        ) : (
                            <div className="py-16 text-center text-gray-400 uppercase text-sm tracking-wider">
                                {searchQuery
                                    ? `No transactions found for "${shortenAddress(searchQuery, 8, 8)}"`
                                    : "No transactions indexed yet — waiting for on-chain activity"}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex justify-center">
                        {/* Pagination controls simplified reuse for brevity or implement fully if needed in this chunk? 
                            The original code had pagination at the bottom. I should preserve it. */}
                        {transactions.length > 0 && (
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-4">
                                    <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
                                        Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-black dark:text-white">Go to:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={pagination?.totalPages || 1}
                                            value={page}
                                            onChange={(e) => setPage(Math.max(1, Math.min(pagination?.totalPages || 1, parseInt(e.target.value) || 1)))}
                                            className="w-16 p-1 border border-black dark:border-white bg-transparent text-center font-mono text-sm focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-900 text-black dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 border-2 border-black dark:border-white text-black dark:text-white uppercase text-xs font-bold tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black dark:disabled:hover:bg-transparent dark:disabled:hover:text-white"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={pagination && page >= pagination.totalPages}
                                        className="px-4 py-2 border-2 border-black dark:border-white text-black dark:text-white uppercase text-xs font-bold tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black dark:disabled:hover:bg-transparent dark:disabled:hover:text-white"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
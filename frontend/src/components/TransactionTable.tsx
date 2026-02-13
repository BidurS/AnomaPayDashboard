import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, Check, Layers } from 'lucide-react'
import { useLatestTransactions } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, cn, formatWei } from '../lib/utils'

interface TransactionTableProps {
    searchQuery?: string
}

export function TransactionTable({ searchQuery }: TransactionTableProps) {
    const { activeChain } = useChainContext()
    const [page, setPage] = useState(1)
    const { transactions, pagination, loading, refetch } = useLatestTransactions(activeChain?.id || 8453, searchQuery, page, 20)
    const [copiedHash, setCopiedHash] = useState<string | null>(null)
    const [selectedTx, setSelectedTx] = useState<any | null>(null)

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

    const hasData = transactions.length > 0

    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-8 bg-black" />
                        <Layers className="w-6 h-6" />
                        <h2 className="text-2xl font-extrabold uppercase tracking-tight">
                            {searchQuery ? 'Search Results' : 'Recent Transactions'}
                        </h2>
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
                                            <th className="w-16">Data</th>
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
                                                        <code className="font-mono text-sm font-bold">
                                                            {shortenAddress(tx.tx_hash, 8, 6)}
                                                        </code>
                                                        <button
                                                            onClick={() => copyHash(tx.tx_hash)}
                                                            className={cn(
                                                                "p-1.5 border-2 border-black transition-colors",
                                                                copiedHash === tx.tx_hash ? "bg-[#0066CC] text-white" : "hover:bg-black hover:text-white"
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
                                                            "px-2 py-1 text-[10px] uppercase font-bold tracking-wider border border-black",
                                                            tx.primary_type === 'Resource' ? "bg-green-100 text-green-800" :
                                                                tx.primary_type === 'Discovery' ? "bg-purple-100 text-purple-800" :
                                                                    tx.primary_type === 'Application' ? "bg-blue-100 text-blue-800" :
                                                                        tx.primary_type === 'Live' ? "bg-red-100 text-red-800 animate-pulse" :
                                                                            "bg-gray-100 text-gray-800"
                                                        )}>
                                                            {tx.primary_type}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="font-mono text-sm">
                                                    {formatWei(tx.value_wei)}
                                                </td>
                                                <td>
                                                    <code className="font-mono text-sm">
                                                        {shortenAddress(tx.solver_address)}
                                                    </code>
                                                </td>
                                                <td className="font-bold tabular-nums">
                                                    {tx.block_number.toLocaleString()}
                                                </td>
                                                <td className="text-gray-600 text-sm">
                                                    {formatTime(tx.timestamp)}
                                                </td>
                                                <td>
                                                    {activeChain?.explorer_url && (
                                                        <a
                                                            href={`${activeChain.explorer_url}/tx/${tx.tx_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors inline-flex"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setSelectedTx(tx)}
                                                        className="px-2 py-1 border border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                                                    >
                                                        JSON
                                                    </button>
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

                    {transactions.length > 0 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
                                    Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase">Go to:</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={pagination?.totalPages || 1}
                                        value={page}
                                        onChange={(e) => setPage(Math.max(1, Math.min(pagination?.totalPages || 1, parseInt(e.target.value) || 1)))}
                                        className="w-16 p-1 border border-black text-center font-mono text-sm focus:outline-none focus:bg-gray-50"
                                    />
                                </div>
                                <button
                                    onClick={() => refetch()}
                                    className="p-1 hover:bg-black hover:text-white border-2 border-black transition-colors"
                                    title="Refresh Data"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 border-2 border-black uppercase text-xs font-bold tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={pagination && page >= pagination.totalPages}
                                    className="px-4 py-2 border-2 border-black uppercase text-xs font-bold tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* JSON Modal */}
                {selectedTx && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedTx(null)}>
                        <div className="bg-white w-full max-w-4xl max-h-[80vh] overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
                                <h3 className="text-lg font-bold uppercase tracking-tight">Transaction Data</h3>
                                <button onClick={() => setSelectedTx(null)} className="p-1 hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-black transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-auto max-h-[calc(80vh-64px)] bg-[#fff]">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm font-mono border-b border-gray-200 pb-4 mb-4">
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Hash</span>
                                            <div className="font-bold break-all">{selectedTx.tx_hash}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Block</span>
                                            <div className="font-bold">{selectedTx.block_number}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Timestamp</span>
                                            <div className="font-bold">{formatTime(selectedTx.timestamp)}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase tracking-wide mb-1">Gas Used</span>
                                            <div className="font-bold">{selectedTx.gas_used.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs uppercase tracking-wide mb-2">Raw Data (JSON)</span>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded-sm font-mono text-xs overflow-x-auto">
                                            <pre>{JSON.stringify({
                                                ...selectedTx,
                                                data_json: undefined,
                                                decoded_input: JSON.parse(selectedTx.data_json || '{}')
                                            }, null, 2)}</pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
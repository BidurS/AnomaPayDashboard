import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Fuel, Clock, Wallet, TrendingUp, BarChart3 } from 'lucide-react'
import { SEO } from './SEO'
import { useSolverDetail } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, formatCurrency, formatNumber, timeAgo } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SolverProfileProps {
    address: string
    onBack: () => void
    onTxClick: (hash: string) => void
}

export function SolverProfile({ address, onBack, onTxClick }: SolverProfileProps) {
    const { activeChain } = useChainContext()
    const { solver, loading, error } = useSolverDetail(activeChain?.id || 8453, address)

    if (loading) {
        return (
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center py-24">
                        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
                        <p className="text-gray-500 uppercase text-sm tracking-wider">Loading solver profile...</p>
                    </div>
                </div>
            </section>
        )
    }

    if (error || !solver) {
        return (
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-6">
                    <button onClick={onBack} className="flex items-center gap-2 mb-8 text-sm font-bold uppercase tracking-wider hover:text-red-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Explorer
                    </button>
                    <div className="swiss-card p-12 text-center">
                        <p className="text-gray-500 uppercase tracking-wider">Solver not found</p>
                        <code className="text-xs mt-2 block text-gray-400">{address}</code>
                    </div>
                </div>
            </section>
        )
    }

    const activityData = (solver.dailyActivity || []).map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        txs: d.count
    }))

    return (
        <>
            <SEO
                title={address ? `Solver ${shortenAddress(address)}` : 'Solver Profile'}
                description={`View performance analytics for solver ${address} on Gnoma Explorer.`}
                type="profile"
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
                            <div className="w-12 h-12 bg-[#0066CC] text-white flex items-center justify-center font-bold text-lg border-2 border-black dark:border-white">
                                S
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">Solver Profile</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="font-mono text-sm text-gray-600 dark:text-gray-400">{shortenAddress(address, 12, 10)}</code>
                                    {activeChain?.explorer_url && (
                                        <a href={`${activeChain.explorer_url}/address/${address}`} target="_blank" rel="noopener noreferrer"
                                            className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-black dark:text-white">
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#FF0000]" />
                                <div className="pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Volume</span>
                                    </div>
                                    <div className="font-bold text-lg text-black dark:text-white">{formatCurrency(solver.totalVolumeUsd || 0)}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#0066CC]" />
                                <div className="pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BarChart3 className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Transactions</span>
                                    </div>
                                    <div className="font-bold text-lg text-black dark:text-white">{formatNumber(solver.tx_count)}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-[#FFCC00]" />
                                <div className="pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Fuel className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Gas Spent</span>
                                    </div>
                                    <div className="font-bold text-lg text-black dark:text-white">{formatNumber(parseInt(solver.total_gas_spent || '0'))}</div>
                                </div>
                            </div>
                            <div className="swiss-card">
                                <div className="swiss-card-accent bg-black dark:bg-white" />
                                <div className="pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">Active Since</span>
                                    </div>
                                    <div className="font-bold text-sm text-black dark:text-white">{new Date(solver.first_seen * 1000).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500 mt-1">Last: {timeAgo(solver.last_seen)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Chart */}
                        {activityData.length > 0 && (
                            <div className="swiss-card mb-8">
                                <div className="swiss-card-accent bg-[#0066CC]" />
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                    Daily Activity (Last 30 Days)
                                </h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activityData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                                            <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} axisLine={{ stroke: '#000', strokeWidth: 2 }} />
                                            <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ border: '2px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000' }}
                                                labelStyle={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
                                            />
                                            <Bar dataKey="txs" fill="#0066CC" stroke="#000" strokeWidth={1} name="Transactions" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Recent Transactions */}
                        <div className="swiss-card">
                            <div className="swiss-card-accent bg-black dark:bg-white" />
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 pt-2">
                                <Wallet className="w-4 h-4 inline mr-1" /> Recent Transactions ({solver.recentTransactions?.length || 0})
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="swiss-table">
                                    <thead>
                                        <tr>
                                            <th>Tx Hash</th>
                                            <th>Block</th>
                                            <th>Gas</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(solver.recentTransactions || []).slice(0, 20).map((tx, i) => (
                                            <motion.tr
                                                key={tx.tx_hash}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                            >
                                                <td>
                                                    <button
                                                        onClick={() => onTxClick(tx.tx_hash)}
                                                        className="font-mono text-sm font-bold text-[#0066CC] hover:underline"
                                                    >
                                                        {shortenAddress(tx.tx_hash, 10, 8)}
                                                    </button>
                                                </td>
                                                <td className="font-bold tabular-nums text-black dark:text-white">{tx.block_number?.toLocaleString()}</td>
                                                <td className="tabular-nums text-black dark:text-white">{formatNumber(tx.gas_used)}</td>
                                                <td className="text-gray-600 dark:text-gray-400 text-sm">{timeAgo(tx.timestamp)}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    )
}

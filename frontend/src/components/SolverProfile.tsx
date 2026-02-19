import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Fuel, Clock, Wallet, TrendingUp, BarChart3 } from 'lucide-react'
import { SEO } from './SEO'
import { useSolverDetail } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { shortenAddress, formatCurrency, formatNumber, timeAgo } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TransactionTable } from './TransactionTable'

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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
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
                            
                            {/* Strategy Badges */}
                            <div className="flex flex-wrap gap-2">
                                {solver.badges?.map(badge => (
                                    <div key={badge} className="px-3 py-1.5 bg-[#FF0000] text-white text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_#000]">
                                        {badge}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strategy Breakdown Card */}
                        <div className="swiss-card mb-8 bg-zinc-900 text-white border-none">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Primary Logic</p>
                                    <div className="text-xl font-bold">
                                        {solver.forwarderCallsCount && solver.forwarderCallsCount > (solver.tx_count || 0) * 0.5 ? 'External Aggregator' : 'Direct Intent Matcher'}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">DeFi Interaction Rate</p>
                                    <div className="text-xl font-bold">
                                        {((solver.forwarderCallsCount || 0) / (solver.tx_count || 1) * 100).toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">Efficiency Rating</p>
                                    <div className="text-xl font-bold text-green-400">OPTIMAL</div>
                                </div>
                            </div>
                        </div>

                        {/* Big Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                            <div className="bg-black text-white p-8 md:p-12 border-4 border-black relative overflow-hidden group hover:bg-white hover:text-black transition-colors duration-500">
                                <TrendingUp className="w-8 h-8 md:w-12 md:h-12 absolute top-8 right-8 text-gray-700 group-hover:text-black transition-colors" />
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-4">Total Volume</h3>
                                <div className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums leading-none">
                                    {formatCurrency(solver.totalVolumeUsd || 0)}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 text-black dark:text-white p-8 md:p-12 border-4 border-black dark:border-white relative overflow-hidden group hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors duration-500">
                                <BarChart3 className="w-8 h-8 md:w-12 md:h-12 absolute top-8 right-8 text-gray-200 dark:text-zinc-800 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-4">Transactions</h3>
                                <div className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums leading-none">
                                    {formatNumber(solver.tx_count)}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 text-black dark:text-white p-8 md:p-12 border-4 border-black dark:border-white relative overflow-hidden group hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors duration-500">
                                <Fuel className="w-8 h-8 md:w-12 md:h-12 absolute top-8 right-8 text-gray-200 dark:text-zinc-800 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-400 mb-4">Gas Spent</h3>
                                <div className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums leading-none">
                                    {formatNumber(parseInt(solver.total_gas_spent || '0'))}
                                </div>
                            </div>
                            <div className="bg-[#FF0000] text-white p-8 md:p-12 border-4 border-[#FF0000] relative overflow-hidden group hover:bg-white hover:text-[#FF0000] hover:border-black transition-colors duration-500">
                                <Clock className="w-8 h-8 md:w-12 md:h-12 absolute top-8 right-8 text-white/20 group-hover:text-[#FF0000]/20 transition-colors" />
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-white/70 group-hover:text-gray-500 mb-4">Active Since</h3>
                                <div className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none mb-4">
                                    {new Date(solver.first_seen * 1000).toLocaleDateString()}
                                </div>
                                <div className="text-sm font-bold uppercase tracking-widest text-white/90 group-hover:text-black">
                                    Last seen: {timeAgo(solver.last_seen)}
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
                                <Wallet className="w-4 h-4 inline mr-1" /> Recent Transactions
                            </h3>
                            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
                                <TransactionTable
                                    searchQuery={address}
                                    onTxClick={onTxClick}
                                    onSolverClick={(addr) => addr !== address && onBack()} // Navigate if it's a different solver (unlikely here but consistent)
                                    hideHeader={true}
                                    compact={true}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </>
    )
}

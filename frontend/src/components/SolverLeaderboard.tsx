import { motion } from 'framer-motion'
import { Trophy, Award, Zap } from 'lucide-react'
import { useSolvers } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatNumber, shortenAddress } from '../lib/utils'

export function SolverLeaderboard() {
    const { activeChain } = useChainContext()
    const { solvers, loading } = useSolvers(activeChain?.id || 8453)

    // Calculate Intent Mastery (Volume Weight + Activity)
    const solversWithMastery = solvers.map(s => {
        const volume = parseFloat(s.total_value_processed || '0') / 1e18
        const txWeight = s.tx_count * 2
        const masteryScore = (volume + txWeight) / 10
        return { ...s, masteryScore }
    }).sort((a, b) => b.masteryScore - a.masteryScore)

    const topMaster = solversWithMastery.length > 0 ? solversWithMastery[0] : null

    const hasData = solversWithMastery.length > 0

    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-8 bg-[#FFCC00]" />
                        <Trophy className="w-6 h-6 text-black dark:text-white" />
                        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">Solver Leaderboard</h2>
                    </div>

                    <div className="swiss-card overflow-hidden">
                        <div className="swiss-card-accent bg-[#FFCC00]" />

                        {loading ? (
                            <div className="py-16 text-center text-gray-400 uppercase text-sm tracking-wider">
                                Loading leaderboard...
                            </div>
                        ) : hasData ? (
                            <div className="overflow-x-auto pt-2">
                                <table className="swiss-table">
                                    <thead>
                                        <tr>
                                            <th className="w-16">#</th>
                                            <th>Solver Address</th>
                                            <th className="text-right">Transactions</th>
                                            <th className="text-right">Volume (ETH)</th>
                                            <th className="text-right">Intent Mastery</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {solversWithMastery.map((solver, i) => (
                                            <motion.tr
                                                key={solver.address}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.05 }}
                                            >
                                                <td>
                                                    <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-[#FFCC00] text-black' :
                                                        i === 1 ? 'bg-gray-300 text-black' :
                                                            i === 2 ? 'bg-orange-300 text-black' : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                                                        } border-2 border-black dark:border-white`}>
                                                        {i + 1}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <a href={`#/solver/${solver.address}`}
                                                            className="font-mono text-sm font-bold text-[#0066CC] dark:text-[#3399FF] hover:underline cursor-pointer">
                                                            {shortenAddress(solver.address)}
                                                        </a>
                                                        {topMaster?.address === solver.address && (
                                                            <span className="swiss-badge flex items-center gap-1">
                                                                <Zap className="w-3 h-3" />
                                                                Master Solver
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-right font-bold tabular-nums text-black dark:text-white">
                                                    {formatNumber(solver.tx_count)}
                                                </td>
                                                <td className="text-right font-bold tabular-nums text-black dark:text-white">
                                                    {formatNumber(parseFloat(solver.total_value_processed || '0') / 1e18)}
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex items-center justify-end gap-2 text-black dark:text-white">
                                                        <span className="font-bold tabular-nums">{solver.masteryScore.toFixed(1)}</span>
                                                        <Award className="w-4 h-4 text-[#0066CC] dark:text-[#3399FF]" />
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-16 text-center text-gray-400 uppercase text-sm tracking-wider">
                                No solvers indexed yet — waiting for transactions
                            </div>
                        )}

                        {solversWithMastery.length > 0 && (
                            <div className="p-4 border-t-2 border-black dark:border-white bg-gray-50 dark:bg-gray-900 text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">
                                    Intent Mastery = (Volume Settled + (Transaction Count × 2)) / 10
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

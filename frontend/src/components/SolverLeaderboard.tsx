import { motion } from 'framer-motion'
import { Trophy, Zap, ArrowRight, Users } from 'lucide-react'
import { useSolvers } from '../lib/api'
import { useChainContext } from '../context/ChainContext'
import { formatNumber, shortenAddress, cn } from '../lib/utils'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

// Deterministic Swiss Identicon
const SwissIdenticon = ({ address, size = 32 }: { address: string; size?: number }) => {
    const seed = parseInt(address.slice(2, 10), 16)
    const colors = ['#FF0000', '#000000', '#0066CC', '#FFCC00', '#333333']
    const color = colors[seed % colors.length]

    return (
        <div
            className="overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0"
            style={{ width: size, height: size, borderRadius: 0 }} // Square for Swiss style
        >
            <svg width={size} height={size} viewBox="0 0 24 24">
                <rect x="0" y="0" width="24" height="24" fill={color} fillOpacity="0.1" />
                <rect x={seed % 10} y={seed % 10} width={10 + (seed % 10)} height={10 + (seed % 10)} fill={color} />
                <circle cx={12} cy={12} r={seed % 6} fill="white" fillOpacity="0.2" />
            </svg>
        </div>
    )
}

// Simulated Sparkline Data Generator
const generateSparklineData = (seed: string) => {
    const val = parseInt(seed.slice(2, 6), 16)
    return Array.from({ length: 10 }).map((_, i) => ({
        value: Math.abs(Math.sin(val + i) * 50 + 50)
    }))
}

export function SolverLeaderboard() {
    const { activeChain } = useChainContext()
    const { solvers, loading } = useSolvers(activeChain?.id || 8453)

    // Calculate Intent Mastery (Volume Weight + Activity)
    const solversWithMastery = solvers.map(s => {
        const volume = parseFloat(s.total_value_processed || '0') / 1e18
        const txWeight = s.tx_count * 2
        const masteryScore = (volume + txWeight) / 10
        return {
            ...s,
            masteryScore,
            sparklineData: generateSparklineData(s.address)
        }
    }).sort((a, b) => b.masteryScore - a.masteryScore)

    const topThree = solversWithMastery.slice(0, 3)
    const hasData = solversWithMastery.length > 0

    return (
        <section id="solver-leaderboard" className="py-24 bg-gray-50 dark:bg-zinc-900/20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-16 bg-[#FF0000]" />
                            <div>
                                <h2 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter text-black dark:text-white leading-[0.9]">
                                    Solver<br />Leaderboard
                                </h2>
                                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-2">
                                    Top performers by Volume & Efficiency
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-32 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin mb-4" />
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Syncing Solvers...</span>
                        </div>
                    ) : hasData ? (
                        <>
                            {/* Desktop Podium View */}
                            <div className="hidden md:flex items-end justify-center gap-4 mb-20 px-4">
                                {topThree[1] && (
                                    <div className="flex flex-col items-center w-full max-w-xs order-1 group">
                                        <div className="mb-4 relative">
                                            <SwissIdenticon address={topThree[1].address} size={64} />
                                            <div className="absolute -bottom-3 -right-3 bg-gray-200 text-black w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-white">2</div>
                                        </div>
                                        <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-zinc-700 p-6 relative top-0 group-hover:-top-2 transition-all duration-300">
                                            <div className="h-1 w-full bg-gray-200 absolute top-0 left-0" />
                                            <a href={`#/solver/${topThree[1].address}`} className="font-mono font-bold text-lg text-black dark:text-white hover:text-[#FF0000] hover:underline mb-1 block truncate text-center">
                                                {shortenAddress(topThree[1].address)}
                                            </a>
                                            <div className="text-center text-xs uppercase text-gray-500 font-bold tracking-wider mb-4">Silver Tier</div>

                                            <div className="grid grid-cols-2 gap-2 text-center border-t border-gray-100 dark:border-zinc-700 pt-4">
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400">Score</div>
                                                    <div className="font-bold text-lg">{topThree[1].masteryScore.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400">Volume</div>
                                                    <div className="font-bold text-sm">{formatNumber(parseFloat(topThree[1].total_value_processed || '0') / 1e18)}Ξ</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {topThree[0] && (
                                    <div className="flex flex-col items-center w-full max-w-sm order-2 z-10 -mt-12 group">
                                        <div className="mb-6 relative">
                                            <SwissIdenticon address={topThree[0].address} size={96} />
                                            <div className="absolute -bottom-4 -right-4 bg-[#FFCC00] text-black w-10 h-10 flex items-center justify-center font-bold text-lg border-4 border-white">1</div>
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#FFCC00] animate-bounce">
                                                <Trophy className="w-8 h-8 fill-current" />
                                            </div>
                                        </div>
                                        <div className="w-full bg-black dark:bg-white text-white dark:text-black p-8 relative top-0 group-hover:-top-2 transition-all duration-300 shadow-xl shadow-black/20">
                                            <div className="h-1.5 w-full bg-[#FFCC00] absolute top-0 left-0" />
                                            <a href={`#/solver/${topThree[0].address}`} className="font-mono font-bold text-xl hover:underline mb-1 block truncate text-center">
                                                {shortenAddress(topThree[0].address)}
                                            </a>
                                            <div className="text-center text-xs uppercase text-gray-400 dark:text-gray-600 font-bold tracking-wider mb-6">Top Performer</div>

                                            <div className="grid grid-cols-2 gap-4 text-center border-t border-gray-800 dark:border-gray-200 pt-6">
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500">Score</div>
                                                    <div className="font-bold text-2xl text-[#FFCC00]">{topThree[0].masteryScore.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500">Volume</div>
                                                    <div className="font-bold text-lg">{formatNumber(parseFloat(topThree[0].total_value_processed || '0') / 1e18)}Ξ</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {topThree[2] && (
                                    <div className="flex flex-col items-center w-full max-w-xs order-3 group">
                                        <div className="mb-4 relative">
                                            <SwissIdenticon address={topThree[2].address} size={64} />
                                            <div className="absolute -bottom-3 -right-3 bg-orange-300 text-black w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-white">3</div>
                                        </div>
                                        <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-zinc-700 p-6 relative top-0 group-hover:-top-2 transition-all duration-300">
                                            <div className="h-1 w-full bg-orange-300 absolute top-0 left-0" />
                                            <a href={`#/solver/${topThree[2].address}`} className="font-mono font-bold text-lg text-black dark:text-white hover:text-[#FF0000] hover:underline mb-1 block truncate text-center">
                                                {shortenAddress(topThree[2].address)}
                                            </a>
                                            <div className="text-center text-xs uppercase text-gray-500 font-bold tracking-wider mb-4">Bronze Tier</div>

                                            <div className="grid grid-cols-2 gap-2 text-center border-t border-gray-100 dark:border-zinc-700 pt-4">
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400">Score</div>
                                                    <div className="font-bold text-lg">{topThree[2].masteryScore.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase text-gray-400">Volume</div>
                                                    <div className="font-bold text-sm">{formatNumber(parseFloat(topThree[2].total_value_processed || '0') / 1e18)}Ξ</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Main List */}
                            <div className="swiss-border bg-white dark:bg-black overflow-hidden relative">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-black dark:border-white text-[10px] uppercase tracking-[0.2em] text-gray-500 bg-gray-50 dark:bg-zinc-900/50">
                                            <th className="p-4 w-16 text-center">#</th>
                                            <th className="p-4">Solver</th>
                                            <th className="p-4 w-32 hidden sm:table-cell">Trend</th>
                                            <th className="p-4 text-right">Txs</th>
                                            <th className="p-4 text-right">Volume</th>
                                            <th className="p-4 text-right text-black dark:text-white font-bold">Score</th>
                                            <th className="p-4 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {solversWithMastery.map((solver, i) => (
                                            <motion.tr
                                                key={solver.address}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.03 }}
                                                className="group border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                                            >
                                                <td className="p-4 text-center font-bold text-gray-400">
                                                    {i + 1}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <SwissIdenticon address={solver.address} size={28} />
                                                        <a href={`#/solver/${solver.address}`} className="font-mono-swiss text-sm font-bold text-black dark:text-white hover:text-[#0066CC] transition-colors">
                                                            {shortenAddress(solver.address)}
                                                        </a>
                                                        {i < 3 && <Zap className="w-3 h-3 text-[#FFCC00] fill-current hidden sm:block" />}
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden sm:table-cell">
                                                    <div className="h-8 w-24 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={solver.sparklineData}>
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="value"
                                                                    stroke={i < 3 ? "#FF0000" : "#666"}
                                                                    strokeWidth={2}
                                                                    dot={false}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-mono-swiss text-sm text-gray-600 dark:text-gray-400">
                                                    {formatNumber(solver.tx_count)}
                                                </td>
                                                <td className="p-4 text-right font-mono-swiss text-sm text-gray-600 dark:text-gray-400">
                                                    {formatNumber(parseFloat(solver.total_value_processed || '0') / 1e18)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className={cn(
                                                        "font-bold font-mono-swiss px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-md",
                                                        i < 3 && "bg-[#FF0000]/10 text-[#FF0000]"
                                                    )}>
                                                        {solver.masteryScore.toFixed(0)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="py-24 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
                            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 uppercase tracking-widest text-sm">No Solver Activity Detected</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </section>
    )
}


import React, { useState, useEffect } from 'react';
import { useChain } from '../context/ChainContext';
import { MOCK_STATS, MOCK_DAILY_ACTIVITY, MOCK_TRANSACTIONS } from '../utils/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart, Legend, Area } from 'recharts';
import { Activity, Layers, Zap, Box, Copy, ExternalLink, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Components (Simulated inline for single-file delivery) ---

// Card Component
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
        {children}
    </div>
);

// Stat Card
const StatCard = ({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) => (
    <Card className="p-6 relative group hover:border-indigo-500/50 transition-colors duration-300">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">{title}</p>
                <h3 className="text-3xl font-bold text-white mt-1 tabular-nums tracking-tight">{value}</h3>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                <Icon size={20} className="text-zinc-400 group-hover:text-indigo-400" />
            </div>
        </div>
        {trend && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
    </Card>
);

// Badge
const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: string }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.blue}`}>
            {children}
        </span>
    );
};

export default function Dashboard() {
    const { activeChain, activeChainId } = useChain();

    // Mock loading state
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, [activeChainId]);

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">

            {/* Sidebar / Header */}
            <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Zap className="text-white" size={18} fill="currentColor" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                            AnomaPay Explorer
                        </h1>
                    </div>

                    {/* Network Badge - Base Only (more chains coming soon) */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm font-medium">
                        <span className="text-lg">{activeChain.icon}</span>
                        <span>{activeChain.name}</span>
                        <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">Live</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Volume" value={`$${MOCK_STATS.totalVolume.toLocaleString()}`} icon={Layers} trend="up" />
                    <StatCard title="Intent Count" value={MOCK_STATS.intentCount.toLocaleString()} icon={Zap} trend="up" />
                    <StatCard title="Unique Solvers" value={MOCK_STATS.uniqueSolvers} icon={Activity} />
                    <StatCard title="Avg Gas Price" value={`${MOCK_STATS.avgGasPrice} Gwei`} icon={Rocket} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Chart */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <Activity size={18} className="text-indigo-400" />
                            Network Activity
                        </h2>
                        <Card className="p-6 h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={MOCK_DAILY_ACTIVITY}>
                                    <defs>
                                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="txs" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transactions" />
                                    <Area type="monotone" dataKey="volume" stroke="#818cf8" fillOpacity={1} fill="url(#colorVolume)" name="Volume (USD)" />
                                    <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* Live Feed */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <Box size={18} className="text-indigo-400" />
                            Recent Transactions
                        </h2>
                        <Card className="h-[400px] overflow-hidden flex flex-col">
                            <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {MOCK_TRANSACTIONS.map((tx, idx) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge color={tx.status === 'Settled' ? 'green' : 'amber'}>{tx.status}</Badge>
                                                <span className="text-xs text-zinc-500">{tx.time}</span>
                                            </div>
                                            <a href={`https://basescan.org/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="font-mono text-xs text-zinc-300 flex items-center gap-1.5">
                                                <span className="text-indigo-300">{tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}</span>
                                                <button className="text-zinc-600 hover:text-zinc-300">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                            <span className="text-sm font-bold text-white tabular-nums">{tx.value}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </div>

                </div>
            </main>
        </div>
    );
}

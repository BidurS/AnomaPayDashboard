import { motion } from 'framer-motion'
import { Globe, Zap, Database, Layers } from 'lucide-react'
import { cn } from '../lib/utils'

const DOMAINS = [
    { id: 'eth', name: 'Ethereum', icon: '💎', color: '#627EEA', x: 10, y: 20 },
    { id: 'opt', name: 'Optimism', icon: '🔴', color: '#FF0420', x: 10, y: 50 },
    { id: 'arb', name: 'Arbitrum', icon: '🔵', color: '#28A0F0', x: 10, y: 80 },
    { id: 'anoma', name: 'Anoma P2P', icon: '🛡️', color: '#FF0000', x: 50, y: 50, isHub: true },
    { id: 'base', name: 'Base (Settlement)', icon: '🔵', color: '#0052FF', x: 90, y: 50 },
]

export function CrossChainTopology() {
    return (
        <section className="py-24 bg-white dark:bg-black transition-colors duration-300 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-16 bg-black dark:bg-white" />
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                Multi-Domain<br />Topology
                            </h2>
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-2">
                                Anoma as the Unified Settlement Layer
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border-2 border-black dark:border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                            <span className="text-sm font-black text-green-500 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                                Interoperable
                            </span>
                        </div>
                        <div className="p-4 border-2 border-black dark:border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Engine</span>
                            <span className="text-sm font-black uppercase">Taiga / ARM</span>
                        </div>
                    </div>
                </div>

                <div className="swiss-card bg-gray-50 dark:bg-zinc-950 border-4 border-black dark:border-white/10 p-0 h-[500px] relative">
                    <div className="absolute inset-0 swiss-grid-bg opacity-30" />
                    
                    <svg className="w-full h-full relative z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Connecting Lines (Intent Flow) */}
                        <defs>
                            <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#666" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="#FF0000" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#0052FF" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>

                        {/* Origin to Anoma Hub */}
                        {[20, 50, 80].map((y, i) => (
                            <motion.path
                                key={`line-origin-${i}`}
                                d={`M 15 ${y} L 45 50`}
                                stroke="url(#flow-gradient)"
                                strokeWidth="0.5"
                                fill="none"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, repeatDelay: 3 }}
                            />
                        ))}

                        {/* Anoma Hub to Base Settlement */}
                        <motion.path
                            d="M 55 50 L 85 50"
                            stroke="#FF0000"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            fill="none"
                            animate={{ strokeDashoffset: [0, -10] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        />
                    </svg>

                    {/* Nodes (Domains) */}
                    <div className="absolute inset-0 pointer-events-none">
                        {DOMAINS.map((domain) => (
                            <motion.div
                                key={domain.id}
                                className={cn(
                                    "absolute w-24 md:w-32 p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white flex flex-col items-center gap-2 shadow-[6px_6px_0_#000] dark:shadow-none pointer-events-auto cursor-pointer group hover:-translate-y-1 transition-transform",
                                    domain.isHub && "w-32 md:w-40 border-[#FF0000] dark:border-[#FF0000] scale-110 z-20"
                                )}
                                style={{ left: `${domain.x}%`, top: `${domain.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                <span className="text-2xl">{domain.icon}</span>
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">
                                    {domain.name}
                                </span>
                                {domain.isHub && (
                                    <div className="mt-1 flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5 text-[#FF0000] fill-current" />
                                        <span className="text-[8px] font-bold text-[#FF0000]">SOLVING...</span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Floating Intent Particle */}
                    <motion.div
                        className="absolute w-4 h-4 bg-[#FF0000] rounded-full z-30 flex items-center justify-center shadow-[0_0_15px_#FF0000]"
                        animate={{ 
                            left: ['15%', '50%', '85%'],
                            top: ['20%', '50%', '50%'],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{ 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            times: [0, 0.4, 0.9, 1]
                        }}
                    >
                        <Layers className="w-2 h-2 text-white" />
                    </motion.div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex gap-4">
                        <Globe className="w-6 h-6 shrink-0" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Intent Gossip</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Users broadcast intents across various domains. Anoma's P2P layer aggregates these into a global preference graph.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Database className="w-6 h-6 shrink-0" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Heterogeneous Settlement</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Solvers find the most efficient execution path, settling the intent on the domain that provides the best liquidity and privacy.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Zap className="w-6 h-6 shrink-0 text-[#FF0000]" />
                        <div>
                            <h4 className="font-bold uppercase text-xs mb-2">Taiga Execution</h4>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Zero-knowledge state transitions ensure that only the result is revealed, while the path remains private.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

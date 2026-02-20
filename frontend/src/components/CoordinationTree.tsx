import { motion } from 'framer-motion'
import { User, Cpu, ArrowDown, Database, Shield } from 'lucide-react'

interface IntentNode {
    id: string
    sender: string
    appData?: any
}

interface CoordinationTreeProps {
    solverAddress: string
    intents?: IntentNode[]
    txHash: string
}

export function CoordinationTree({ solverAddress, intents = [], txHash }: CoordinationTreeProps) {
    const isMock = !intents || intents.length === 0;
    if (isMock) {
        // Fallback or mock intents if none are provided
        intents = [
            { id: 'mock-1', sender: '0xUSER_A', appData: { _decoded: { humanReadable: 'Swap USDC for ETH' } } },
            { id: 'mock-2', sender: '0xUSER_B', appData: { _decoded: { humanReadable: 'Swap ETH for NAM' } } },
            { id: 'mock-3', sender: '0xUSER_C', appData: { _decoded: { humanReadable: 'Swap NAM for USDC' } } }
        ]
    }

    const fadeUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <section className="py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#FF0000]" />
                    <h3 className="text-xl font-black uppercase tracking-tight">Coordination Tree</h3>
                </div>
                {isMock && (
                    <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-[8px] text-yellow-600 font-bold uppercase tracking-widest">
                        Showcase Simulation
                    </div>
                )}
            </div>
            
            <div className="relative border-2 border-black/10 dark:border-white/10 p-8 bg-gray-50 dark:bg-zinc-900 overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    
                    {/* LEAVES: User Intents */}
                    <div className="w-full flex justify-around items-start gap-4 mb-12">
                        {intents.map((intent, i) => (
                            <motion.div 
                                key={intent.id}
                                variants={fadeUp}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: i * 0.1 }}
                                className="flex-1 flex flex-col items-center relative"
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black flex items-center justify-center mb-4 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] z-10">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-center bg-white dark:bg-black border border-black/20 dark:border-white/20 p-3 w-full shadow-sm">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                                        {intent.sender.slice(0,8)}...
                                    </div>
                                    <div className="text-xs font-mono font-bold text-[#FF0000] leading-tight truncate px-1">
                                        {intent.appData?._decoded?.humanReadable || 'Shielded Intent'}
                                    </div>
                                </div>
                                {/* Connecting Line to Solver */}
                                <div className="absolute top-[3rem] left-1/2 w-0.5 h-16 bg-black/20 dark:bg-white/20 -translate-x-1/2 -z-10" />
                            </motion.div>
                        ))}
                    </div>

                    {/* ROOT: Solver Node */}
                    <motion.div 
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.4 }}
                        className="relative flex flex-col items-center"
                    >
                        <div className="w-16 h-16 border-4 border-[#FF0000] bg-red-50 dark:bg-[#FF0000]/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,0,0,0.3)] z-10">
                            <Cpu className="w-8 h-8 text-[#FF0000]" />
                        </div>
                        <div className="text-center bg-white dark:bg-black border-2 border-[#FF0000] p-4 min-w-[250px] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FF0000]">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                Solver Matching Node
                            </div>
                            <div className="text-sm font-mono font-bold">
                                {solverAddress.slice(0,10)}...
                            </div>
                            <div className="mt-2 text-[10px] text-[#FF0000] uppercase font-bold tracking-widest bg-red-50 dark:bg-[#FF0000]/20 inline-block px-2 py-1">
                                Composed {intents.length} Intents
                            </div>
                        </div>

                        {/* Connecting Line to Settlement */}
                        <div className="w-0.5 h-12 bg-black dark:bg-white my-2" />
                        <ArrowDown className="w-6 h-6 text-black dark:text-white mb-2 animate-bounce" />

                        {/* SETTLEMENT: Final Transaction */}
                        <div className="text-center bg-black text-white dark:bg-white dark:text-black p-4 min-w-[300px]">
                            <div className="flex justify-center mb-2">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">
                                Settled Transaction
                            </div>
                            <div className="text-sm font-mono font-bold break-all">
                                {txHash}
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    )
}

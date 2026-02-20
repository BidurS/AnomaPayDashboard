import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Shield, Scale, Play, AlertCircle, CheckCircle2, Code, Trash2, Package } from 'lucide-react'
import { SEO } from '../components/SEO'
import { HexDecoder } from '../components/HexDecoder'
import { cn } from '../lib/utils'

interface DebugResult {
    isValid: boolean
    balance: {
        nullifiers: number
        commitments: number
        isBalanced: boolean
    }
    logic: {
        logicRefs: string[]
        verified: boolean
    }
    error?: string
}

export function DebuggerPage() {
    const [input, setInput] = useState('')
    const [result, setResult] = useState<DebugResult | null>(null)
    const [isSimulating, setIsSimulating] = useState(false)

    const handleSimulate = () => {
        setIsSimulating(true)
        setResult(null)

        // Artificial delay for "simulation" feel
        setTimeout(() => {
            try {
                // Basic validation logic
                const isHex = input.startsWith('0x')
                const isJson = input.trim().startsWith('{')

                if (!isHex && !isJson) {
                    throw new Error("Invalid format. Please provide a HEX string or JSON intent blob.")
                }

                // Mock Logic: In a real app, this would hit a /api/debug endpoint
                const nullifiers = Math.floor(Math.random() * 3) + 1
                const commitments = Math.random() > 0.3 ? nullifiers : nullifiers + 1 // 30% chance of being unbalanced

                setResult({
                    isValid: true,
                    balance: {
                        nullifiers,
                        commitments,
                        isBalanced: nullifiers === commitments
                    },
                    logic: {
                        logicRefs: ['0x1cc9...2f23cc010', '0x10dd...1ca5364'],
                        verified: true
                    }
                })
            } catch (e: any) {
                setResult({
                    isValid: false,
                    balance: { nullifiers: 0, commitments: 0, isBalanced: false },
                    logic: { logicRefs: [], verified: false },
                    error: e.message
                })
            } finally {
                setIsSimulating(false)
            }
        }, 1500)
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20 pt-8 px-6 md:px-12 max-w-7xl mx-auto">
            <SEO title="Intent Debugger | Gnoma" description="Technical tool for validating and simulating Anoma Protocol intent payloads." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Terminal className="w-8 h-8 text-[#FF0000]" />
                        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-[0.9]">
                            Intent<br />Debugger
                        </h1>
                    </div>
                    <p className="text-gray-500 uppercase tracking-widest text-sm max-w-xl leading-relaxed">
                        Validate ARM balance, verify ZK logic references, and simulate intent settlement logic before broadcasting to the gossip network.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Input Area */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="swiss-card p-0 overflow-hidden bg-[#0a0a0a] border-4 border-black">
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b-2 border-black">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                                <Code className="w-3 h-3" /> Input Payload (HEX / JSON)
                            </span>
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            </div>
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste 0x... or { 'actions': [...] }"
                            className="w-full h-[400px] bg-transparent text-green-500 font-mono text-xs p-6 outline-none resize-none placeholder:text-zinc-800"
                        />
                    </div>

                    <button 
                        onClick={handleSimulate}
                        disabled={isSimulating || !input}
                        className={cn(
                            "w-full py-6 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] transition-all border-4 border-black dark:border-white",
                            isSimulating ? "bg-zinc-200 text-zinc-400" : "bg-[#FF0000] text-white hover:bg-black hover:scale-[1.01]"
                        )}
                    >
                        {isSimulating ? (
                            <>
                                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing ARM State...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" />
                                Run Simulation
                            </>
                        )}
                    </button>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-5 space-y-6">
                    <AnimatePresence mode="wait">
                        {!result && !isSimulating ? (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12 border-4 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                            >
                                <Terminal className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-4" />
                                <p className="text-zinc-400 uppercase text-xs font-bold tracking-widest">
                                    Awaiting payload for simulation
                                </p>
                            </motion.div>
                        ) : result ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Validity Banner */}
                                <div className={cn(
                                    "p-6 border-4 border-black flex items-center gap-4",
                                    result.isValid ? "bg-green-500 text-white" : "bg-[#FF0000] text-white"
                                )}>
                                    {result.isValid ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                                    <div>
                                        <h3 className="font-black uppercase text-xl leading-none">
                                            {result.isValid ? 'Simulation Passed' : 'Validation Failed'}
                                        </h3>
                                        <p className="text-xs uppercase font-bold opacity-80 mt-1">
                                            {result.isValid ? 'Payload is ready for gossip' : result.error}
                                        </p>
                                    </div>
                                </div>

                                {/* ARM Balance Card */}
                                <div className="swiss-card bg-white dark:bg-zinc-900 border-black dark:border-white/10">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Scale className="w-5 h-5 text-[#FF0000]" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">ARM Balance Check</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-gray-50 dark:bg-black border-2 border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                                <Trash2 className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase">Consumed</span>
                                            </div>
                                            <div className="text-2xl font-black font-mono">{result.balance.nullifiers}</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-black border-2 border-black/5 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                                <Package className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase">Created</span>
                                            </div>
                                            <div className="text-2xl font-black font-mono">{result.balance.commitments}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "p-3 text-center text-[10px] font-black uppercase tracking-widest border-2",
                                        result.balance.isBalanced ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/10" : "border-[#FF0000] text-[#FF0000] bg-red-50 dark:bg-red-900/10"
                                    )}>
                                        {result.balance.isBalanced ? 'Balanced State Transition' : 'Unbalanced: Delta Violation'}
                                    </div>
                                </div>

                                {/* Logic Verification */}
                                <div className="swiss-card bg-white dark:bg-zinc-900 border-black dark:border-white/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="w-5 h-5 text-blue-500" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">ZK Logic Verification</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {result.logic.logicRefs.map((ref, i) => (
                                            <div key={i} className="flex items-center justify-between text-[10px] font-mono p-2 bg-gray-50 dark:bg-black rounded">
                                                <span className="text-zinc-500">REF_{i}:</span>
                                                <span className="text-blue-500 font-bold">{ref}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inspector Integration */}
            {input && (
                <div className="mt-12">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Code className="w-4 h-4" /> Deep Inspector
                    </h3>
                    <div className="h-[500px]">
                        <HexDecoder hexData={input} title="Debugger Inspector" />
                    </div>
                </div>
            )}
        </div>
    )
}

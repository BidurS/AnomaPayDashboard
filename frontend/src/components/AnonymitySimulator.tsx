import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck, Info } from 'lucide-react'
import { cn } from '../lib/utils'

export function AnonymitySimulator({ poolSize = 1200 }: { poolSize?: number }) {
    const [isShielded, setIsShielded] = useState(false)
    const [resources, setResources] = useState<{ x: number, y: number, id: number }[]>([])

    // Generate a small sample of the pool for visualization
    useEffect(() => {
        const dots = Array.from({ length: 150 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100
        }))
        setResources(dots)
    }, [])

    const myResourceId = 42

    return (
        <div className="swiss-card bg-white dark:bg-black border-4 border-black dark:border-white/20 p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-[#FF0000]" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Anonymity Set Visualizer</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
                        In Anoma, your transaction doesn't exist in isolation. It hides within a **Shielded Pool** of {poolSize.toLocaleString()} other resource commitments. 
                        To an observer, any one of these commitments could be yours.
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900 border-2 border-black dark:border-white/10">
                            <span className="text-xs font-bold uppercase">Traceability Probability</span>
                            <span className="font-mono font-black text-xl text-[#FF0000]">
                                {isShielded ? `~${(1/poolSize * 100).toFixed(4)}%` : '100%'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsShielded(!isShielded)}
                            className={cn(
                                "w-full py-4 px-6 flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all",
                                isShielded 
                                    ? "bg-[#FF0000] text-white" 
                                    : "bg-black text-white dark:bg-white dark:text-black"
                            )}
                        >
                            {isShielded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            {isShielded ? 'Unmask My Intent' : 'Shield My Intent'}
                        </button>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold uppercase leading-tight">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>The larger the pool, the harder it is for solvers or observers to link resource consumption to creation.</span>
                    </div>
                </div>

                {/* Visualization Pane */}
                <div className="flex-1 min-h-[300px] bg-gray-100 dark:bg-zinc-900 relative rounded-lg border-2 border-black/5 dark:border-white/5 overflow-hidden group">
                    <div className="absolute inset-0 swiss-grid-bg opacity-20" />
                    
                    {/* Floating Resource Commitments */}
                    <div className="absolute inset-0 p-4">
                        {resources.map((r) => (
                            <motion.div
                                key={r.id}
                                className={cn(
                                    "absolute w-2 h-2 rounded-full",
                                    r.id === myResourceId 
                                        ? (isShielded ? "bg-gray-400 dark:bg-zinc-600" : "bg-[#FF0000] shadow-[0_0_15px_#FF0000] z-10 scale-150")
                                        : "bg-gray-300 dark:bg-zinc-700"
                                )}
                                initial={{ x: `${r.x}%`, y: `${r.y}%` }}
                                animate={{ 
                                    x: [`${r.x}%`, `${(r.x + 2) % 100}%`, `${r.x}%`],
                                    y: [`${r.y}%`, `${(r.y + 1) % 100}%`, `${r.y}%`],
                                }}
                                transition={{ 
                                    duration: 10 + Math.random() * 20, 
                                    repeat: Infinity, 
                                    ease: "linear" 
                                }}
                            >
                                {r.id === myResourceId && !isShielded && (
                                    <motion.div 
                                        className="absolute -inset-2 border border-[#FF0000] rounded-full"
                                        animate={{ scale: [1, 2], opacity: [1, 0] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {!isShielded && (
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 p-2 text-[9px] font-bold uppercase border border-black rounded shadow-xl">
                            Status: <span className="text-[#FF0000]">Transparent</span>
                        </div>
                    )}
                    {isShielded && (
                        <div className="absolute top-4 right-4 bg-[#FF0000] p-2 text-[9px] font-bold uppercase text-white border border-black rounded shadow-xl">
                            Status: <span className="text-white">Shielded (1 of {poolSize})</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

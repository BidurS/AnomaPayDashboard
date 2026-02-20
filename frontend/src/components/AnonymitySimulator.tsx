import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck, Info } from 'lucide-react'
import { cn } from '../lib/utils'

interface ResourceNode {
    id: number
    x: number
    y: number
    maturity: number
}

export function AnonymitySimulator({ poolSize = 1200 }: { poolSize?: number }) {
    const [isShielded, setIsShielded] = useState(false)
    const [resources, setResources] = useState<ResourceNode[]>([])

    // Generate initial pool
    useEffect(() => {
        const dots = Array.from({ length: 150 }).map((_, i) => ({
            id: i,
            x: Math.random() * 95,
            y: Math.random() * 95,
            maturity: Math.random() * 100 // 0-100 scale of "age"
        }))
        setResources(dots)
    }, [])

    // Simulate "Forest" dynamics (churn: consumption and creation)
    useEffect(() => {
        const interval = setInterval(() => {
            setResources(prev => {
                let next = [...prev]
                // Simulate nullifier (consumption)
                if (Math.random() > 0.5 && next.length > 50) {
                    const removeIdx = Math.floor(Math.random() * next.length)
                    next.splice(removeIdx, 1)
                }
                // Simulate commitment (creation)
                if (Math.random() > 0.3) {
                    next.push({
                        id: Date.now(),
                        x: Math.random() * 95,
                        y: Math.random() * 95,
                        maturity: 0 // New sprout
                    })
                }
                // Age all nodes slightly
                next = next.map(r => ({ ...r, maturity: Math.min(100, r.maturity + 2) }))
                
                // Keep max count reasonable for performance
                if (next.length > 200) next.shift();
                
                return next
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const myResourceId = resources.length > 0 ? resources[0].id : -1

    return (
        <div className="swiss-card bg-white dark:bg-black border-4 border-black dark:border-white/20 p-8 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-[#FF0000]" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">The Forest of Commitments</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
                        In Anoma's Shielded Resource Machine, commitments grow like a forest. New resources are small "sprouts." 
                        Older resources grow "deep roots," offering higher anonymity. When consumed via a nullifier, the resource disappears. 
                        Your transaction hides among {poolSize.toLocaleString()} others.
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
                        <span>Visualizing real-time commitment churn (creation & consumption).</span>
                    </div>
                </div>

                {/* Visualization Pane */}
                <div className="flex-1 min-h-[300px] bg-gray-100 dark:bg-zinc-900 relative rounded-lg border-2 border-black/5 dark:border-white/5 overflow-hidden group">
                    <div className="absolute inset-0 swiss-grid-bg opacity-20" />
                    
                    {/* Generational Forest */}
                    <div className="absolute inset-0 p-4">
                        <AnimatePresence>
                            {resources.map((r) => {
                                const size = Math.max(4, (r.maturity / 100) * 16)
                                const isMine = r.id === myResourceId
                                
                                return (
                                    <motion.div
                                        key={r.id}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        className={cn(
                                            "absolute flex items-center justify-center",
                                            isMine && !isShielded ? "z-20" : "z-10"
                                        )}
                                        style={{ left: `${r.x}%`, top: `${r.y}%`, width: size, height: size }}
                                    >
                                        <div className={cn(
                                            "w-full h-full rounded-sm border border-black/20 dark:border-white/20 transition-all duration-1000",
                                            isMine
                                                ? (isShielded ? "bg-gray-400 dark:bg-zinc-600" : "bg-[#FF0000] shadow-[0_0_15px_#FF0000] scale-150")
                                                : (r.maturity > 80 ? "bg-black dark:bg-white" : "bg-gray-300 dark:bg-zinc-700")
                                        )} />
                                        
                                        {isMine && !isShielded && (
                                            <motion.div 
                                                className="absolute -inset-2 border-2 border-[#FF0000] rounded-sm"
                                                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                        )}
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>

                    {!isShielded && (
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/90 p-2 text-[9px] font-bold uppercase border border-black rounded shadow-xl z-30">
                            Status: <span className="text-[#FF0000]">Transparent</span>
                        </div>
                    )}
                    {isShielded && (
                        <div className="absolute top-4 right-4 bg-[#FF0000] p-2 text-[9px] font-bold uppercase text-white border border-black rounded shadow-xl z-30">
                            Status: <span className="text-white">Shielded (1 of {poolSize})</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

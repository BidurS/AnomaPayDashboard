import { motion } from 'framer-motion'
import { Scale, Package, Trash2, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface ResourceScaleProps {
    nullifierCount: number
    commitmentCount: number
    txHash: string
    className?: string
}

export function ResourceScale({ nullifierCount, commitmentCount, txHash, className }: ResourceScaleProps) {
    // A transaction is balanced if delta is zero. 
    // In ARM terms, consuming state (nullifiers) must be balanced by creating state (commitments).
    // We visualize this as a literal scale.
    
    const total = nullifierCount + commitmentCount
    
    // Balance tilt (-15 to 15 degrees)
    const tilt = total === 0 ? 0 : (commitmentCount - nullifierCount) * 5
    const normalizedTilt = Math.max(-20, Math.min(20, tilt))

    return (
        <div className={cn("swiss-card bg-gray-50 dark:bg-zinc-950 overflow-hidden", className)}>
            <div className="swiss-card-accent bg-black dark:bg-white" />
            
            <div className="flex items-center justify-between mb-8 pt-2">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#FF0000]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Abstract Resource Machine</h3>
                </div>
                <div className="px-2 py-1 bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold uppercase tracking-tighter">
                    Status: {nullifierCount === commitmentCount ? 'Balanced' : 'Delta Propagated'}
                </div>
            </div>

            {/* The Scale Visualization */}
            <div className="relative py-12 flex flex-col items-center">
                <motion.div 
                    className="w-full max-w-[300px] h-1 bg-black dark:bg-white relative flex items-center justify-between"
                    animate={{ rotate: normalizedTilt }}
                    transition={{ type: 'spring', stiffness: 100, damping: 10 }}
                >
                    {/* Left Plate (Nullifiers) */}
                    <div className="absolute -left-4 -top-8 flex flex-col items-center">
                        <div className="w-12 h-12 border-2 border-black dark:border-white rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 shadow-[4px_4px_0_#000] dark:shadow-none mb-2">
                            <Trash2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-gray-500">Consumed</span>
                        <span className="text-lg font-black font-mono">{nullifierCount}</span>
                    </div>

                    {/* Right Plate (Commitments) */}
                    <div className="absolute -right-4 -top-8 flex flex-col items-center">
                        <div className="w-12 h-12 border-2 border-black dark:border-white rounded-full flex items-center justify-center bg-white dark:bg-zinc-900 shadow-[4px_4px_0_#000] dark:shadow-none mb-2">
                            <Package className="w-5 h-5 text-[#FF0000]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-gray-500">Created</span>
                        <span className="text-lg font-black font-mono">{commitmentCount}</span>
                    </div>

                    {/* Center Pivot */}
                    <div className="w-4 h-4 bg-[#FF0000] rounded-full absolute left-1/2 -translate-x-1/2 z-20 border-2 border-black" />
                </motion.div>
                
                {/* Scale Stand */}
                <div className="w-1 h-16 bg-black dark:bg-white mt-[-2px]" />
                <div className="w-16 h-2 bg-black dark:bg-white" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/5 dark:border-white/5 pt-6">
                <div className="text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">State Transition</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="font-mono text-xs text-gray-400">-{nullifierCount}</span>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <span className="font-mono text-xs text-green-500">+{commitmentCount}</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Logic Mapping</p>
                    <span className="font-mono text-[10px] text-black dark:text-zinc-300">{txHash.slice(0, 14)}...</span>
                </div>
            </div>

            <p className="mt-6 text-[10px] text-gray-400 leading-tight">
                Anoma transactions are valid only if the **resource delta** is zero or balanced by a proving key. This scale visualizes the conversion of old resources into new private state.
            </p>
        </div>
    )
}

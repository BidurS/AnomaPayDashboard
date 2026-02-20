import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Box } from 'lucide-react'
import type { TokenTransfer } from '../lib/api'
import { shortenAddress } from '../lib/utils'

interface RingTradeVisualizerProps {
    transfers: TokenTransfer[]
    solverAddress?: string
}

interface Node {
    address: string
    x: number
    y: number
    isSolver: boolean
}

interface Edge {
    from: Node
    to: Node
    amount: string
    token: string
    isSolverMargin: boolean
}

export function RingTradeVisualizer({ transfers, solverAddress }: RingTradeVisualizerProps) {
    // 1. Extract unique addresses
    const uniqueAddresses = useMemo(() => {
        const set = new Set<string>()
        transfers.forEach(t => {
            if (t.from_address) set.add(t.from_address)
            if (t.to_address) set.add(t.to_address)
        })
        // Ensure solver is included if provided and not already there
        if (solverAddress && !set.has(solverAddress.toLowerCase()) && transfers.some(t => t.from_address?.toLowerCase() === solverAddress.toLowerCase() || t.to_address?.toLowerCase() === solverAddress.toLowerCase())) {
            set.add(solverAddress.toLowerCase())
        }
        return Array.from(set)
    }, [transfers, solverAddress])

    // 2. Calculate coordinates (Circular Layout)
    const SVG_SIZE = 400
    const RADIUS = 140
    const CENTER = SVG_SIZE / 2

    const nodes: Node[] = useMemo(() => {
        const total = uniqueAddresses.length
        return uniqueAddresses.map((address, i) => {
            // Start at top (-PI/2) and go clockwise
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2
            const isSolver = solverAddress ? address.toLowerCase() === solverAddress.toLowerCase() : false
            return {
                address,
                x: CENTER + RADIUS * Math.cos(angle),
                y: CENTER + RADIUS * Math.sin(angle),
                isSolver
            }
        })
    }, [uniqueAddresses, CENTER, RADIUS, solverAddress])

    // 3. Map transfers to edges
    const edges: Edge[] = useMemo(() => {
        return transfers.map(t => {
            const fromNode = nodes.find(n => n.address.toLowerCase() === t.from_address?.toLowerCase())!
            const toNode = nodes.find(n => n.address.toLowerCase() === t.to_address?.toLowerCase())!
            const isSolverMargin = fromNode.isSolver || toNode.isSolver
            return {
                from: fromNode,
                to: toNode,
                amount: t.amount_display?.toFixed(2) || '0.00',
                token: t.token_symbol || 'TOK',
                isSolverMargin
            }
        })
    }, [transfers, nodes])

    // Only show graph if we have 3 or more unique actors (a true "ring" or complex trade)
    // Otherwise, a simple linear flow is fine, but we'll show it anyway for consistency
    const isComplex = uniqueAddresses.length >= 3

    return (
        <section className="swiss-border p-6 bg-white dark:bg-black mt-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-[#FF0000]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">
                        {isComplex ? 'Multi-Party Settlement Graph' : 'Transfer Flow'}
                    </h3>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-mono text-gray-500">
                    {uniqueAddresses.length} Participants • {edges.length} Transfers
                </div>
            </div>

            {/* Legend */}
            {solverAddress && edges.some(e => e.isSolverMargin) && (
                <div className="flex gap-4 mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 justify-center">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#FF0000]"></div>
                        <span>Solver Margin</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span className="text-green-600 dark:text-green-500">CoW (Direct Peer)</span>
                    </div>
                </div>
            )}

            <div className="relative flex justify-center items-center w-full overflow-x-auto pb-4">
                {/* SVG Graph rendering */}
                <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
                    <svg width={SVG_SIZE} height={SVG_SIZE} className="absolute inset-0 overflow-visible">
                        {/* Define Arrowhead marker */}
                        <defs>
                            <marker
                                id="arrowhead-solver"
                                markerWidth="10"
                                markerHeight="7"
                                refX="35" // Offset to avoid drawing inside the node circle
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#FF0000" />
                            </marker>
                            <marker
                                id="arrowhead-cow"
                                markerWidth="10"
                                markerHeight="7"
                                refX="35"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                            </marker>
                        </defs>

                        {/* Draw Edges */}
                        {edges.map((edge, i) => {
                            // Calculate mid-point for label
                            const midX = (edge.from.x + edge.to.x) / 2
                            const midY = (edge.from.y + edge.to.y) / 2
                            const strokeColor = edge.isSolverMargin ? "#FF0000" : "#22c55e"
                            const markerId = edge.isSolverMargin ? "url(#arrowhead-solver)" : "url(#arrowhead-cow)"

                            return (
                                <g key={`edge-${i}`}>
                                    <motion.line
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 1, delay: i * 0.2 }}
                                        x1={edge.from.x}
                                        y1={edge.from.y}
                                        x2={edge.to.x}
                                        y2={edge.to.y}
                                        stroke={strokeColor}
                                        strokeWidth={edge.isSolverMargin ? "1.5" : "2.5"}
                                        strokeDasharray={edge.isSolverMargin ? "4 4" : "none"}
                                        markerEnd={markerId}
                                    />

                                    {/* Transfer Amount Label */}
                                    <motion.g
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 + (i * 0.2) }}
                                    >
                                        <rect
                                            x={midX - 45}
                                            y={midY - 12}
                                            width="90"
                                            height="24"
                                            fill="white"
                                            className="dark:fill-black stroke-black dark:stroke-white stroke-1"
                                            rx="4"
                                        />
                                        <text
                                            x={midX}
                                            y={midY + 4}
                                            textAnchor="middle"
                                            className="text-[10px] font-mono font-bold fill-black dark:fill-white"
                                        >
                                            {edge.amount} {edge.token}
                                        </text>
                                    </motion.g>
                                </g>
                            )
                        })}

                        {/* Draw Nodes */}
                        {nodes.map((node, i) => (
                            <motion.g
                                key={`node-${i}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.4, delay: i * 0.1 }}
                            >
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.isSolver ? "28" : "24"}
                                    className={node.isSolver ? "fill-[#FF0000]" : "fill-black dark:fill-white"}
                                />
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={node.isSolver ? "26" : "22"}
                                    className="fill-white dark:fill-black stroke-black dark:stroke-white stroke-2"
                                />
                                <text
                                    x={node.x}
                                    y={node.y + 40}
                                    textAnchor="middle"
                                    className={`text-[10px] font-mono font-bold uppercase tracking-wider ${node.isSolver ? 'fill-[#FF0000]' : 'fill-black dark:fill-white'}`}
                                >
                                    {node.isSolver ? 'SOLVER' : shortenAddress(node.address, 4, 4)}
                                </text>
                            </motion.g>
                        ))}
                    </svg>
                </div>
            </div>

            {/* Linear List Fallback / Detail */}
            <div className="mt-8 border-t border-black/10 dark:border-white/10 pt-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 block">Legs</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {edges.map((edge, i) => (
                        <div key={`leg-${i}`} className={`flex items-center justify-between p-2 border ${edge.isSolverMargin ? 'bg-[#FF0000]/5 border-[#FF0000]/20' : 'bg-green-500/5 border-green-500/20'} dark:bg-zinc-900`}>
                            <span className="font-mono text-xs">{shortenAddress(edge.from.address)}</span>
                            <div className={`flex flex-col items-center px-2 ${edge.isSolverMargin ? 'text-[#FF0000]' : 'text-green-600 dark:text-green-500'}`}>
                                <span className="text-[10px] font-bold">{edge.amount} {edge.token}</span>
                                <ArrowRight className="w-3 h-3" />
                            </div>
                            <span className="font-mono text-xs">{shortenAddress(edge.to.address)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

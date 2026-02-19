import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Box } from 'lucide-react'
import type { TokenTransfer } from '../lib/api'
import { shortenAddress } from '../lib/utils'

interface RingTradeVisualizerProps {
    transfers: TokenTransfer[]
}

interface Node {
    address: string
    x: number
    y: number
}

interface Edge {
    from: Node
    to: Node
    amount: string
    token: string
}

export function RingTradeVisualizer({ transfers }: RingTradeVisualizerProps) {
    // 1. Extract unique addresses
    const uniqueAddresses = useMemo(() => {
        const set = new Set<string>()
        transfers.forEach(t => {
            if (t.from_address) set.add(t.from_address)
            if (t.to_address) set.add(t.to_address)
        })
        return Array.from(set)
    }, [transfers])

    // 2. Calculate coordinates (Circular Layout)
    const SVG_SIZE = 400
    const RADIUS = 140
    const CENTER = SVG_SIZE / 2

    const nodes: Node[] = useMemo(() => {
        const total = uniqueAddresses.length
        return uniqueAddresses.map((address, i) => {
            // Start at top (-PI/2) and go clockwise
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2
            return {
                address,
                x: CENTER + RADIUS * Math.cos(angle),
                y: CENTER + RADIUS * Math.sin(angle)
            }
        })
    }, [uniqueAddresses, CENTER, RADIUS])

    // 3. Map transfers to edges
    const edges: Edge[] = useMemo(() => {
        return transfers.map(t => {
            const fromNode = nodes.find(n => n.address === t.from_address)!
            const toNode = nodes.find(n => n.address === t.to_address)!
            return {
                from: fromNode,
                to: toNode,
                amount: t.amount_display?.toFixed(2) || '0.00',
                token: t.token_symbol || 'TOK'
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

            <div className="relative flex justify-center items-center w-full overflow-x-auto pb-4">
                {/* SVG Graph rendering */}
                <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
                    <svg width={SVG_SIZE} height={SVG_SIZE} className="absolute inset-0 overflow-visible">
                        {/* Define Arrowhead marker */}
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="35" // Offset to avoid drawing inside the node circle
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#FF0000" />
                            </marker>
                            <marker
                                id="arrowhead-dark"
                                markerWidth="10"
                                markerHeight="7"
                                refX="35"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill="#FF0000" />
                            </marker>
                        </defs>

                        {/* Draw Edges */}
                        {edges.map((edge, i) => {
                            // Calculate mid-point for label
                            const midX = (edge.from.x + edge.to.x) / 2
                            const midY = (edge.from.y + edge.to.y) / 2

                            // Slight curve for bidirectional paths (simplified as straight lines here)
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
                                        stroke="#FF0000"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        markerEnd="url(#arrowhead)"
                                        className="hidden dark:block"
                                    />
                                    <motion.line
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 1, delay: i * 0.2 }}
                                        x1={edge.from.x}
                                        y1={edge.from.y}
                                        x2={edge.to.x}
                                        y2={edge.to.y}
                                        stroke="#FF0000" // Always red in light mode too for swiss contrast
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                        markerEnd="url(#arrowhead-dark)"
                                        className="block dark:hidden"
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
                                    r="24"
                                    className="fill-black dark:fill-white"
                                />
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r="22"
                                    className="fill-white dark:fill-black stroke-black dark:stroke-white stroke-2"
                                />
                                <text
                                    x={node.x}
                                    y={node.y + 40}
                                    textAnchor="middle"
                                    className="text-[10px] font-mono font-bold fill-black dark:fill-white uppercase tracking-wider"
                                >
                                    {shortenAddress(node.address, 4, 4)}
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
                        <div key={`leg-${i}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5">
                            <span className="font-mono text-xs">{shortenAddress(edge.from.address)}</span>
                            <div className="flex flex-col items-center px-2 text-[#FF0000]">
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

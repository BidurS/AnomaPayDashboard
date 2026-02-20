import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Activity } from 'lucide-react'
import { SEO } from '../components/SEO'
import { MOCK_DOMAINS } from '../lib/api'

// Simple helper to generate a random 0-100 percentage
const randPercent = () => Math.floor(Math.random() * 100)

export function DomainsPage() {
    const [activeNode, setActiveNode] = useState<number | null>(8453) // Default to global hub
    const [traffic, setTraffic] = useState<{ from: number, to: number }[]>([])

    // Simulate cross-domain intent gossip
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.4) {
                const from = MOCK_DOMAINS[Math.floor(Math.random() * MOCK_DOMAINS.length)].id
                let to = MOCK_DOMAINS[Math.floor(Math.random() * MOCK_DOMAINS.length)].id
                while (from === to) {
                    to = MOCK_DOMAINS[Math.floor(Math.random() * MOCK_DOMAINS.length)].id
                }

                setTraffic(prev => [...prev, { from, to }].slice(-10)) // keep last 10
            }
        }, 1200)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20 pt-8 px-6 lg:px-12 max-w-7xl mx-auto overflow-hidden">
            <SEO title="Sovereign Domains | Gnoma" description="Visual network topology of Anoma's fractal instances and connected rollups." />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8 gap-6 z-10 relative">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Network className="w-8 h-8 text-[#FF0000]" />
                        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight leading-[0.9]">
                            Sovereign<br />Domains
                        </h1>
                    </div>
                    <p className="text-gray-500 uppercase tracking-widest text-sm max-w-xl leading-relaxed">
                        Anoma’s architecture scales limitlessly via fractal instances. Each domain is a sovereign environment that seamlessly settles cross-domain intents across the global gossip network.
                    </p>
                    <div className="mt-4 inline-block bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs text-blue-500 font-bold uppercase tracking-widest">
                        Visualizing Mock Topology
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="swiss-border bg-gray-50 dark:bg-zinc-900 p-4 min-w-[120px]">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Active Domains
                        </div>
                        <div className="text-3xl font-mono-swiss text-black dark:text-white">{MOCK_DOMAINS.length}</div>
                    </div>
                </div>
            </div>

            {/* Topology Map Container */}
            <div className="relative w-full h-[60vh] min-h-[500px] border-4 border-black dark:border-white/10 bg-gray-50 dark:bg-[#050505] overflow-hidden flex items-center justify-center">

                {/* Background grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

                {/* Central Hub */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    onClick={() => setActiveNode(MOCK_DOMAINS[0].id)}
                    className={`absolute z-20 w-32 h-32 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_0_50px_rgba(255,0,0,0.2)]
                        ${activeNode === MOCK_DOMAINS[0].id ? 'bg-[#FF0000] text-white border-4 border-black dark:border-white' : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105'}`}
                >
                    <span className="text-3xl mb-1">{MOCK_DOMAINS[0].icon}</span>
                    <span className="font-bold text-xs uppercase tracking-widest text-center px-2">{MOCK_DOMAINS[0].name}</span>
                </motion.div>

                {/* Satellite Nodes */}
                {MOCK_DOMAINS.slice(1).map((domain, i) => {
                    const angle = (i / (MOCK_DOMAINS.length - 1)) * Math.PI * 2 - Math.PI / 2
                    const radius = 200 // Pixel distance from center

                    // Convert polar to cartesian
                    const x = Math.cos(angle) * radius
                    const y = Math.sin(angle) * radius

                    const isTargeted = traffic.some(t => t.to === domain.id || t.from === domain.id)
                    const isGlobalTargeted = traffic.some(t => t.to === MOCK_DOMAINS[0].id || t.from === MOCK_DOMAINS[0].id)

                    return (
                        <div key={domain.id} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Connecting Line */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible z-0" style={{ pointerEvents: 'none' }}>
                                <motion.line
                                    x1="50%" y1="50%"
                                    x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                                    stroke={isTargeted || isGlobalTargeted ? "#FF0000" : "currentColor"}
                                    strokeWidth={isTargeted || isGlobalTargeted ? "2" : "1"}
                                    strokeDasharray="4 4"
                                    className="text-gray-300 dark:text-zinc-800 transition-colors duration-500"
                                />
                                {traffic.filter(t => (t.from === domain.id && t.to === MOCK_DOMAINS[0].id) || (t.to === domain.id && t.from === MOCK_DOMAINS[0].id)).map((t, idx) => (
                                    <motion.circle
                                        key={`${t.from}-${t.to}-${idx}`}
                                        r="3"
                                        fill="#FF0000"
                                        initial={{
                                            cx: t.from === domain.id ? `calc(50% + ${x}px)` : "50%",
                                            cy: t.from === domain.id ? `calc(50% + ${y}px)` : "50%"
                                        }}
                                        animate={{
                                            cx: t.to === domain.id ? `calc(50% + ${x}px)` : "50%",
                                            cy: t.to === domain.id ? `calc(50% + ${y}px)` : "50%"
                                        }}
                                        transition={{ duration: 1, ease: "linear" }}
                                    />
                                ))}
                            </svg>

                            {/* Node */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.1 }}
                                style={{ x, y }}
                                onClick={() => setActiveNode(domain.id)}
                                className={`pointer-events-auto absolute z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl
                                    ${activeNode === domain.id ? 'bg-[#FF0000] text-white border-2 border-black dark:border-white scale-110' : 'bg-white dark:bg-black border-2 border-black dark:border-white/20 text-black dark:text-white hover:border-[#FF0000] dark:hover:border-[#FF0000]'}`}
                            >
                                <span className="text-2xl mb-1">{domain.icon}</span>
                                <span className="font-bold text-[9px] uppercase tracking-widest text-center px-1 leading-tight">{domain.name}</span>
                                {isTargeted && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF0000] rounded-full animate-ping" />
                                )}
                            </motion.div>
                        </div>
                    )
                })}

                {/* Selected Node Details Overlay */}
                <AnimatePresence>
                    {activeNode && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="absolute top-6 right-6 w-64 bg-white/90 dark:bg-black/90 backdrop-blur-md border-2 border-black dark:border-white p-4 z-30 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
                        >
                            {(() => {
                                const domain = MOCK_DOMAINS.find(d => d.id === activeNode)
                                return (
                                    <>
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-black/10 dark:border-white/10">
                                            <span className="text-xl">{domain?.icon}</span>
                                            <h3 className="font-bold uppercase tracking-wider text-sm">{domain?.name}</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold tracking-widest">Status</span>
                                                <span className="text-green-500 font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> SYNCED</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold tracking-widest">Validators</span>
                                                <span className="font-mono">{100 + randPercent()} Active</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 uppercase font-bold tracking-widest">Intent Vol</span>
                                                <span className="font-mono">{randPercent()}% / sec</span>
                                            </div>
                                        </div>
                                    </>
                                )
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

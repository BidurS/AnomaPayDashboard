import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Layers, ChevronDown, Activity, Database, Clock, Users, Lock, Code, BarChart3, Globe } from 'lucide-react'
import { SEO } from './SEO'

interface FAQItem {
    q: string
    a: string
    icon: any
    category: string
}

const FAQ_ITEMS: FAQItem[] = [
    // Platform
    {
        q: "What is Gnoma Explorer?",
        a: "Gnoma Explorer is a real-time analytics dashboard for the Anoma Protocol Adapter on Base. It provides deep visibility into intent resolution, solver performance, privacy pool activity, and token flows — all indexed directly from the blockchain and updated automatically every 5 minutes.",
        icon: Zap,
        category: "Platform"
    },
    {
        q: "Where does the data come from?",
        a: "All data is sourced from the Base blockchain via the Blockscout API. Our automated indexer fetches the latest transactions, event logs, and token transfers from the Anoma Protocol Adapter contract every 5 minutes. There is no centralized database or manual data entry — everything is derived directly from on-chain activity.",
        icon: Database,
        category: "Platform"
    },
    {
        q: "How often is data updated?",
        a: "The indexer runs on a 5-minute cron schedule. New transactions confirmed on Base appear in the dashboard within 5 minutes. The system also processes historical blocks, so if there's ever a brief outage, it automatically catches up on the next cycle.",
        icon: Clock,
        category: "Platform"
    },

    // Metrics
    {
        q: "What is 'Intent Satisfaction Index'?",
        a: "This is a composite score reflecting the total number of intents that have been fully resolved with user constraints met. Each TransactionExecuted event on-chain represents a successfully settled intent. The index serves as a heartbeat for the protocol's utility and grows as more intents are processed by solvers.",
        icon: Activity,
        category: "Metrics"
    },
    {
        q: "How is 'Settled USD Value' calculated?",
        a: "Settled USD Value tracks the real economic value of all intents successfully settled by solvers. We calculate this by analyzing token transfers associated with each transaction and applying precise pricing: USDC at $1.00, WETH at current market price, DAI at $1.00, and USDbC at $1.00. This avoids inflation from counting raw ETH value and provides a true 'Settled Value' figure.",
        icon: Layers,
        category: "Metrics"
    },
    {
        q: "What is 'Total Value Shielded'?",
        a: "This represents the net flow (Inflows minus Outflows) of assets moving through the Anoma protocol. A positive number indicates accumulation of privacy-shielded liquidity. We track both inflows (tokens sent to the contract) and outflows (tokens sent from the contract) to compute the net shielded amount.",
        icon: Shield,
        category: "Metrics"
    },
    {
        q: "What does the 'Privacy Pulse' track?",
        a: "The Privacy Pulse section visualizes CommitmentTreeRootAdded events — each representing a new Merkle tree root committed to the privacy pool. The growing count shows the protocol's shielded set expanding over time. More commitment roots mean more users have deposited into the privacy pool, strengthening privacy guarantees for all participants.",
        icon: Lock,
        category: "Metrics"
    },

    // Solvers
    {
        q: "What is a Solver?",
        a: "In the Anoma protocol, solvers are specialized actors who find optimal execution paths for user intents. When a user submits an intent (e.g., 'swap X for Y at the best rate'), solvers compete to fulfill it. The Solver Leaderboard ranks them by transaction count, gas efficiency, and total value processed. Top solvers are the most active and reliable executors on the network.",
        icon: Users,
        category: "Solvers"
    },
    {
        q: "What is 'Intent Mastery Score'?",
        a: "Intent Mastery is a composite ranking metric combining a solver's transaction volume weight with their activity count. It's calculated as: (Total Value Processed in ETH + Transaction Count × 2) / 10. This rewards both high-value and high-frequency solvers, giving a balanced view of solver effectiveness.",
        icon: BarChart3,
        category: "Solvers"
    },

    // Technical
    {
        q: "Which events does Gnoma index?",
        a: "Gnoma indexes all 8 event types emitted by the Anoma Protocol Adapter:\n\n• TransactionExecuted — Successfully settled intents\n• CommitmentTreeRootAdded — Privacy pool updates\n• ActionExecuted — Action execution results\n• DiscoveryPayload — Discovery data blobs\n• ResourcePayload — Resource data blobs\n• ExternalPayload — External data submissions\n• ApplicationPayload — Application-level data\n• ForwarderCallExecuted — Forwarded contract calls\n\nAll events are decoded and categorized for you in the Hex Decoder tool.",
        icon: Code,
        category: "Technical"
    },
    {
        q: "What is the Hex Decoder?",
        a: "The Hex Decoder is a built-in tool on each transaction detail page that lets you inspect raw payload data in three views: Raw Hex (the original on-chain bytes), UTF-8 Decoded (human-readable text extraction), and JSON Parsed (structured data when the payload contains valid JSON). This is essential for developers analyzing intent payloads.",
        icon: Code,
        category: "Technical"
    },
    {
        q: "What blockchain does Gnoma support?",
        a: "Currently, Gnoma Explorer indexes the Anoma Protocol Adapter deployed on Base (Chain ID: 8453). The architecture supports multiple chains — additional networks can be added through the admin interface by providing the contract address, RPC URL, and starting block number.",
        icon: Globe,
        category: "Technical"
    },
]

const CATEGORIES = ['Platform', 'Metrics', 'Solvers', 'Technical']

const CONTRACTS = [
    { name: "Anoma Protocol Adapter", address: "0x9ED43C229480659bF6B6607C46d7B96c6D760cBB", type: "Core" },
    { name: "Shielded Pool", address: "0x990c1773c28b985c2cf32c0a920192bd8717c871", type: "Core" },
    { name: "USDC", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", type: "Asset" },
    { name: "WETH", address: "0x4200000000000000000000000000000000000006", type: "Asset" },
    { name: "DAI", address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", type: "Asset" },
    { name: "USDbC", address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", type: "Asset" },
]

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    const Icon = item.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors"
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 text-left group"
            >
                <div className={`p-2 transition-colors ${isOpen ? 'bg-[#FF0000] text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <h3 className="flex-1 text-sm sm:text-base font-bold uppercase tracking-wide text-black dark:text-white">{item.q}</h3>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#FF0000]' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pl-16">
                            <div className="border-l-2 border-[#FF0000] pl-4">
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm whitespace-pre-line">{item.a}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('all')

    const filteredItems = activeCategory === 'all'
        ? FAQ_ITEMS
        : FAQ_ITEMS.filter(item => item.category === activeCategory)

    return (
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
            <SEO title="FAQ" description="Frequently asked questions about Gnoma Explorer and the Anoma Protocol." />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-1.5 bg-[#FF0000]" />
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-black dark:text-white">Protocol FAQ</h2>
                        <p className="text-xs font-semibold tracking-[0.3em] text-gray-500 dark:text-gray-400 uppercase mt-1">
                            {FAQ_ITEMS.length} Questions · Gnoma Explorer v3.0
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Category Filter Pills */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap gap-2 mb-8"
            >
                <button
                    onClick={() => { setActiveCategory('all'); setOpenIndex(null) }}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 ${activeCategory === 'all'
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                        }`}
                >
                    All ({FAQ_ITEMS.length})
                </button>
                {CATEGORIES.map(cat => {
                    const count = FAQ_ITEMS.filter(i => i.category === cat).length
                    return (
                        <button
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 ${activeCategory === cat
                                    ? 'bg-[#FF0000] text-white border-[#FF0000]'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                                }`}
                        >
                            {cat} ({count})
                        </button>
                    )
                })}
            </motion.div>

            {/* Accordion Q&A */}
            <div className="space-y-2">
                {filteredItems.map((item, i) => (
                    <AccordionItem
                        key={`${activeCategory}-${i}`}
                        item={item}
                        isOpen={openIndex === i}
                        onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                    />
                ))}
            </div>

            {/* Contract Addresses */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-16"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-8 w-1.5 bg-[#FF0000]" />
                    <h3 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-black dark:text-white">Contract Addresses</h3>
                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 px-2 py-1 uppercase tracking-wider">Base</span>
                </div>
                <div className="border-2 border-black dark:border-white overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black dark:bg-white text-white dark:text-black">
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Contract</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Address</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider sm:hidden">Addr</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {CONTRACTS.map((c, i) => (
                                <tr key={i} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                                    <td className="px-4 py-3 font-bold text-sm text-black dark:text-white">{c.name}</td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={`https://basescan.org/address/${c.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-xs hover:text-[#FF0000] hover:underline transition-colors text-gray-600 dark:text-gray-400"
                                        >
                                            <span className="hidden sm:inline">{c.address}</span>
                                            <span className="sm:hidden">{c.address.slice(0, 6)}...{c.address.slice(-4)}</span>
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${c.type === 'Core'
                                                ? 'bg-[#FF0000] text-white'
                                                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
                                            }`}>
                                            {c.type}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Architecture Note */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 border-2 border-gray-200 dark:border-gray-800 p-6"
            >
                <h4 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#FF0000]" />
                    How It Works
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-950">
                        <div className="text-2xl mb-2">⛓️</div>
                        <p className="text-xs font-bold uppercase text-black dark:text-white mb-1">On-Chain</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Anoma Protocol Adapter emits events on Base</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-950">
                        <div className="text-2xl mb-2">🔄</div>
                        <p className="text-xs font-bold uppercase text-black dark:text-white mb-1">Indexer</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Blockscout API fetches & processes every 5 min</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-950">
                        <div className="text-2xl mb-2">📊</div>
                        <p className="text-xs font-bold uppercase text-black dark:text-white mb-1">Dashboard</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Real-time analytics with Cloudflare Workers</p>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}

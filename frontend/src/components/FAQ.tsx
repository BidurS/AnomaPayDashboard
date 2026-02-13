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
        a: "The Privacy Pulse section visualizes CommitmentTreeRootAdded events — each representing a new Merkle tree root committed to the privacy pool. The growing count shows the protocol's shielded set expanding over time, strengthening privacy guarantees for all participants.",
        icon: Lock,
        category: "Metrics"
    },
    {
        q: "What is a Solver?",
        a: "In the Anoma protocol, solvers are specialized actors who find optimal execution paths for user intents. When a user submits an intent (e.g., 'swap X for Y at the best rate'), solvers compete to fulfill it. The Solver Leaderboard ranks them by transaction count, gas efficiency, and total value processed.",
        icon: Users,
        category: "Solvers"
    },
    {
        q: "What is 'Intent Mastery Score'?",
        a: "Intent Mastery is a composite ranking metric combining a solver's transaction volume weight with their activity count. It's calculated as: (Total Value Processed in ETH + Transaction Count × 2) / 10. This rewards both high-value and high-frequency solvers, giving a balanced view of solver effectiveness.",
        icon: BarChart3,
        category: "Solvers"
    },
    {
        q: "Which events does Gnoma index?",
        a: "Gnoma indexes all 8 event types emitted by the Anoma Protocol Adapter: TransactionExecuted (settled intents), CommitmentTreeRootAdded (privacy pool updates), ActionExecuted, DiscoveryPayload, ResourcePayload, ExternalPayload, ApplicationPayload, and ForwarderCallExecuted. All events are decoded and categorized for you.",
        icon: Code,
        category: "Technical"
    },
    {
        q: "What is the Hex Decoder?",
        a: "The Hex Decoder is a built-in tool on each transaction detail page that lets you inspect raw payload data in three views: Raw Hex (the original on-chain bytes), UTF-8 Decoded (human-readable text), and JSON Parsed (structured data). This is essential for developers analyzing intent payloads.",
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

function AccordionItem({ item, isOpen, onToggle, index }: { item: FAQItem; isOpen: boolean; onToggle: () => void; index: number }) {
    const Icon = item.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`rounded-lg transition-all duration-200 ${isOpen
                    ? 'bg-white dark:bg-gray-900 shadow-lg shadow-black/5 dark:shadow-white/5 ring-2 ring-[#FF0000]/20'
                    : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 hover:shadow-md'
                }`}
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-5 px-6 py-5 text-left group"
            >
                <div className={`p-2.5 rounded-lg transition-all duration-200 shrink-0 ${isOpen
                        ? 'bg-[#FF0000] text-white shadow-md shadow-red-500/25'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-[#FF0000]/10 group-hover:text-[#FF0000]'
                    }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-black dark:text-white leading-snug">{item.q}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-0.5 block">{item.category}</span>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${isOpen
                        ? 'bg-[#FF0000]/10 text-[#FF0000]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-0">
                            <div className="ml-[52px] pl-5 border-l-2 border-[#FF0000]/30">
                                <p className="text-gray-600 dark:text-gray-300 leading-[1.8] text-[15px]">{item.a}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)
    const [activeCategory, setActiveCategory] = useState<string>('all')

    const filteredItems = activeCategory === 'all'
        ? FAQ_ITEMS
        : FAQ_ITEMS.filter(item => item.category === activeCategory)

    return (
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto min-h-screen">
            <SEO title="FAQ" description="Frequently asked questions about Gnoma Explorer and the Anoma Protocol." />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 sm:mb-16 text-center"
            >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#FF0000]/10 rounded-full mb-6">
                    <div className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF0000]">
                        {FAQ_ITEMS.length} Questions Answered
                    </span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white mb-4">
                    Protocol FAQ
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Everything you need to know about Gnoma Explorer, how metrics are calculated, and how the protocol works.
                </p>
            </motion.div>

            {/* Category Filter Pills */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap justify-center gap-3 mb-12"
            >
                <button
                    onClick={() => { setActiveCategory('all'); setOpenIndex(null) }}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-full ${activeCategory === 'all'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
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
                            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-full ${activeCategory === cat
                                    ? 'bg-[#FF0000] text-white shadow-lg shadow-red-500/20'
                                    : 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
                                }`}
                        >
                            {cat} ({count})
                        </button>
                    )
                })}
            </motion.div>

            {/* Accordion Q&A */}
            <div className="space-y-3">
                {filteredItems.map((item, i) => (
                    <AccordionItem
                        key={`${activeCategory}-${i}`}
                        item={item}
                        isOpen={openIndex === i}
                        onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                        index={i}
                    />
                ))}
            </div>

            {/* Contract Addresses */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-20 sm:mt-24"
            >
                <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white mb-2">
                        Contract Addresses
                    </h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Base Network</span>
                    </div>
                </div>

                <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-xl shadow-black/5 dark:shadow-white/5 ring-1 ring-gray-200 dark:ring-gray-800">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50">
                                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Contract</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Address</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {CONTRACTS.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-sm text-black dark:text-white whitespace-nowrap">{c.name}</td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={`https://basescan.org/address/${c.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-xs hover:text-[#FF0000] transition-colors text-gray-500 dark:text-gray-400"
                                        >
                                            <span className="hidden md:inline">{c.address}</span>
                                            <span className="md:hidden">{c.address.slice(0, 8)}...{c.address.slice(-6)}</span>
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${c.type === 'Core'
                                                ? 'bg-[#FF0000]/10 text-[#FF0000]'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
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

            {/* How It Works */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-16 sm:mt-20"
            >
                <div className="text-center mb-10">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white mb-2">
                        How It Works
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">From on-chain events to your dashboard</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                    {[
                        { emoji: "⛓️", title: "On-Chain", desc: "Anoma Protocol Adapter emits events on Base for every intent settled, payload submitted, and privacy pool update." },
                        { emoji: "🔄", title: "Indexer", desc: "Our Blockscout-powered indexer fetches and processes new transactions every 5 minutes via automated cron jobs." },
                        { emoji: "📊", title: "Dashboard", desc: "Data is stored in Cloudflare D1 and served via edge Workers for real-time analytics with sub-100ms latency." },
                    ].map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="relative text-center p-8 rounded-xl bg-white dark:bg-gray-900 shadow-lg shadow-black/5 dark:shadow-white/5 ring-1 ring-gray-200 dark:ring-gray-800 group hover:ring-[#FF0000]/30 transition-all"
                        >
                            {i < 2 && (
                                <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-300 dark:text-gray-700">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                </div>
                            )}
                            <div className="text-4xl mb-4">{step.emoji}</div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Step {i + 1}</span>
                            </div>
                            <h4 className="text-lg font-bold text-black dark:text-white mb-2">{step.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </section>
    )
}

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Layers, ChevronDown, Activity, Database, Clock, Users, Lock, Code, BarChart3, Globe, Copy, Check, Link, RefreshCw, LayoutDashboard } from 'lucide-react'
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
        a: "Gnoma Explorer natively supports **Base**, **Ethereum Mainnet**, **Optimism**, and **Arbitrum One**. You can easily switch between networks using the chain selector in the top navigation bar. The architecture is designed to be chain-agnostic, allowing us to rapidly onboard new EVM-compatible networks as the Anoma ecosystem expands.",
        icon: Globe,
        category: "Technical"
    },
]

const CATEGORIES = ['Platform', 'Metrics', 'Solvers', 'Technical']

const CONTRACTS = [
    { name: "Anoma Adapter (Base)", address: "0x9ED43C229480659bF6B6607C46d7B96c6D760cBB", type: "Core", explorerUrl: "https://basescan.org/address/" },
    { name: "Anoma Adapter (ETH)", address: "0x46E622226F93Ed52C584F3f66135CD06AF01c86c", type: "Core", explorerUrl: "https://etherscan.io/address/" },
    { name: "Anoma Adapter (OP)", address: "0x094FCC095323080e71a037b2B1e3519c07dd84F8", type: "Core", explorerUrl: "https://optimistic.etherscan.io/address/" },
    { name: "Anoma Adapter (ARB)", address: "0x6d0A05E3535bd4D2C32AaD37FFB28fd0E1e528c3", type: "Core", explorerUrl: "https://arbiscan.io/address/" },
    { name: "Shielded Pool", address: "0x990c1773c28b985c2cf32c0a920192bd8717c871", type: "Core", explorerUrl: "https://basescan.org/address/" },
    { name: "USDC", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", type: "Asset", explorerUrl: "https://basescan.org/address/" },
    { name: "WETH", address: "0x4200000000000000000000000000000000000006", type: "Asset", explorerUrl: "https://basescan.org/address/" },
    { name: "DAI", address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", type: "Asset", explorerUrl: "https://basescan.org/address/" },
    { name: "USDbC", address: "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", type: "Asset", explorerUrl: "https://basescan.org/address/" },
]

function AccordionItem({ item, isOpen, onToggle, index }: { item: FAQItem; isOpen: boolean; onToggle: () => void; index: number }) {
    const Icon = item.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`rounded-xl transition-all duration-300 ${isOpen
                ? 'bg-red-50/50 dark:bg-red-950/10 shadow-sm ring-1 ring-[#FF0000]/20'
                : 'bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 hover:shadow-md hover:ring-gray-200 dark:hover:ring-gray-700'
                }`}
        >
            <button
                onClick={onToggle}
                className="w-full flex items-start sm:items-center gap-4 sm:gap-6 px-4 py-4 sm:px-8 sm:py-6 text-left group"
            >
                <div className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 shrink-0 mt-0.5 sm:mt-0 ${isOpen
                    ? 'bg-[#FF0000] text-white shadow-md shadow-red-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-[#FF0000]/10 group-hover:text-[#FF0000]'
                    }`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className={`text-sm sm:text-lg font-bold leading-snug transition-colors duration-200 ${isOpen ? 'text-[#FF0000] dark:text-white' : 'text-gray-900 dark:text-white group-hover:text-[#FF0000] dark:group-hover:text-red-400'}`}>
                        {item.q}
                    </h3>
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-1.5 block">
                        {item.category}
                    </span>
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${isOpen
                    ? 'bg-[#FF0000]/10 text-[#FF0000] rotate-180'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700'
                    }`}>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-5 pt-0 sm:px-8 sm:pb-8">
                            <div className="ml-[44px] sm:ml-[68px] pl-4 sm:pl-6 border-l-2 border-[#FF0000]/20">
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
                                    {item.a}
                                </p>
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
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedAddress(text)
            setTimeout(() => setCopiedAddress(null), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }, [])

    const filteredItems = activeCategory === 'all'
        ? FAQ_ITEMS
        : FAQ_ITEMS.filter(item => item.category === activeCategory)

    return (
        <section className="py-16 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto min-h-screen">
            <SEO title="FAQ" description="Frequently asked questions about Gnoma Explorer and the Anoma Protocol." />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 sm:mb-20 text-center"
            >
                <div className="inline-flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#FF0000]/5 border border-[#FF0000]/10 rounded-full mb-5 sm:mb-6">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FF0000] animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF0000]">
                        {FAQ_ITEMS.length} Questions Answered
                    </span>
                </div>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-black dark:text-white mb-4 sm:mb-6">
                    Protocol FAQ
                </h2>
                <p className="text-sm sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed px-2">
                    Everything you need to know about Gnoma Explorer, how metrics are calculated, and how the protocol works.
                </p>
            </motion.div>

            {/* Category Filter Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex justify-start sm:justify-center mb-8 sm:mb-12 overflow-x-auto pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                <div className="inline-flex p-1 sm:p-1.5 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl sm:rounded-full ring-1 ring-gray-200/50 dark:ring-gray-800/50 min-w-max mx-auto sm:mx-0">
                    <button
                        onClick={() => { setActiveCategory('all'); setOpenIndex(null) }}
                        className={`relative px-4 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg sm:rounded-full z-10 ${activeCategory === 'all'
                            ? 'text-[#FF0000] dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                    >
                        {activeCategory === 'all' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg sm:rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                style={{ zIndex: -1 }}
                            />
                        )}
                        All ({FAQ_ITEMS.length})
                    </button>
                    {CATEGORIES.map(cat => {
                        const count = FAQ_ITEMS.filter(i => i.category === cat).length
                        return (
                            <button
                                key={cat}
                                onClick={() => { setActiveCategory(cat); setOpenIndex(null) }}
                                className={`relative px-4 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg sm:rounded-full z-10 ${activeCategory === cat
                                    ? 'text-[#FF0000] dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {activeCategory === cat && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg sm:rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                        style={{ zIndex: -1 }}
                                    />
                                )}
                                {cat} ({count})
                            </button>
                        )
                    })}
                </div>
            </motion.div>

            {/* Accordion Q&A */}
            <div className="space-y-3 sm:space-y-5">
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
                className="mt-16 sm:mt-32"
            >
                <div className="text-center mb-8 sm:mb-10">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white mb-3 sm:mb-4">
                        Contract Addresses
                    </h3>
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Multi-Chain Protocol</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    {CONTRACTS.map((c, i) => (
                        <div key={i} className="group relative bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-[#FF0000]/30 dark:hover:ring-[#FF0000]/30 transition-all duration-300">
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                <div>
                                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-1">{c.name}</h4>
                                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${c.type === 'Core'
                                        ? 'bg-[#FF0000]/10 text-[#FF0000]'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                        }`}>
                                        {c.type}
                                    </span>
                                </div>
                                <a
                                    href={`${c.explorerUrl}${c.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="View on Explorer"
                                >
                                    <Link className="w-4 h-4" />
                                </a>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl font-mono text-[10px] sm:text-sm text-gray-600 dark:text-gray-300 truncate ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/50">
                                    {c.address}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(c.address)}
                                    className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 shrink-0 ${
                                        copiedAddress === c.address
                                            ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600'
                                    }`}
                                    title="Copy Address"
                                >
                                    {copiedAddress === c.address ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* How It Works */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-16 sm:mt-32"
            >
                <div className="text-center mb-8 sm:mb-12">
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white mb-3 sm:mb-4">
                        How It Works
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto px-4">
                        The journey from on-chain execution to real-time analytics on your dashboard.
                    </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 sm:gap-8">
                    {[
                        { icon: Link, title: "On-Chain Events", desc: "Anoma Protocol Adapter emits events on supported chains for every intent settled, payload submitted, and privacy pool update." },
                        { icon: RefreshCw, title: "Automated Indexer", desc: "Our Blockscout-powered indexer fetches and processes new transactions every 5 minutes via automated cron jobs." },
                        { icon: LayoutDashboard, title: "Real-time Dashboard", desc: "Data is stored globally and served via edge Workers for real-time analytics with sub-100ms latency." },
                    ].map((step, i) => {
                        const StepIcon = step.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="relative text-center p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 group hover:ring-[#FF0000]/30 hover:shadow-xl hover:shadow-[#FF0000]/5 dark:hover:shadow-[#FF0000]/10 transition-all duration-500"
                            >
                                {i < 2 && (
                                    <div className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-gray-200 dark:text-gray-800">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m9 18 6-6-6-6" /></svg>
                                    </div>
                                )}
                                
                                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#FF0000]/10 group-hover:text-[#FF0000] text-gray-600 dark:text-gray-300 transition-colors duration-300 ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/50">
                                    <StepIcon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                </div>
                                
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-100 dark:bg-gray-800/80 rounded-full mb-3 sm:mb-4 ring-1 ring-black/5 dark:ring-white/5">
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Step {i + 1}</span>
                                </div>
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 group-hover:text-[#FF0000] dark:group-hover:text-red-400 transition-colors">{step.title}</h4>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                            </motion.div>
                        )
                    })}
                </div>
            </motion.div>
        </section>
    )
}
// Updated: 2026-02-19 Mobile Responsiveness Polish

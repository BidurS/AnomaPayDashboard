import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Layers, ChevronDown, Activity, Clock, Users, Lock, Code, BarChart3, Globe, Copy, Check, Link, Search, ThumbsUp, ThumbsDown } from 'lucide-react'
import { SEO } from './SEO'

interface FAQItem {
    q: string
    a: string
    icon: any
    category: string
    id: string
}

const FAQ_ITEMS: FAQItem[] = [
    {
        id: "platform-intro",
        q: "What is Gnoma Explorer?",
        a: "Gnoma Explorer is a world-class analytics engine for the Anoma Protocol. It visualizes the full lifecycle of an intent—from P2P gossip to solver matchmaking and final ZK-settlement. It currently supports indexing for Base, Ethereum, and other EVM-compatible protocol adapters.",
        icon: Zap,
        category: "Platform"
    },
    {
        id: "live-vs-mock",
        q: "Is the data real-time or simulated?",
        a: "The dashboard uses a high-fidelity hybrid model. Settlement data (Transactions, Solvers, Volumes) is indexed in real-time directly from the blockchain every 5 minutes. The Intent Mempool and P2P Topology currently use a functional simulation (Mock Data) to demonstrate future Anoma mainnet capabilities while the gossip network is in private devnet.",
        icon: Activity,
        category: "Platform"
    },
    {
        id: "arm-scale",
        q: "What is the ARM Balance Scale?",
        a: "Anoma uses an Abstract Resource Machine (ARM) where state changes are represented by consuming old resources (Nullifiers) and creating new ones (Commitments). Every transaction detail page features a literal scale that proves the transaction is 'balanced'—ensuring no resources were created or destroyed illegally.",
        icon: Layers,
        category: "Architecture"
    },
    {
        id: "multi-domain",
        q: "How does Multi-Domain Topology work?",
        a: "Anoma is designed as a unified operating system for all blockchains. The Topology map visualizes user intents originating on various domains (Optimism, Arbitrum, ETH) and being solved by a central Anoma P2P layer before settling on a specific execution domain like Base.",
        icon: Globe,
        category: "Architecture"
    },
    {
        id: "solver-strategy",
        q: "What do the Solver Badges mean?",
        a: "We use Strategy Intelligence to classify solvers based on their behavior: 'CoW Master' (matches intents directly without external liquidity), 'DeFi Router' (uses external protocols like Uniswap), and 'Whale' (processes high economic volume).",
        icon: Users,
        category: "Solvers"
    },
    {
        id: "mastery-score",
        q: "How is 'Mastery Score' calculated?",
        a: "Mastery Score rewards solvers who process the most economic value efficiently. It is weighted primarily by USD Volume, followed by transaction count and success rate. This allows users to identify the most reliable matchmakers in the network.",
        icon: BarChart3,
        category: "Solvers"
    },
    {
        id: "anonymity-set",
        q: "What is the Anonymity Set?",
        a: "Privacy in Anoma is a function of the 'Shielded Pool'. The larger the number of commitments in the tree, the harder it is for an observer to link your consumed resources to your created resources. Our Simulator lets you see the mathematical probability of traceability in real-time.",
        icon: Shield,
        category: "Privacy"
    },
    {
        id: "zk-transparency",
        q: "What is ZK-Source Transparency?",
        a: "Every transaction detail provides a 'Verify Source' button for its ZK Logic Proofs. This maps the RISC Zero Image ID directly to the open-source Rust code on the Anoma GitHub, ensuring you can verify the exact mathematical rules that authorized your intent.",
        icon: Lock,
        category: "Privacy"
    },
    {
        id: "auto-asset",
        q: "How does Automatic Asset Recognition work?",
        a: "Our indexer performs 'on-the-fly' discovery. It automatically queries new contract addresses for symbols and decimals. It also uses symbol-based inference to assign prices (e.g., tokens containing 'USD' are automatically valued at $1.00), making it future-proof for any new test tokens.",
        icon: Code,
        category: "Technical"
    },
    {
        id: "update-freq",
        q: "How often is data updated?",
        a: "The backend indexer runs on a 5-minute cron schedule. Every cycle, it fetches new logs from Blockscout, calculates USD volumes, and updates solver rankings across all supported chains simultaneously.",
        icon: Clock,
        category: "Technical"
    },
]

const CATEGORIES = ['Platform', 'Architecture', 'Solvers', 'Privacy', 'Technical']

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

function Anoma101() {
    return (
        <div className="mb-24 md:mb-32">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-black dark:text-white uppercase leading-none mb-12">
                Anoma 101
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
                {/* 1. Intent */}
                <div className="bg-white dark:bg-black aspect-square p-8 flex flex-col justify-between border-2 border-black dark:border-white relative overflow-hidden group hover:bg-[#FF0000] hover:border-[#FF0000] hover:text-white transition-colors duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 dark:bg-zinc-900 rounded-bl-[100px] -z-10 group-hover:bg-black/10 transition-colors duration-500"></div>
                    <div className="w-16 h-16 bg-black dark:bg-white rounded-full group-hover:bg-white transition-colors duration-500"></div>
                    <div className="z-10 mt-12">
                        <h3 className="text-3xl font-black uppercase mb-3">1. Intent</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-white/90">Users express precise off-chain intent preferences.</p>
                    </div>
                </div>

                {/* 2. Match */}
                <div className="bg-white dark:bg-black aspect-square p-8 flex flex-col justify-between border-2 border-black dark:border-white relative overflow-hidden group hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors duration-500">
                    <div className="w-16 h-16 border-8 border-black dark:border-white transform rotate-45 group-hover:border-white dark:group-hover:border-black transition-colors duration-500"></div>
                    <div className="z-10 mt-12">
                        <h3 className="text-3xl font-black uppercase mb-3">2. Match</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-white/90 dark:group-hover:text-black/90">Solvers compute and connect complex execution paths.</p>
                    </div>
                </div>

                {/* 3. Execute */}
                <div className="bg-[#FF0000] text-white aspect-square p-8 flex flex-col justify-between border-2 border-[#FF0000] relative overflow-hidden group hover:bg-white hover:text-[#FF0000] hover:border-black transition-colors duration-500">
                    <div className="w-16 h-16 bg-white group-hover:bg-[#FF0000] transition-colors duration-500"></div>
                    <div className="z-10 mt-12">
                        <h3 className="text-3xl font-black uppercase mb-3">3. Execute</h3>
                        <p className="text-sm font-bold text-white/90 group-hover:text-black/80">Batched transactions settled atomically on Base.</p>
                    </div>
                </div>

                {/* 4. Shield */}
                <div className="bg-white dark:bg-black aspect-square p-8 flex flex-col justify-between border-2 border-black dark:border-white relative overflow-hidden group hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors duration-500">
                    <div className="w-16 h-16 rounded-full border-8 border-black dark:border-white border-dashed animate-[spin_10s_linear_infinite] group-hover:border-white dark:group-hover:border-black transition-colors duration-500"></div>
                    <div className="z-10 mt-12">
                        <h3 className="text-3xl font-black uppercase mb-3">4. Shield</h3>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-white/90 dark:group-hover:text-black/90">Asset privacy preserved mathematically via ZK Proofs.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function AccordionItem({ item, isOpen, onToggle, index }: { item: FAQItem; isOpen: boolean; onToggle: () => void; index: number }) {
    const [feedback, setFeedback] = useState<'neutral' | 'helpful' | 'unhelpful'>('neutral')
    const num = (index + 1).toString().padStart(2, '0');

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`border-b-2 border-black dark:border-white transition-colors duration-300 ${isOpen ? 'bg-gray-50 dark:bg-zinc-900' : 'hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-6 py-8 md:py-12 px-4 md:px-8 text-left group focus:outline-none"
            >
                <div className="text-4xl md:text-6xl font-black text-gray-300 dark:text-gray-800 group-hover:text-[#FF0000] transition-colors font-mono">
                    {num}
                </div>
                <div className="flex-1 min-w-0 pr-4 md:pr-12">
                    <h3 className={`text-2xl md:text-4xl font-black tracking-tight transition-colors duration-200 uppercase ${isOpen ? 'text-[#FF0000]' : 'text-black dark:text-white group-hover:text-[#FF0000]'}`}>
                        {item.q}
                    </h3>
                    <div className="mt-4 text-xs font-bold uppercase tracking-widest text-[#FF0000] inline-block border-2 border-[#FF0000] px-3 py-1 bg-[#FF0000]/10">
                        {item.category}
                    </div>
                </div>
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center transition-all duration-300 shrink-0 ${isOpen
                    ? 'border-[#FF0000] text-[#FF0000] rotate-180'
                    : 'border-black dark:border-white text-black dark:text-white group-hover:border-[#FF0000] group-hover:text-[#FF0000]'
                    }`}>
                    <ChevronDown className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 md:px-8 pb-12 ml-14 md:ml-24 max-w-4xl">
                            <p className="text-lg md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium mb-8 border-l-4 border-[#FF0000] pl-6">
                                {item.a}
                            </p>

                            {/* Feedback */}
                            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider">
                                <span className="text-gray-400">Did this help?</span>
                                <button
                                    onClick={() => setFeedback('helpful')}
                                    className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors focus:outline-none ${feedback === 'helpful' ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-zinc-800 text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
                                >
                                    <ThumbsUp className="w-4 h-4" /> YES
                                </button>
                                <button
                                    onClick={() => setFeedback('unhelpful')}
                                    className={`flex items-center gap-2 px-4 py-2 border-2 transition-colors focus:outline-none ${feedback === 'unhelpful' ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-zinc-800 text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
                                >
                                    <ThumbsDown className="w-4 h-4" /> NO
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export function FAQ() {
    const [openItem, setOpenItem] = useState<string | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
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

    const filteredItems = useMemo(() => {
        return FAQ_ITEMS.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory
            const matchesSearch = item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.a.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [activeCategory, searchQuery])

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto min-h-screen bg-white dark:bg-black">
            <SEO title="Protocol Dynamics" description="Frequently asked questions about Gnoma Explorer and the Anoma Protocol." />

            <Anoma101 />

            <div className="mb-16 flex flex-col xl:flex-row xl:items-end justify-between gap-8 mt-32">
                <div>
                     <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-black dark:text-white uppercase leading-[0.85]">
                         KNOWLEDGE<br/>BASE
                     </h2>
                </div>
                <div className="w-full xl:w-[500px]">
                     <div className="relative group">
                         <div className="absolute inset-0 bg-[#FF0000] opacity-0 group-focus-within:opacity-20 transition-opacity blur-xl"></div>
                         <div className="relative bg-white dark:bg-black border-4 border-black dark:border-white flex items-center focus-within:border-[#FF0000] dark:focus-within:border-[#FF0000] transition-colors">
                             <Search className="w-8 h-8 ml-6 text-black dark:text-white group-focus-within:text-[#FF0000]" strokeWidth={3} />
                             <input
                                 type="text"
                                 placeholder="SEARCH ENTRY..."
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full p-6 bg-transparent outline-none text-2xl font-black uppercase placeholder-gray-300 dark:placeholder-gray-700 text-black dark:text-white focus:outline-none focus:ring-0"
                             />
                         </div>
                     </div>
                </div>
            </div>

            <div className="mb-12 flex flex-wrap gap-4">
                 <button
                      onClick={() => { setActiveCategory('all'); setOpenItem(null) }}
                      className={`px-8 py-4 text-xl font-black uppercase tracking-widest border-4 transition-colors focus:outline-none ${activeCategory === 'all' ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-transparent text-gray-400 border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
                 >
                     ALL
                 </button>
                 {CATEGORIES.map(cat => (
                     <button
                          key={cat}
                          onClick={() => { setActiveCategory(cat); setOpenItem(null) }}
                          className={`px-8 py-4 text-xl font-black uppercase tracking-widest border-4 transition-colors focus:outline-none ${activeCategory === cat ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-transparent text-gray-400 border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'}`}
                     >
                         {cat}
                     </button>
                 ))}
            </div>

            <div className="border-t-4 border-black dark:border-white">
                 {filteredItems.length > 0 ? (
                     filteredItems.map((item, i) => (
                         <AccordionItem
                             key={item.id}
                             item={item}
                             isOpen={openItem === item.id}
                             onToggle={() => setOpenItem(openItem === item.id ? null : item.id)}
                             index={i}
                         />
                     ))
                 ) : (
                     <div className="py-32 text-center text-gray-400">
                         <Search className="w-24 h-24 mx-auto mb-8 opacity-20" strokeWidth={1} />
                         <p className="text-3xl font-black uppercase tracking-widest">No entries found</p>
                         <button
                             onClick={() => setSearchQuery('')}
                             className="mt-8 text-xl text-[#FF0000] font-black uppercase hover:underline focus:outline-none"
                         >
                             Clear Search
                         </button>
                     </div>
                 )}
            </div>

            <div className="mt-32 border-t-8 border-black dark:border-white pt-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-black dark:text-white leading-[0.85]">
                        Smart<br/>Contracts
                    </h3>
                    <div className="inline-flex items-center gap-3 px-6 py-3 border-4 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black">
                        <span className="w-3 h-3 bg-[#FF0000] animate-pulse" />
                        <span className="text-lg font-black uppercase tracking-widest">Verified Logic</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {CONTRACTS.map((c, i) => (
                        <div key={i} className="group p-8 border-4 border-gray-200 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-colors">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h4 className="font-black text-xl text-black dark:text-white uppercase mb-2 leading-none">{c.name}</h4>
                                    <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">{c.type}</span>
                                </div>
                                <a
                                    href={`${c.explorerUrl}${c.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-[#FF0000] transition-colors"
                                >
                                    <Link className="w-6 h-6" strokeWidth={3} />
                                </a>
                            </div>

                            <div className="flex border-2 border-gray-200 dark:border-zinc-800 group-hover:border-black dark:group-hover:border-white transition-colors">
                                <div className="flex-1 font-mono text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate p-4 bg-gray-50 dark:bg-zinc-900 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {c.address}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(c.address)}
                                    className="p-4 border-l-2 border-gray-200 dark:border-zinc-800 hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-colors focus:outline-none"
                                >
                                    {copiedAddress === c.address ? (
                                        <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                                    ) : (
                                        <Copy className="w-5 h-5" strokeWidth={3} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

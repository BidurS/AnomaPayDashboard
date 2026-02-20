import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowRight, Combine, Terminal, Zap, Globe, Shield, CheckCircle, CircleDot, Layers } from 'lucide-react'
import { SEO } from '../components/SEO'

// ─────────────────────────────────────────
// Data
// ─────────────────────────────────────────

const GENERATIONS = [
    {
        gen: 'GEN 1',
        name: 'Bitcoin',
        year: '2009',
        tagline: 'Scriptable Settlement',
        desc: 'Introduced programmable money. Enabled: peer-to-peer payments and programmable currency issuance. Limited by scripting constraints.',
        color: '#F7931A',
        apps: ['P2P Payments', 'Digital Currency', 'Timelock Contracts'],
    },
    {
        gen: 'GEN 2',
        name: 'Ethereum',
        year: '2015',
        tagline: 'Programmable Settlement',
        desc: 'Introduced Turing-complete smart contracts. Enabled: DeFi, NFTs, DAOs, AMMs. Constrained by imperative EVM execution and MEV.',
        color: '#627EEA',
        apps: ['DeFi / AMMs', 'NFTs & DAOs', 'Stablecoins'],
    },
    {
        gen: 'GEN 3',
        name: 'Anoma',
        year: 'Now',
        tagline: 'Intent-Centric Architecture',
        desc: 'A distributed operating system. Any application, end-to-end decentralized, with native privacy. Not a blockchain — a unified OS for all chains.',
        color: '#FF0000',
        apps: ['Dark Pools', 'Autonomous AI Agents', 'Cross-chain anything'],
    },
]

const LIFECYCLE_STEPS = [
    { num: '01', title: 'Intent Declaration', desc: 'User declares desired outcome — e.g. "Borrow USDC against ETH at the best possible rate" — without specifying how.', icon: Zap },
    { num: '02', title: 'Gossip Network', desc: 'Intent is propagated peer-to-peer across the Anoma intent gossip network. Counterparties with matching intents are discovered globally.', icon: Globe },
    { num: '03', title: 'Solver Competition', desc: 'A decentralized network of solvers competes off-chain to find the optimal execution path — a Coincidence of Wants (CoW) across any chain.', icon: Combine },
    { num: '04', title: 'Atomic Settlement', desc: 'The winning solver bundles all matched intents into a single atomic transaction. Resources are consumed and created simultaneously, with no partial execution.', icon: CheckCircle },
    { num: '05', title: 'ZK Proof & Finalization', desc: 'A zero-knowledge proof is generated to verify settlement validity without revealing private intent parameters. State is updated on the underlying chain.', icon: Shield },
]

const USE_CASES = [
    {
        rank: 1,
        icon: Shield,
        title: 'ZK Corporate Dark Pool',
        sector: 'TradFi / Institutions',
        problem: 'Market impact, slippage, and front-running for large institutional treasury rebalancing.',
        solution: 'Intent-level IFC hides order size and limit price from the public mempool. Solvers compute matches blindly — settlement is the only public event.',
    },
    {
        rank: 2,
        icon: Layers,
        title: 'Shielded Supply Chain Factoring',
        sector: 'Enterprise Finance',
        problem: 'Leaking supply chain intelligence and supplier identities when seeking invoice financing.',
        solution: 'Buyers, suppliers, and financiers match intents privately. Credit risk is evaluated via ZK proofs without revealing underlying entity graphs.',
    },
    {
        rank: 3,
        icon: Globe,
        title: 'Sovereign Capital Syndicates',
        sector: 'DAOs / Governance',
        problem: 'Extreme capital inefficiency and slow governance overhead in traditional DAOs.',
        solution: 'Capital marshals instantly when a complex multi-party intent is globally solvable. The syndicate dissolves immediately post-execution.',
    },
    {
        rank: 4,
        icon: Zap,
        title: 'Autonomous AI Agents',
        sector: 'Foundational AI (OpenAI, Gemini, Anthropic)',
        problem: 'AI models rely on centralized API brokers and Web2 payment rails to execute economic actions — creating friction and trusted middlemen.',
        solution: 'AI agents output cryptographic Intents directly to Anoma. Solvers compute the globally optimal execution route — no intermediaries, no API keys.',
    },
    {
        rank: 5,
        icon: Terminal,
        title: 'Intent-Driven GPU Compute Market',
        sector: 'AI / HPC Infrastructure',
        problem: 'Centralized, inefficient allocation of idle GPU compute for AI training creates price opacity and single points of failure.',
        solution: 'Compute requirements are expressed as Anoma intents and matched globally. Tasks are routed to idle hardware without a centralized orchestrator.',
    },
    {
        rank: 6,
        icon: CircleDot,
        title: 'AnomaPay: Global Stablecoin Router',
        sector: 'Payments / Fintech',
        problem: 'Cross-border stablecoin payments fragment across chains, require centralized bridges, and expose sensitive payment data.',
        solution: 'AnomaPay uses Anoma intents to atomically route stablecoin payments across any chain with compliant privacy — no bridges, no custodians.',
    },
]

const ROADMAP = [
    { status: 'live', label: 'Ethereum Mainnet PA Deployed', note: 'ARM live on Ethereum' },
    { status: 'live', label: 'Base, Optimism & Arbitrum PAs', note: 'Full L2 coverage active' },
    { status: 'live', label: 'HelloWorld & Testnet Apps', note: 'Builders & users onboarded' },
    { status: 'active', label: 'Intents Initiates Builder Program', note: 'Cohort 01 in progress' },
    { status: 'active', label: 'AnomaPay Private Beta', note: 'Live on Base' },
    { status: 'next', label: 'Private Solving & FHE', note: 'Mainnet Phase 2+' },
    { status: 'next', label: 'MPC & Threshold Encryption', note: 'Advanced privacy stack' },
    { status: 'next', label: 'Chimera Chains', note: 'Multi-ledger atomic composability' },
    { status: 'future', label: 'Anoma Native Consensus', note: 'Custom security models & local settlement' },
    { status: 'future', label: 'Cross-Ecosystem Expansion', note: 'Solana, Cosmos + more' },
]

const STATUS_CONFIG = {
    live: { label: 'LIVE', color: 'bg-green-500', text: 'text-green-500', border: 'border-green-500/30' },
    active: { label: 'ACTIVE', color: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400/30' },
    next: { label: 'NEXT', color: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-400/30' },
    future: { label: 'FUTURE', color: 'bg-zinc-500', text: 'text-zinc-400', border: 'border-zinc-600' },
}

// ─────────────────────────────────────────
// VisionPage Component
// ─────────────────────────────────────────

export function VisionPage() {
    const controls = useAnimation()
    const navigate = useNavigate()
    const [activeGen, setActiveGen] = useState(2)

    useEffect(() => {
        controls.start(i => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.08, duration: 0.5, ease: [0.33, 1, 0.68, 1] },
        }))
    }, [controls])

    return (
        <div className="min-h-screen bg-[#F4F4F4] dark:bg-[#0A0A0A] text-black dark:text-white font-swiss selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <SEO title="Vision | The Intent-Centric Architecture" description="From Bitcoin to Ethereum to Anoma — the complete story of the third generation of decentralized architecture." />

            {/* ─── SECTION 1: HERO ─── */}
            <section className="relative pt-28 pb-24 overflow-hidden border-b-4 border-black dark:border-white">
                <div className="absolute inset-0 swiss-grid-bg opacity-20 pointer-events-none" />
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest mb-6 border border-black dark:border-white">
                            <BookOpen className="w-3.5 h-3.5" />
                            Architecture Blueprint
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.9, delay: 0.1 }}
                                className="text-6xl md:text-8xl lg:text-[96px] font-black uppercase tracking-tighter leading-[0.85] mb-8"
                            >
                                The<br />
                                Internet<br />
                                <span className="text-[#FF0000]">of Intents.</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.35 }}
                                className="text-lg md:text-xl font-bold uppercase tracking-tight text-gray-600 dark:text-zinc-400 max-w-xl leading-relaxed"
                            >
                                Anoma is a distributed operating system for intent-centric applications — Web3's missing OS, unifying all blockchains into a single development environment.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.55 }}
                                className="flex flex-wrap gap-4 mt-12"
                            >
                                {['Intent-Centric', 'Privacy-Native', 'Multi-Chain', 'Trustless'].map(tag => (
                                    <div key={tag} className="px-4 py-2 border-2 border-black dark:border-white text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                                        {tag}
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Abstract SVG Hero Graphic */}
                        <div className="flex justify-center lg:justify-end">
                            <svg viewBox="0 0 500 500" className="w-full max-w-[460px] h-auto">
                                {/* Orbit rings */}
                                <motion.circle cx="250" cy="250" r="220" fill="none" stroke="currentColor" strokeWidth="1" className="text-black/10 dark:text-white/10"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.5, ease: "easeInOut" }} />
                                <motion.circle cx="250" cy="250" r="160" fill="none" stroke="currentColor" strokeWidth="1" className="text-black/10 dark:text-white/10"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut", delay: 0.3 }} />

                                {/* Center core */}
                                <motion.rect x="210" y="210" width="80" height="80" fill="#FF0000"
                                    initial={{ scale: 0, rotate: 45 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1, delay: 0.5, type: 'spring', stiffness: 200 }} />

                                {/* Orbiting nodes */}
                                {[0, 72, 144, 216, 288].map((angle, i) => {
                                    const rad = (angle * Math.PI) / 180
                                    const x = 250 + 160 * Math.cos(rad)
                                    const y = 250 + 160 * Math.sin(rad)
                                    return (
                                        <motion.circle key={i} cx={x} cy={y} r="10" fill="currentColor" className="text-black dark:text-white"
                                            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.8 + i * 0.12, duration: 0.4, type: 'spring' }} />
                                    )
                                })}

                                {/* Connection lines */}
                                {[0, 72, 144, 216, 288].map((angle, i) => {
                                    const rad = (angle * Math.PI) / 180
                                    const x = 250 + 160 * Math.cos(rad)
                                    const y = 250 + 160 * Math.sin(rad)
                                    return (
                                        <motion.line key={`l-${i}`} x1="250" y1="250" x2={x} y2={y}
                                            stroke="#FF0000" strokeWidth="1.5" strokeDasharray="4 4"
                                            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }}
                                            transition={{ delay: 1 + i * 0.1, duration: 0.6 }} />
                                    )
                                })}

                                {/* Outer nodes at 220 radius */}
                                {[36, 108, 180, 252, 324].map((angle, i) => {
                                    const rad = (angle * Math.PI) / 180
                                    const x = 250 + 220 * Math.cos(rad)
                                    const y = 250 + 220 * Math.sin(rad)
                                    return (
                                        <motion.circle key={`out-${i}`} cx={x} cy={y} r="5" fill="currentColor" className="text-gray-400 dark:text-zinc-600"
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }} />
                                    )
                                })}
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SECTION 2: THE 3-GENERATION ARC ─── */}
            <section className="border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">The Evolution</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">3 Generations<br />of Decentralization</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    {/* Generation Tabs */}
                    <div className="flex gap-0 border-4 border-black dark:border-white mb-8 w-full max-w-2xl">
                        {GENERATIONS.map((g, i) => (
                            <button key={g.gen} onClick={() => setActiveGen(i)}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${activeGen === i ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                {g.gen}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeGen}
                            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                            <div>
                                <div className="flex items-baseline gap-4 mb-4">
                                    <span className="text-[80px] font-black leading-none" style={{ color: GENERATIONS[activeGen].color }}>
                                        {GENERATIONS[activeGen].name}
                                    </span>
                                    <span className="text-2xl font-black text-gray-400 dark:text-zinc-600">{GENERATIONS[activeGen].year}</span>
                                </div>
                                <div className="inline-block px-3 py-1 border-2 mb-6 text-xs font-black uppercase tracking-widest"
                                    style={{ borderColor: GENERATIONS[activeGen].color, color: GENERATIONS[activeGen].color }}>
                                    {GENERATIONS[activeGen].tagline}
                                </div>
                                <p className="text-base font-bold uppercase tracking-tight text-gray-600 dark:text-zinc-400 leading-relaxed max-w-lg">
                                    {GENERATIONS[activeGen].desc}
                                </p>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Enabled Applications</div>
                                <div className="space-y-3">
                                    {GENERATIONS[activeGen].apps.map((app, i) => (
                                        <motion.div key={app} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                            className="flex items-center gap-4 p-4 border-2 border-black/10 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/50 group hover:border-[#FF0000] transition-colors">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GENERATIONS[activeGen].color }} />
                                            <span className="text-sm font-black uppercase tracking-widest">{app}</span>
                                        </motion.div>
                                    ))}
                                </div>
                                {activeGen === 2 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                                        className="mt-6 p-4 bg-[#FF0000] text-black text-xs font-black uppercase tracking-widest leading-relaxed">
                                        + Any application imaginable. Anoma enables app types that don't yet exist.
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Gen progression bar */}
                    <div className="mt-16 flex items-center gap-0">
                        {GENERATIONS.map((g, i) => (
                            <div key={g.gen} className="flex items-center flex-1">
                                <button onClick={() => setActiveGen(i)} className="flex flex-col items-center gap-2 group">
                                    <div className="w-5 h-5 rounded-full border-4 transition-all duration-300"
                                        style={{ borderColor: g.color, background: activeGen === i ? g.color : 'transparent' }} />
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{g.year}</span>
                                </button>
                                {i < GENERATIONS.length - 1 && (
                                    <div className="flex-1 h-1 bg-gradient-to-r mx-3" style={{
                                        background: `linear-gradient(to right, ${GENERATIONS[i].color}, ${GENERATIONS[i + 1].color})`
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 3: WHAT IS AN INTENT? ─── */}
            <section className="border-b-4 border-black dark:border-white">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left – The old way */}
                    <div className="p-10 md:p-16 border-b-4 md:border-b-0 md:border-r-4 border-black dark:border-white bg-gray-50 dark:bg-zinc-900/50">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">The Old Way — Imperative</div>
                        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 line-through decoration-[#FF0000] decoration-4">Transaction Centric</h2>
                        <div className="space-y-3">
                            {['1. Open wallet app', '2. Select source chain', '3. Evaluate bridges', '4. Approve token spend', '5. Submit transaction', '6. Wait for confirmation', '7. Hope nothing failed'].map((step, i) => (
                                <div key={step} className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                                    <span className="text-[10px] font-black text-gray-300 dark:text-zinc-700 w-4">{i + 1}</span>
                                    <span className={i === 6 ? 'text-[#FF0000]' : ''}>{step}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-4 border-2 border-[#FF0000]/30 bg-[#FF0000]/5 text-xs font-black uppercase tracking-widest text-[#FF0000]">
                            Users must understand blockchains to use blockchains.
                        </div>
                    </div>

                    {/* Right – The new way */}
                    <div className="p-10 md:p-16 bg-black text-white dark:bg-white dark:text-black relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#FF0000] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left ease-[cubic-bezier(0.33,1,0.68,1)] z-0" />
                        <div className="relative z-10">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 dark:text-black/40 group-hover:text-black/50 transition-colors mb-4">The New Way — Declarative</div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 group-hover:text-black transition-colors duration-500">Intent Centric</h2>
                            <div className="space-y-6">
                                <div className="p-5 border-2 border-white/20 dark:border-black/20 group-hover:border-black/20 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/40 dark:text-black/40 group-hover:text-black/50 transition-colors mb-2">User declares intent</div>
                                    <p className="text-xl font-black uppercase tracking-tighter group-hover:text-black transition-colors duration-500">
                                        "Borrow USDC against my ETH at the best rate across any chain."
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white/60 dark:text-black/60 group-hover:text-black/60 transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                    Anoma Solvers handle everything
                                </div>
                                <div className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white/60 dark:text-black/60 group-hover:text-black/60 transition-colors">
                                    <ArrowRight className="w-5 h-5" />
                                    Atomic settlement across chains
                                </div>
                                <div className="flex items-center gap-3 font-black uppercase tracking-widest text-white dark:text-black group-hover:text-black transition-colors">
                                    <CheckCircle className="w-5 h-5 text-green-400 group-hover:text-green-600 transition-colors" />
                                    Done. One interaction.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SECTION 4: INTENT LIFECYCLE ─── */}
            <section className="border-b-4 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">The Solver Network</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">From Intent<br />To Settlement</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
                        {LIFECYCLE_STEPS.map((step, i) => {
                            const Icon = step.icon
                            return (
                                <motion.div key={step.num}
                                    custom={i} initial={{ opacity: 0, y: 40 }} animate={controls}
                                    variants={{ hidden: { opacity: 0, y: 40 } }}
                                    className="group border-r-0 last:border-r-0 md:border-r-2 border-white/10 dark:border-black/10 p-6 hover:bg-white/5 dark:hover:bg-black/5 transition-colors">
                                    <div className="text-[#FF0000] text-4xl font-black mb-4 leading-none">{step.num}</div>
                                    <div className="w-10 h-10 bg-white/10 dark:bg-black/10 group-hover:bg-[#FF0000] transition-colors flex items-center justify-center mb-5">
                                        <Icon className="w-5 h-5 text-white dark:text-black group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tighter mb-3 leading-tight">{step.title}</h3>
                                    <p className="text-xs font-bold uppercase tracking-wider text-white/50 dark:text-black/50 leading-relaxed">{step.desc}</p>
                                    {i < LIFECYCLE_STEPS.length - 1 && (
                                        <motion.div className="hidden md:block absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#FF0000] rotate-45"
                                            animate={{ scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 5: PRIVACY / IFC ─── */}
            <section className="border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left – Privacy statement */}
                    <div className="p-10 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-black dark:border-white flex flex-col justify-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-6">Information Flow Control</div>
                        <blockquote className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-tight mb-8">
                            "Privacy isn't about hiding or obscuring information — it's about the{' '}
                            <span className="text-[#FF0000]">appropriate flow</span>{' '}
                            of information."
                        </blockquote>
                        <p className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 leading-relaxed">
                            Your medical records are shared with your doctor, not the world. Anoma's three-tiered IFC brings this principle on-chain — natively, without bolt-on privacy layers.
                        </p>
                    </div>

                    {/* Right – Privacy tiers */}
                    <div className="p-10 lg:p-16 flex flex-col justify-center gap-6">
                        {[
                            { tier: 'Tier I', title: 'State Privacy', desc: 'Resource data and balances are shielded by default using commitment/nullifier cryptography inspired by Zcash.' },
                            { tier: 'Tier II', title: 'Intent Privacy', desc: 'Intent parameters (order size, limit price, counterparty) are never exposed to the public mempool. Solvers match blindly.' },
                            { tier: 'Tier III', title: 'P2P Network Privacy', desc: 'Peer-to-peer metadata — who gossips what intent to whom — is protected, eliminating adversarial network-level surveillance.' },
                        ].map((tier, i) => (
                            <motion.div key={tier.tier} custom={i} initial={{ opacity: 0, x: 30 }} animate={controls} variants={{ hidden: { opacity: 0, x: 30 } }}
                                className="flex gap-5 p-5 border-2 border-black/10 dark:border-white/10 hover:border-[#FF0000] transition-colors group">
                                <div className="flex-shrink-0 w-16 h-16 bg-black dark:bg-white flex items-center justify-center group-hover:bg-[#FF0000] transition-colors">
                                    <span className="text-white dark:text-black text-xs font-black uppercase">{tier.tier}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter mb-1">{tier.title}</h3>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 leading-relaxed">{tier.desc}</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* Coming soon */}
                        <div className="p-4 border-2 border-dashed border-black/20 dark:border-white/20">
                            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-2">Phase 2+ — Coming</div>
                            <div className="flex flex-wrap gap-2">
                                {['FHE', 'MPC', 'Threshold Encryption', 'Private Solving'].map(tech => (
                                    <span key={tech} className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-400/10 text-blue-400 border border-blue-400/20">{tech}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SECTION 6: USE CASES ─── */}
            <section className="border-b-4 border-black dark:border-white bg-[#FF0000]">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/60 mb-3">What Becomes Possible</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-black mb-4">Real-World<br />Applications</h2>
                        <p className="text-xl font-bold uppercase tracking-tight text-black/80 max-w-2xl">
                            Structured around intent-level composability and atomic multi-party settlement. From finance to AI compute.
                        </p>
                        <div className="w-32 h-2 bg-black mt-4" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {USE_CASES.map((uc, i) => {
                            const Icon = uc.icon
                            return (
                                <motion.div key={uc.title} custom={i} initial={{ opacity: 0, y: 50 }} animate={controls} variants={{ hidden: { opacity: 0, y: 50 } }}
                                    className="bg-black text-white p-7 group hover:-translate-y-2 hover:shadow-[8px_8px_0_rgba(255,255,255,0.4)] transition-all duration-300 border-4 border-black relative overflow-hidden h-full flex flex-col">
                                    <div className="text-[100px] font-black leading-none text-white/5 group-hover:text-[#FF0000]/10 absolute -right-6 -top-6 pointer-events-none transition-colors duration-500">
                                        {uc.rank < 10 ? `0${uc.rank}` : uc.rank}
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-white/10 group-hover:bg-[#FF0000] transition-colors flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-[#FF0000] text-right max-w-[140px] leading-tight">{uc.sector}</div>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-4 group-hover:text-[#FF0000] transition-colors leading-tight flex-1">{uc.title}</h3>
                                        <div className="space-y-4 flex-shrink-0">
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Problem</div>
                                                <p className="text-xs font-bold tracking-wide text-white/80 uppercase leading-relaxed">{uc.problem}</p>
                                            </div>
                                            <div className="border-t border-white/10 pt-3">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-green-400 mb-1">Anoma Solution</div>
                                                <p className="text-xs font-bold tracking-wide text-white/80 uppercase leading-relaxed">{uc.solution}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 7: LIVE ROADMAP ─── */}
            <section className="border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">The Road to Mainnet</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Live Roadmap</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10">
                        {ROADMAP.map((item, i) => {
                            const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG]
                            return (
                                <motion.div key={item.label}
                                    custom={i} initial={{ opacity: 0 }} animate={controls} variants={{ hidden: { opacity: 0 } }}
                                    className={`flex items-start gap-5 p-6 bg-white dark:bg-black border-l-4 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors ${cfg.border}`}>
                                    <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
                                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} ${item.status === 'live' ? 'animate-pulse' : ''}`} />
                                        {item.status === 'live' && (
                                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.color} opacity-40 animate-ping`} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-tighter">{item.label}</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 mt-1">{item.note}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    {/* Live stats row */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { val: '4', label: 'Chains Live', accent: '#FF0000' },
                            { val: 'ETH + L2s', label: 'Protocol Adapters', accent: '#627EEA' },
                            { val: 'Phase 1', label: 'Mainnet Status', accent: '#22c55e' },
                            { val: 'Phase 2+', label: 'Next: Private Solving', accent: '#3b82f6' },
                        ].map(stat => (
                            <div key={stat.label} className="p-5 border-4 border-black dark:border-white hover:-translate-y-1 transition-transform">
                                <div className="text-3xl font-black mb-1" style={{ color: stat.accent }}>{stat.val}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 8: TECHNICAL DEEP DIVE CTA ─── */}
            <section className="bg-black dark:bg-white text-white dark:text-black py-32 text-center group cursor-pointer border-b-4 border-black dark:border-white" onClick={() => navigate('/vision/architecture')}>
                <div className="max-w-[1440px] mx-auto px-6 overflow-hidden relative">
                    <motion.div className="absolute inset-0 bg-[#FF0000] z-0 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-bottom" />
                    <div className="relative z-10 flex flex-col items-center">
                        <Terminal className="w-14 h-14 mb-8 group-hover:text-black transition-colors duration-500" />
                        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-8 group-hover:text-black transition-colors duration-500 leading-none">
                            Read The<br />Technical<br />Deep Dive
                        </h2>
                        <p className="text-base font-bold uppercase tracking-widest text-white/60 dark:text-black/60 group-hover:text-black/70 transition-colors duration-500 mb-10 max-w-lg">
                            ARM specifications, Juvix code examples, ZK proof systems, and the full Anoma transaction lifecycle.
                        </p>
                        <div className="inline-flex items-center gap-4 text-xl font-black uppercase tracking-widest border-2 border-white dark:border-black px-8 py-4 group-hover:border-black group-hover:text-black transition-colors duration-500">
                            Architecture Specifications <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

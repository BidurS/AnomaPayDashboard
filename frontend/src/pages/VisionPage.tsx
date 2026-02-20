import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useAnimation } from 'framer-motion'
import { BookOpen, ArrowRight, EyeOff, Combine, Terminal } from 'lucide-react'
import { SEO } from '../components/SEO'

const USE_CASES = [
    {
        rank: 1,
        title: 'Decentralized ZK Corporate Dark Pool',
        problem: 'Market impact, slippage, and front-running for large institutional treasury rebalancing.',
        solution: 'Utilizes intent-level IFC to completely hide order size and limit price from the public mempool; solvers compute matches blindly until settlement.'
    },
    {
        rank: 2,
        title: 'Shielded Supply Chain Factoring',
        problem: 'Leaking supply chain intelligence and supplier identities when seeking invoice financing.',
        solution: 'Buyers, suppliers, and financiers match intents privately; credit risk is evaluated via zero-knowledge proofs without revealing underlying entity graphs.'
    },
    {
        rank: 3,
        title: 'Programmable Sovereign Syndicates',
        problem: 'Extreme capital inefficiency and slow governance overhead inherent in traditional DAOs.',
        solution: 'Capital is marshaled instantaneously only when a complex multi-party intent is globally solvable; the syndicate dissolves immediately post-execution.'
    },
    {
        rank: 4,
        title: 'Autonomous AI Agents (OpenAI, Gemini)',
        problem: 'Foundational models rely on centralized API brokers and Web2 payment rails to execute economic actions, creating friction and trusted middlemen.',
        solution: 'AI models output cryptographic Intents directly. Solvers globally compute the most efficient execution route (trading, purchasing compute) without intermediaries.'
    },
    {
        rank: 5,
        title: 'Intent-Driven GPU Compute Market',
        problem: 'The highly inefficient, centralized allocation of idle GPU compute for artificial intelligence training.',
        solution: 'Compute requirements are expressed as generic intents and matched globally; Anoma routes verifiable compute tasks without a centralized orchestrator.'
    }
]

export function VisionPage() {
    const controls = useAnimation()
    const navigate = useNavigate()

    useEffect(() => {
        controls.start(i => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: [0.33, 1, 0.68, 1] },
        }))
    }, [controls])

    return (
        <div className="min-h-screen bg-[#F4F4F4] dark:bg-[#0A0A0A] text-black dark:text-white pb-24 font-swiss selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <SEO title="Vision | The Intent-Centric Architecture" description="A First-Principles Deconstruction of Decentralized Architectures based on the Anoma Blueprint." />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden border-b-4 border-black dark:border-white">
                <div className="absolute inset-0 swiss-grid-bg opacity-20 pointer-events-none" />
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest mb-6 border border-black dark:border-white">
                                <BookOpen className="w-4 h-4" />
                                Architecture Blueprint
                            </div>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: [0.33, 1, 0.68, 1] }}
                            className="text-6xl md:text-8xl lg:text-[100px] font-black uppercase tracking-tighter leading-[0.85] mb-8"
                        >
                            The Next<br />
                            Generation<br />
                            <span className="text-[#FF0000]">Of Intents.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-xl md:text-2xl font-bold uppercase tracking-tight text-gray-600 dark:text-zinc-400 max-w-2xl"
                        >
                            A first-principles deconstruction of decentralized architectures. Moving beyond imperative execution to declarative desires.
                        </motion.p>
                    </div>

                    <div className="flex-1 w-full flex justify-end">
                        {/* Hero Abstract Graphic */}
                        <svg viewBox="0 0 400 400" className="w-[80%] h-auto max-w-[400px]">
                            <motion.circle
                                cx="200" cy="200" r="180"
                                fill="none" stroke="currentColor" strokeWidth="4" className="text-black dark:text-white opacity-20"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }}
                            />
                            <motion.rect
                                x="60" y="60" width="120" height="120"
                                fill="none" stroke="#FF0000" strokeWidth="8"
                                initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1, delay: 0.5, type: "spring" }}
                            />
                            <motion.rect
                                x="180" y="180" width="160" height="160"
                                fill="currentColor" className="text-black dark:text-white"
                                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, delay: 0.7, type: "spring" }}
                            />
                            <motion.path
                                d="M 120 120 L 260 260"
                                stroke="#FF0000" strokeWidth="12" strokeLinecap="square"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 1 }}
                            />
                        </svg>
                    </div>
                </div>
            </section>

            {/* The Problem (Imperative) vs The Solution (Declarative) */}
            <section className="border-b-4 border-black dark:border-white bg-white dark:bg-[#0A0A0A]">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-10 md:p-16 border-b-4 md:border-b-0 md:border-r-4 border-black dark:border-white flex flex-col justify-center bg-gray-50 dark:bg-black">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">The EVM Bottleneck</h2>
                        <p className="text-lg font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-tight leading-relaxed">
                            First and second-generation blockchains rely on an imperative execution model. Users must explicitly define computational steps, forcing them to orchestrate routing, exposing them to MEV vulnerabilities, and fragmenting multi-chain liquidity.
                        </p>
                        <div className="mt-8 flex items-center gap-3 text-2xl font-black uppercase line-through text-[#FF0000] opacity-60">
                            Imperative Execution
                        </div>
                    </div>

                    <div className="p-10 md:p-16 bg-black text-white dark:bg-white dark:text-black flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#FF0000] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left ease-[cubic-bezier(0.33,1,0.68,1)] z-0" />
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 group-hover:text-black transition-colors duration-500">Intent-Centric Architecture</h2>
                            <p className="text-lg font-bold uppercase tracking-tight leading-relaxed text-gray-400 dark:text-gray-600 group-hover:text-black/80 transition-colors duration-500">
                                Applications operate declaratively. Users articulate the final state they wish to achieve—the "intent"—without prescribing the computational pathway. The network handles counterparty discovery and multi-chain settlement.
                            </p>
                            <div className="mt-8 flex items-center gap-3 text-2xl font-black uppercase text-white dark:text-black group-hover:text-black transition-colors duration-500">
                                Declarative Desires <ArrowRight className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Architectural Pillars */}
            <section className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                <div className="mb-16">
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Core Pillars</h2>
                    <div className="w-24 h-4 bg-[#FF0000]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Combine,
                            title: "Abstract Resource Machine",
                            desc: "Replaces accounts and UTXOs with immutable data structures. Resources are created exactly once and consumed exactly once. State transitions require mathematical balancing."
                        },
                        {
                            icon: EyeOff,
                            title: "Information Flow Control",
                            desc: "Three-tiered privacy architecture natively integrating zkVMs (Cairo, RISC Zero). Protects state, intent parameters, and peer-to-peer metadata from adversarial extraction."
                        },
                        {
                            icon: Terminal,
                            title: "Juvix & Solver Network",
                            desc: "A functionally pure, dependently typed language to construct validity predicates. Solvers compete off-chain to discover a Coincidence of Wants (CoW) efficiently."
                        }
                    ].map((pillar, i) => {
                        const Icon = pillar.icon;
                        return (
                            <motion.div
                                custom={i} initial="hidden" animate={controls} variants={{ hidden: { opacity: 0, y: 50 } }}
                                key={pillar.title}
                                className="border-4 border-black dark:border-white p-8 bg-white dark:bg-black hover:-translate-y-2 hover:shadow-[12px_12px_0_#FF0000] dark:hover:shadow-[12px_12px_0_#FF0000] transition-all duration-300 group"
                            >
                                <div className="w-16 h-16 bg-black dark:bg-white flex items-center justify-center mb-8 transform group-hover:rotate-12 transition-transform duration-300">
                                    <Icon className="w-8 h-8 text-white dark:text-black" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 leading-none">{pillar.title}</h3>
                                <p className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 leading-relaxed">
                                    {pillar.desc}
                                </p>
                            </motion.div>
                        )
                    })}
                </div>
            </section>

            {/* Top Protocol Implementations */}
            <section className="border-t-4 border-black dark:border-white bg-[#FF0000] text-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-24">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 text-black">Top Commercial Uses</h2>
                            <p className="text-xl font-bold uppercase tracking-tight max-w-2xl text-black/80">
                                Applications structured entirely around intent-level composability and multi-party atomic settlement.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 object-cover">
                        {USE_CASES.map((useCase) => (
                            <div key={useCase.title} className="bg-black p-8 group hover:-translate-y-2 transition-transform duration-300 border-4 border-black relative overflow-hidden">
                                <div className="text-[120px] font-black leading-none text-white/5 group-hover:text-[#FF0000]/10 absolute -right-8 -top-8 pointer-events-none transition-colors duration-500">
                                    {useCase.rank < 10 ? `0${useCase.rank}` : useCase.rank}
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter mb-6 relative z-10 pr-20 text-white group-hover:text-[#FF0000] transition-colors">{useCase.title}</h3>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Problem Solved</div>
                                        <p className="text-sm font-bold tracking-wide text-white/90 uppercase">{useCase.problem}</p>
                                    </div>
                                    <div className="border-t-2 border-white/10 pt-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1 group-hover:text-green-500 transition-colors">Anoma Solution</div>
                                        <p className="text-sm font-bold tracking-wide text-white/90 uppercase">{useCase.solution}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* Deep Dive CTA */}
            <section className="border-t-4 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black py-32 text-center group cursor-pointer" onClick={() => navigate('/vision/architecture')}>
                <div className="max-w-[1440px] mx-auto px-6 overflow-hidden relative">
                    <motion.div
                        className="absolute inset-0 bg-[#FF0000] z-0 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-bottom"
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        <Terminal className="w-16 h-16 mb-8 group-hover:text-black transition-colors duration-500" />
                        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter mb-8 group-hover:text-black transition-colors duration-500">
                            Read The<br />Technical<br />Deep Dive
                        </h2>
                        <div className="inline-flex items-center gap-4 text-2xl font-black uppercase tracking-widest border-2 border-white dark:border-black px-8 py-4 group-hover:border-black group-hover:text-black transition-colors duration-500">
                            Architecture Specifications <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                </div>
            </section>

        </div>
    )
}

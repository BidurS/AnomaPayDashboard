import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Terminal, Code2, Database, Network, Lock, Zap, FileJson, ArrowRight, Activity } from 'lucide-react'
import { SEO } from '../components/SEO'

const JUVIX_CODE_SNIPPET = `// Example: Simplified Intent for a Shielded Swap
module ShieldedSwap;

open import Anoma.Intent;
open import Anoma.Cryptography.zkSNARK;

type Token = USDC | ETH;

// The user defines the END STATE, not the exact path.
intent SwapIntent {
  give: Resource<Token.USDC, 1000>;
  want: Resource<Token.ETH, 0.5>;
  
  // The validity predicate ensures conservation of value
  predicate valid(state: State) :=
    balance(state, want) == state.pre_balance + 0.5 &&
    balance(state, give) == state.pre_balance - 1000;
}

// Solvers will find a CoW (Coincidence of Wants) and generate a proof
function solve(intent: SwapIntent): Transaction {
  // ... Solver logic executed off-chain ...
}
`

export function VisionArchitecturePage() {
    const controls = useAnimation()

    useEffect(() => {
        controls.start(i => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: [0.33, 1, 0.68, 1] },
        }))
    }, [controls])

    return (
        <div className="min-h-screen bg-[#F4F4F4] dark:bg-[#0A0A0A] text-black dark:text-white pb-24 font-swiss selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <SEO title="Architecture Specifications | Anoma Deep Dive" description="Technical deep dive into the Anoma Architecture: ARM, IFC, and Juvix." />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden border-b-4 border-black dark:border-white">
                <div className="absolute inset-0 swiss-grid-bg opacity-20 pointer-events-none" />
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest mb-6 border border-black dark:border-white">
                            <Terminal className="w-4 h-4" />
                            Technical Architecture
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.33, 1, 0.68, 1] }}
                        className="text-6xl md:text-8xl lg:text-[100px] font-black uppercase tracking-tighter leading-[0.85] mb-8 max-w-5xl"
                    >
                        Deep Dive: <br />
                        <span className="text-[#FF0000]">The ARM & IFC.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-xl md:text-2xl font-bold uppercase tracking-tight text-gray-600 dark:text-zinc-400 max-w-3xl"
                    >
                        Detailed specifications of the Abstract Resource Machine, Information Flow Control, and intent compilation via Juvix.
                    </motion.p>
                </div>
            </section>

            {/* The Transaction Lifecycle */}
            <section className="py-24 border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-12">The Intent Lifecycle</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border-4 border-black dark:border-white">
                        {[
                            { step: 1, title: 'Expression', icon: Code2, desc: 'Users express desired end states (intents) natively or via specialized DSLs. These describe *what* is wanted, not *how* to get it.' },
                            { step: 2, title: 'Gossip Network', icon: Network, desc: 'Intents are broadcasted into the Anoma gossip layer, a peer-to-peer mempool focused on high-throughput intent propagation.' },
                            { step: 3, title: 'Solver Discovery', icon: Activity, desc: 'Decentralized Solvers monitor the network, deploying complex algorithms off-chain to find a Coincidence of Wants (CoW) or optimal routing.' },
                            { step: 4, title: 'Provers & Settlement', icon: Lock, desc: 'Once a path is found, provers generate zk-SNARKs proving validity predicates were satisfied. The transaction settles atomically on the ARM.' }
                        ].map((phase, idx) => (
                            <div key={phase.step} className={`p-8 ${idx !== 3 ? 'border-b-4 md:border-b-0 md:border-r-4' : ''} border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-300 group`}>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-6xl font-black text-gray-200 dark:text-zinc-800 group-hover:text-white/20 dark:group-hover:text-black/20">0{phase.step}</span>
                                    <phase.icon className="w-8 h-8 text-[#FF0000]" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{phase.title}</h3>
                                <p className="font-medium text-sm leading-relaxed opacity-80">{phase.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Juvix & Code Example */}
            <section className="py-24 border-b-4 border-black dark:border-white bg-[#0A0A0A] text-white">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">Juvix <span className="text-[#FF0000]">Compilation</span></h2>
                        <div className="w-24 h-4 bg-[#FF0000] mb-8" />
                        <p className="text-xl font-bold uppercase tracking-tight text-gray-400 mb-6 leading-relaxed">
                            Juvix is a functionally pure, dependently typed language designed specifically for the Anoma VM architecture.
                        </p>
                        <p className="text-lg font-medium text-gray-500 mb-8 leading-relaxed">
                            It compiles directly into Nockma bytecode or generates arithmetic circuits (VampIR) for validity predicates. This allows developers to write formal proofs of intent logic, minimizing vulnerabilities at the protocol layer.
                        </p>
                    </div>

                    <div className="bg-[#111] p-2 sm:p-4 md:p-8 border border-white/10 relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-50"><FileJson className="w-6 h-6 text-gray-500" /></div>
                        <pre className="font-mono text-xs md:text-sm text-green-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            <code>{JUVIX_CODE_SNIPPET}</code>
                        </pre>
                    </div>
                </div>
            </section>

            {/* Information Flow Control & ARM */}
            <section className="py-24 max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                    <div className="flex items-center gap-4 mb-6 text-[#FF0000]">
                        <Database className="w-10 h-10" />
                        <h2 className="text-4xl font-black uppercase tracking-tighter">The ARM</h2>
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Abstract Resource Machine</h3>
                    <p className="mb-6 font-medium text-gray-600 dark:text-zinc-400 leading-relaxed">
                        The ARM replaces the account-model (EVM) and standard UTXOs. It operates on atomic 'resources'. A resource is created exactly once and consumed exactly once.
                    </p>
                    <p className="font-medium text-gray-600 dark:text-zinc-400 leading-relaxed">
                        Every transaction is a set of consumed resources and created resources. The transition only settles if the state mathematically balances to zero according to attached multi-party validity predicates. This natively supports complex N-party swaps without requiring smart contract orchestration.
                    </p>
                </div>

                <div>
                    <div className="flex items-center gap-4 mb-6 text-[#FF0000]">
                        <Lock className="w-10 h-10" />
                        <h2 className="text-4xl font-black uppercase tracking-tighter">IFC</h2>
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight mb-4">Information Flow Control</h3>
                    <p className="mb-6 font-medium text-gray-600 dark:text-zinc-400 leading-relaxed">
                        To prevent MEV and metadata leakage, Anoma employs a 3-tier privacy architecture natively executing via zkVMs (Zero-Knowledge Virtual Machines).
                    </p>
                    <ul className="space-y-4 font-medium text-gray-600 dark:text-zinc-400">
                        <li className="flex items-start gap-2"><ArrowRight className="w-5 h-5 text-black dark:text-white shrink-0 mt-0.5" /> <strong>State Level:</strong> Shielded asset balances utilizing zero-knowledge proofs.</li>
                        <li className="flex items-start gap-2"><ArrowRight className="w-5 h-5 text-black dark:text-white shrink-0 mt-0.5" /> <strong>Intent Level:</strong> Hiding execution parameters (e.g., limit price, volume) from observers until cryptographically committed.</li>
                        <li className="flex items-start gap-2"><ArrowRight className="w-5 h-5 text-black dark:text-white shrink-0 mt-0.5" /> <strong>Network Level:</strong> Utilizing Nym/Tor-like mixnets to obfuscate IP and peer-to-peer metadata.</li>
                    </ul>
                </div>
            </section>

            {/* AI Deep Dive */}
            <section className="border-t-4 border-black dark:border-white bg-[#F4F4F4] dark:bg-[#111] py-24">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
                    <Zap className="w-16 h-16 mx-auto mb-8 text-[#FF0000]" />
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8">Decentralized AI Compute</h2>
                    <p className="text-lg md:text-xl font-bold uppercase tracking-tight max-w-4xl mx-auto text-gray-600 dark:text-zinc-400 leading-relaxed">
                        By decoupling execution from settlement, the ARM creates a perfect market for decentralized AI. Users express an intent for an inference task (e.g., LLM generation). Specialized node operators (running highly optimized GPU clusters) compute the result and submit it back to the network alongside a succinct proof of correctness, settling payment atomically.
                    </p>
                </div>
            </section>

        </div>
    )
}

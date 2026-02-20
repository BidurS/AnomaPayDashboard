import { useEffect, useState } from 'react'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { Terminal, Code2, Database, Network, Lock, FileJson, ArrowRight, Activity, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { SEO } from '../components/SEO'

// ─────────────────────────────────────────
// Data Constants
// ─────────────────────────────────────────

const JUVIX_SWAP = `-- Example: Shielded Swap Intent in Juvix
module ShieldedSwap;

open import Anoma.Intent;
open import Anoma.Resource;
open import Anoma.Cryptography.ZK;

-- Resources represent any unit of state
type Token := USDC | ETH | WBTC;

-- A resource: typed, owned, consumable exactly once
record SwapResource :=
  mkResource {
    label   : Token;         -- what token
    quantity: Nat;           -- how many (in wei)
    owner   : PublicKey;     -- commitment to owner
  };

-- Intent: the desired END STATE, not the path
intent ShieldedSwap :=
  mkIntent {
    give : SwapResource USDC 1000_000000;   -- 1000 USDC
    want : SwapResource ETH  500_000000000; -- 0.5 ETH
    -- Validity predicate: conserves value
    predicate valid (pre post : State) :=
      post.balance give.label == pre.balance give.label - give.quantity
      && post.balance want.label == pre.balance want.label + want.quantity;
  };

-- Solvers find a Coincidence of Wants (CoW) and
-- generate a zk-SNARK proof that predicate holds.
-- Settlement is atomic — either ALL resources transfer or NONE.
`

const JUVIX_VOTE = `-- Example: Private DAO Vote
module PrivateVote;

open import Anoma.Intent;
open import Anoma.Cryptography.NullifierSet;

record VoteToken :=
  mkVote { proposalId : Hash; choice : Bool; };

intent CastVote :=
  mkIntent {
    -- Nullifier prevents double-voting
    nullifier : NullifierSet.generate VoteToken;
    -- Commitment hides choice until tally
    commit    : Pedersen.commit choice;
    predicate valid (pre post : State) :=
      NullifierSet.notSpent pre nullifier;
  };`

const ARM_PROPERTIES = [
    { title: 'Resource Duality', desc: 'Every state transition consumes exactly N resources and creates exactly M resources. No state can exist outside the resource graph. This eliminates reentrancy attacks at the protocol level.', code: 'consumed_resources + created_resources = Δ(0)' },
    { title: 'Validity Predicates', desc: 'Each resource carries a logic function (validity predicate) that must return true for any transaction consuming it. Predicates are compiled to arithmetic circuits and verified via zk-SNARK proofs.', code: '∀ r ∈ consumed: predicate(r, pre_state, post_state) = ⊤' },
    { title: 'Multi-Party Atomicity', desc: 'N-party intent matching settles in a single atomic transaction. If any one predicate fails, the entire bundle reverts — no partial execution, no orphaned state.', code: 'settle(intents) := ∀i ∈ intents: valid(i) ? commit : revert_all' },
    { title: 'Data Sovereignty', desc: 'Resource data can live on any substrate: Ethereum, Arweave, a user device, or a private server. The ARM references commitments to off-chain data, never requiring full data availability on-chain.', code: 'resource.data ∈ {on-chain, off-chain, local, private}' },
]

const IFC_TIERS = [
    { tier: 'TIER I', title: 'State Privacy', icon: Database, color: '#22c55e', desc: 'Asset balances and resource ownership are hidden behind Pedersen commitments and nullifier sets (inspired by Zcash Sapling). The public chain only sees a validity proof — never the actual amounts or owners.', tech: ['Pedersen Commitments', 'Nullifier Sets', 'zk-SNARKs (Groth16 / PLONK)'] },
    { tier: 'TIER II', title: 'Intent Privacy', icon: Shield, color: '#3b82f6', desc: 'Intent parameters (order size, limit price, counterparty preferences) are encrypted and never exposed to the public mempool. Solvers receive only the minimum data needed to match intents via threshold decryption.', tech: ['Threshold Encryption', 'Homomorphic Matching', 'Decoy Intents'] },
    { tier: 'TIER III', title: 'P2P Network Privacy', icon: Network, color: '#a855f7', desc: 'Who broadcasts which intent to whom is obfuscated at the transport layer. Anoma\'s P2P gossip layer incorporates mixnet-style routing to prevent adversarial network analysis from correlating IP → intent.', tech: ['Mixnet Routing', 'Onion Encryption', 'Traffic Analysis Resistance'] },
    { tier: 'PHASE 2+', title: 'Fully Homomorphic Encryption', icon: Lock, color: '#f59e0b', desc: 'Solvers will be able to compute on encrypted intent data without ever decrypting it. This enables fully private matching — the solver learns nothing about intent parameters while still finding optimal CoWs.', tech: ['FHE (TFHE / BFV)', 'MPC Protocols', 'Threshold Decryption'] },
]

const SOLVER_TYPES = [
    { name: 'CoW Solver', desc: 'Finds a Coincidence of Wants between two or more intents directly — the simplest and cheapest execution path. No liquidity required.', example: 'Alice: 1000 USDC → 0.5 ETH\nBob: 0.5 ETH → 950 USDC\n→ Atomic direct CoW, 0 slippage' },
    { name: 'Aggregation Solver', desc: 'Splits a large intent across multiple liquidity sources (AMMs, CLOBs, RFQ) to minimize market impact and price impact on-chain.', example: '50% Uniswap V3\n30% Curve Finance\n20% CoW direct match\n→ Best blended price' },
    { name: 'Cross-Chain Solver', desc: 'Routes execution across Protocol Adapters on different chains to source the best global price, settling all legs atomically in one transaction.', example: 'Intent on Ethereum\nLiquidity on Arbitrum\n→ Atomic cross-chain settlement via ARM' },
    { name: 'Private Solver (Phase 2+)', desc: 'Uses threshold FHE to compute over encrypted intents. Matches intents without learning their contents — enables true dark-pool execution at protocol level.', example: 'MPC computation over\nencrypted order book\n→ Zero knowledge of\ncounterparty identity' },
]

const PROTOCOL_ADAPTERS = [
    { chain: 'Ethereum', status: 'live', color: '#627EEA', note: 'ARM deployed to Ethereum Mainnet. Full EVM interoperability.' },
    { chain: 'Base', status: 'live', color: '#0052FF', note: 'AnomaPay Private Beta active on Base.' },
    { chain: 'Optimism', status: 'live', color: '#FF0420', note: 'PA live. OP Stack native intent gossip.' },
    { chain: 'Arbitrum', status: 'live', color: '#12AAFF', note: 'PA live. Full Nitro VM interop.' },
    { chain: 'Solana', status: 'next', color: '#9945FF', note: 'Planned Phase 2+. Native SVM adapter.' },
    { chain: 'Cosmos / IBC', status: 'future', color: '#5664D2', note: 'Multi-chain IBC routing via Chimera Chains.' },
]

const ZK_STACK = [
    { layer: 'Constraint System', tech: 'Vamp-IR / Plonkup', desc: 'Validity predicates compile down to arithmetic circuits via Vamp-IR, a universal polynomial intermediate representation language. Supports R1CS, PLONK, and Plonkup constraint systems.' },
    { layer: 'Proof System', tech: 'PLONK / Groth16 / Nova', desc: 'Intent validity proofs generated using PLONK (universal trusted setup) for most intents; Groth16 for legacy compatibility; Nova/HyperNova for recursive proof folding across multi-step intents.' },
    { layer: 'Recursive Aggregation', tech: 'HyperNova / SuperSpartan', desc: 'Multi-intent bundles aggregate validity proofs into a single succinct proof using HyperNova recursive folding. One proof settles N intents across M chains in a single on-chain verification call.' },
    { layer: 'Proof Generation', tech: 'Nockma VM → ZK Prover', desc: 'Juvix code compiles to Nockma bytecode (a formally specified lambda calculus on 64-bit integers), which is then arithmetized and handed to the ZK prover pipeline.' },
]

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function AccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b-2 border-black/10 dark:border-white/10">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-5 text-left group">
                <span className="text-base font-black uppercase tracking-tighter group-hover:text-[#FF0000] transition-colors">{title}</span>
                {open ? <ChevronUp className="w-5 h-5 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 flex-shrink-0" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="pb-6 text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 leading-relaxed">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─────────────────────────────────────────
// Page
// ─────────────────────────────────────────

export function VisionArchitecturePage() {
    const controls = useAnimation()
    const [activeCode, setActiveCode] = useState<'swap' | 'vote'>('swap')

    useEffect(() => {
        controls.start(i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.33, 1, 0.68, 1] } }))
    }, [controls])

    return (
        <div className="min-h-screen bg-[#F4F4F4] dark:bg-[#0A0A0A] text-black dark:text-white font-swiss selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
            <SEO title="Architecture Specifications | Anoma Deep Dive" description="Full technical specifications: ARM Resource Model, IFC privacy tiers, Juvix compilation, Solver Network, ZK proof stack, and Protocol Adapters." />

            {/* ─── HERO ─── */}
            <section className="relative pt-32 pb-24 overflow-hidden border-b-4 border-black dark:border-white">
                <div className="absolute inset-0 swiss-grid-bg opacity-20 pointer-events-none" />
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-widest mb-6 border border-black dark:border-white">
                            <Terminal className="w-4 h-4" /> Technical Architecture
                        </div>
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
                        className="text-6xl md:text-8xl lg:text-[100px] font-black uppercase tracking-tighter leading-[0.85] mb-8 max-w-5xl">
                        Architecture<br /><span className="text-[#FF0000]">Specifications.</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-xl font-bold uppercase tracking-tight text-gray-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                        Full technical deep-dive: the Abstract Resource Machine, Information Flow Control privacy tiers, Juvix intent programming, the Solver Network, the ZK proof stack, and Protocol Adapter deployments.
                    </motion.p>
                    {/* Table of contents */}
                    <div className="flex flex-wrap gap-3 mt-10">
                        {['ARM Resource Model', 'Solver Network', 'IFC Privacy', 'Juvix & ZK Stack', 'Protocol Adapters', 'FAQ'].map(s => (
                            <a key={s} href={`#${s.toLowerCase().replace(/ /g, '-').replace(/[&]/g, '')}`}
                                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black/20 dark:border-white/20 hover:border-[#FF0000] hover:text-[#FF0000] transition-colors">
                                {s}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SEC 1: ARM RESOURCE MODEL ─── */}
            <section id="arm-resource-model" className="py-24 border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 01</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">ARM Resource<br />Model</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    {/* Intro */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                        <div>
                            <p className="text-base font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 leading-relaxed mb-6">
                                The ARM replaces both the EVM account model and standard UTXO sets. It is inspired by the Zcash Sapling commitment/nullifier system but generalizes it to arbitrary typed resources — not just tokens.
                            </p>
                            <p className="text-base font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 leading-relaxed">
                                A resource is an atomic unit of state: typed (e.g., ETH, USDC, a DAO vote, a compute task), owned (commitment to a public key), and consumable exactly once (enforced by a nullifier set). Resources encode both their data and the logic governing their use.
                            </p>
                        </div>
                        <div className="bg-black text-green-400 font-mono text-xs p-6 border-l-4 border-[#FF0000] leading-relaxed">
                            <div className="text-gray-500 mb-3">// Resource definition (pseudocode)</div>
                            <div><span className="text-[#FF0000]">record</span> Resource α :=</div>
                            <div className="pl-4">label       : α,          <span className="text-gray-600">-- type tag</span></div>
                            <div className="pl-4">quantity    : Nat,        <span className="text-gray-600">-- amount</span></div>
                            <div className="pl-4">commitment  : Hash,       <span className="text-gray-600">-- hides owner</span></div>
                            <div className="pl-4">nullifier   : Hash,       <span className="text-gray-600">-- proves consumption</span></div>
                            <div className="pl-4">logic       : Predicate,  <span className="text-gray-600">-- validity rule</span></div>
                            <div className="pl-4">ephemeral   : Bool;       <span className="text-gray-600">-- created & consumed same tx</span></div>
                            <br />
                            <div className="text-gray-500">-- Invariant the ARM enforces:</div>
                            <div><span className="text-[#FF0000]">axiom</span> conservation :</div>
                            <div className="pl-4">Σ(created) - Σ(consumed) = 0</div>
                        </div>
                    </div>

                    {/* 4 Properties */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {ARM_PROPERTIES.map((p, i) => (
                            <motion.div key={p.title} custom={i} initial={{ opacity: 0, y: 30 }} animate={controls}
                                className="p-7 border-2 border-black/10 dark:border-white/10 hover:border-[#FF0000] transition-all group">
                                <h3 className="text-xl font-black uppercase tracking-tighter mb-3 group-hover:text-[#FF0000] transition-colors">{p.title}</h3>
                                <p className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-500 leading-relaxed mb-4">{p.desc}</p>
                                <code className="text-[11px] font-mono bg-black/5 dark:bg-white/5 text-[#FF0000] px-3 py-2 block">{p.code}</code>
                            </motion.div>
                        ))}
                    </div>

                    {/* ARM vs EVM comparison */}
                    <div className="mt-12 grid grid-cols-2 gap-0 border-4 border-black dark:border-white">
                        {[
                            { label: 'EVM Account Model', items: ['Mutable global state tree', 'Re-entrancy attacks possible', 'Single-chain execution', 'No native privacy', 'Imperative transaction ordering'], bad: true },
                            { label: 'ARM Resource Model', items: ['Immutable resource graph (consume/create)', 'Re-entrancy impossible by design', 'Multi-chain atomic settlement', 'Privacy via commitment/nullifier', 'Declarative intent evaluation'], bad: false },
                        ].map(col => (
                            <div key={col.label} className={`p-8 ${col.bad ? 'border-r-4 border-black dark:border-white' : ''}`}>
                                <div className={`text-[10px] font-black uppercase tracking-widest mb-5 ${col.bad ? 'text-gray-400' : 'text-[#FF0000]'}`}>{col.label}</div>
                                <ul className="space-y-3">
                                    {col.items.map(item => (
                                        <li key={item} className="flex items-start gap-3 text-sm font-bold uppercase tracking-wide">
                                            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${col.bad ? 'bg-gray-300 dark:bg-zinc-700' : 'bg-[#FF0000]'}`} />
                                            <span className={col.bad ? 'text-gray-400 dark:text-zinc-500 line-through decoration-gray-300 dark:decoration-zinc-600' : ''}>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SEC 2: SOLVER NETWORK ─── */}
            <section id="solver-network" className="py-24 border-b-4 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 02</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Solver<br />Network</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    <p className="text-base font-bold uppercase tracking-wide opacity-60 max-w-3xl leading-relaxed mb-16">
                        Solvers are permissionless off-chain agents that compete to compute the optimal execution path for submitted intents. They earn fees by finding better solutions. The protocol guarantees users receive the best available outcome — solvers cannot front-run or extract MEV at the protocol level.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {SOLVER_TYPES.map((s, i) => (
                            <motion.div key={s.name} custom={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} animate={controls}
                                className="p-7 border-2 border-white/10 dark:border-black/10 hover:border-[#FF0000] group transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-xl font-black uppercase tracking-tighter group-hover:text-[#FF0000] transition-colors">{s.name}</h3>
                                    <Activity className="w-5 h-5 text-[#FF0000] flex-shrink-0" />
                                </div>
                                <p className="text-sm font-bold uppercase tracking-wide opacity-60 leading-relaxed mb-5">{s.desc}</p>
                                <pre className="text-[10px] font-mono bg-white/5 dark:bg-black/5 p-3 text-green-400 leading-relaxed whitespace-pre-wrap">{s.example}</pre>
                            </motion.div>
                        ))}
                    </div>

                    {/* Gossip network diagram */}
                    <div className="border-2 border-white/10 dark:border-black/10 p-8">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-50">Intent Gossip Network — Topology</div>
                        <div className="grid grid-cols-5 gap-4 items-center text-center text-[10px] font-black uppercase tracking-widest">
                            {['User Intent', '→', 'P2P Gossip Nodes', '→', 'Solver Pool'].map((s, i) => (
                                <div key={i} className={`${s === '→' ? 'text-[#FF0000] text-2xl' : 'p-4 border-2 border-white/20 dark:border-black/20'}`}>{s}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-4 items-center text-center text-[10px] font-black uppercase tracking-widest mt-4">
                            {['', '', '↕ encrypted', '', '↕ compete off-chain'].map((s, i) => (
                                <div key={i} className="opacity-40">{s}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-4 items-center text-center text-[10px] font-black uppercase tracking-widest mt-4">
                            {['', '', 'Intent Pool (mempool)', '→', 'Matched Bundle + ZK Proof'].map((s, i) => (
                                <div key={i} className={`${s === '→' ? 'text-[#FF0000] text-2xl' : s ? 'p-4 border-2 border-white/20 dark:border-black/20' : ''}`}>{s}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-4 items-center text-center text-[10px] font-black uppercase tracking-widest mt-4">
                            {['', '', '', '→', 'Protocol Adapter (ARM) → Settlement'].map((s, i) => (
                                <div key={i} className={`${s === '→' ? 'text-[#FF0000] text-2xl' : s && s !== '→' ? 'p-4 border-2 border-[#FF0000]/30 col-span-1' : ''}`}>{s}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SEC 3: IFC PRIVACY ─── */}
            <section id="ifc-privacy" className="py-24 border-b-4 border-black dark:border-white">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 03</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Information<br />Flow Control</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                        <blockquote className="mt-8 text-2xl font-black uppercase tracking-tighter max-w-2xl text-gray-500 dark:text-zinc-400">
                            "Privacy isn't about hiding — it's about the <span className="text-black dark:text-white">appropriate flow</span> of information."
                        </blockquote>
                    </div>

                    <div className="space-y-6">
                        {IFC_TIERS.map((tier, i) => {
                            const Icon = tier.icon
                            return (
                                <motion.div key={tier.tier} custom={i} initial={{ opacity: 0, x: -30 }} animate={controls}
                                    className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-2 border-black/10 dark:border-white/10 hover:border-current transition-all group"
                                    style={{ borderColor: 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = tier.color}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                                    {/* Tier label */}
                                    <div className="p-6 flex flex-col justify-between border-b-2 lg:border-b-0 lg:border-r-2 border-black/10 dark:border-white/10">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: tier.color }}>{tier.tier}</div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter">{tier.title}</h3>
                                        </div>
                                        <Icon className="w-10 h-10 mt-4" style={{ color: tier.color }} />
                                    </div>
                                    {/* Description */}
                                    <div className="p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-black/10 dark:border-white/10">
                                        <p className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 leading-relaxed">{tier.desc}</p>
                                    </div>
                                    {/* Tech stack */}
                                    <div className="p-6">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">Technologies</div>
                                        <div className="flex flex-wrap gap-2">
                                            {tier.tech.map(t => (
                                                <span key={t} className="px-2 py-1 text-[9px] font-black uppercase tracking-widest border"
                                                    style={{ borderColor: tier.color + '40', color: tier.color, background: tier.color + '0D' }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SEC 4: JUVIX & ZK STACK ─── */}
            <section id="juvix-zk-stack" className="py-24 border-b-4 border-black dark:border-white bg-[#0A0A0A] text-white">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 04</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Juvix &amp;<br />ZK Stack</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                        <div>
                            <p className="text-base font-bold uppercase tracking-wide text-white/60 leading-relaxed mb-6">
                                Juvix is a functionally pure, dependently typed programming language designed specifically for intent-centric applications. It compiles to Nockma bytecode and arithmetic circuits (VampIR) for ZK proof generation.
                            </p>
                            <div className="space-y-4 mb-8">
                                {[
                                    { label: 'Type Safety', val: 'Dependent types catch logic errors at compile time — before they can be exploited on-chain.' },
                                    { label: 'Formal Proofs', val: 'Validity predicates are formal mathematical statements that the ZK prover must satisfy.' },
                                    { label: 'Compilation Pipeline', val: 'Juvix → Nockma bytecode → Vamp-IR circuits → PLONK / Groth16 proof.' },
                                ].map(p => (
                                    <div key={p.label} className="flex gap-4 border-b border-white/10 pb-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[#FF0000] w-28 flex-shrink-0 pt-0.5">{p.label}</div>
                                        <p className="text-sm font-bold uppercase tracking-wide text-white/60 leading-relaxed">{p.val}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Code toggle */}
                            <div className="flex gap-0 border-2 border-white/20 mb-4 w-fit">
                                {(['swap', 'vote'] as const).map(k => (
                                    <button key={k} onClick={() => setActiveCode(k)}
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeCode === k ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
                                        {k === 'swap' ? 'Shielded Swap' : 'Private Vote'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Code block */}
                        <AnimatePresence mode="wait">
                            <motion.div key={activeCode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
                                className="bg-[#111] border border-white/10 relative">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                                    <FileJson className="w-4 h-4 text-gray-500" />
                                    <span className="text-[10px] font-mono text-gray-500">{activeCode === 'swap' ? 'ShieldedSwap.juvix' : 'PrivateVote.juvix'}</span>
                                </div>
                                <pre className="font-mono text-xs text-green-400 overflow-x-auto p-6 leading-relaxed whitespace-pre">
                                    {activeCode === 'swap' ? JUVIX_SWAP : JUVIX_VOTE}
                                </pre>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ZK Stack layers */}
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-6">ZK Proof Stack — Layer by Layer</div>
                    <div className="space-y-px">
                        {ZK_STACK.map((layer, i) => (
                            <motion.div key={layer.layer} custom={i} initial={{ opacity: 0 }} animate={controls}
                                className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10 hover:border-[#FF0000]/50 transition-colors group">
                                <div className="p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-1">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-600">Layer {i + 1}</div>
                                    <div className="text-sm font-black uppercase tracking-tighter group-hover:text-[#FF0000] transition-colors">{layer.layer}</div>
                                </div>
                                <div className="p-5 border-b md:border-b-0 md:border-r border-white/10">
                                    <code className="text-xs font-mono text-green-400">{layer.tech}</code>
                                </div>
                                <div className="p-5">
                                    <p className="text-xs font-bold uppercase tracking-wide text-white/50 leading-relaxed">{layer.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SEC 5: PROTOCOL ADAPTERS ─── */}
            <section id="protocol-adapters" className="py-24 border-b-4 border-black dark:border-white bg-white dark:bg-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 05</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Protocol<br />Adapters</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                        <p className="mt-8 text-base font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                            Protocol Adapters (PAs) are smart contract deployments of the ARM on existing blockchains. They provide full interoperability between the ARM and the host VM (e.g., EVM). A single Anoma app deployed once runs on every chain that has a PA.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PROTOCOL_ADAPTERS.map((pa, i) => {
                            const statusColors = { live: 'bg-green-500', next: 'bg-blue-400', future: 'bg-zinc-500' }
                            const statusLabels = { live: 'LIVE', next: 'NEXT', future: 'PLANNED' }
                            return (
                                <motion.div key={pa.chain} custom={i} initial={{ opacity: 0, y: 20 }} animate={controls}
                                    className="p-7 border-4 border-black/10 dark:border-white/10 hover:-translate-y-1 transition-transform group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="text-3xl font-black uppercase tracking-tighter" style={{ color: pa.color }}>{pa.chain}</div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusColors[pa.status as keyof typeof statusColors]} ${pa.status === 'live' ? 'animate-pulse' : ''}`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest`} style={{ color: pa.color }}>
                                                {statusLabels[pa.status as keyof typeof statusLabels]}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-zinc-500 leading-relaxed">{pa.note}</p>
                                </motion.div>
                            )
                        })}
                    </div>

                    {/* PA explainer */}
                    <div className="mt-12 p-8 border-4 border-[#FF0000] bg-[#FF0000]/5">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-4">How Protocol Adapters Work</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { n: '01', t: 'Deployment', d: 'A PA is a set of smart contracts deployed on a host chain (e.g., Ethereum). It implements the ARM resource model using the host VM as the settlement layer.' },
                                { n: '02', t: 'Interoperability', d: 'PAs provide full bidirectional interoperability. Existing ERC-20 tokens, smart contracts, and liquidity on the host chain are natively accessible from Anoma apps.' },
                                { n: '03', t: 'Scale', d: 'Each new PA expands Anoma\'s reach. Apps automatically work on all PA chains without redeployment. Users access any chain\'s assets through a single intent.' },
                            ].map(item => (
                                <div key={item.n}>
                                    <div className="text-[#FF0000] text-3xl font-black mb-2">{item.n}</div>
                                    <h4 className="text-base font-black uppercase tracking-tighter mb-2">{item.t}</h4>
                                    <p className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 leading-relaxed">{item.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SEC 6: FAQ ─── */}
            <section id="faq" className="py-24 border-b-4 border-black dark:border-white">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                    <div className="mb-16">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF0000] mb-3">Section 06</div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Technical FAQ</h2>
                        <div className="w-32 h-2 bg-[#FF0000]" />
                    </div>

                    <div className="max-w-3xl">
                        <AccordionItem title="Is Anoma a blockchain?">
                            No. Anoma is a distributed operating system that uses existing blockchains for settlement. Protocol Adapters (smart contracts) provide the settlement layer on Ethereum, Base, Optimism, and Arbitrum. Anoma's own native consensus is a future roadmap item to provide optional low-latency settlement.
                        </AccordionItem>
                        <AccordionItem title="How does Anoma prevent MEV (Maximal Extractable Value)?">
                            Anoma's IFC architecture prevents MEV at multiple levels. Intent parameters are encrypted before entering the gossip network (Tier II). Solvers compete off-chain and cannot front-run because they see encrypted intents. Settlement is atomic — there is no ordering game between submission and execution.
                        </AccordionItem>
                        <AccordionItem title="What is a Coincidence of Wants (CoW)?">
                            A CoW occurs when two or more intents directly satisfy each other's wants. For example, Alice wants to sell 1000 USDC for 0.5 ETH, and Bob wants to sell 0.5 ETH for 950 USDC. A solver can match these directly — no liquidity pool required, no slippage, lowest possible execution cost.
                        </AccordionItem>
                        <AccordionItem title="How does Juvix relate to Nockma and Vamp-IR?">
                            Juvix is the high-level intent programming language. It compiles to Nockma bytecode (a formally specified, deterministic lambda calculus on 64-bit integers). Validity predicates within Juvix programs are separately compiled to Vamp-IR arithmetic circuits, which are then used by the ZK prover to generate PLONK or Groth16 proofs.
                        </AccordionItem>
                        <AccordionItem title="What are Chimera Chains? (Phase 2+)">
                            Chimera Chains are a planned Anoma feature enabling multi-ledger atomic composability. A single resource can simultaneously have state on multiple ledgers — for example, settlement obligation on Ethereum but data stored on Arweave. Chimera Chains allow intents to atomically span these heterogeneous environments without bridges.
                        </AccordionItem>
                        <AccordionItem title="What are Ephemeral Resources?">
                            An ephemeral resource is one that is both created and consumed within the same transaction. It acts as a temporary "intent receipt" or intermediate state that enables complex multi-hop routing (e.g., A → B → C conversions) without leaving persistent intermediary state on-chain.
                        </AccordionItem>
                        <AccordionItem title="How does the ARM handle gas fees?">
                            The ARM provides native gas fee abstraction. Apps can specify any token for fee payment. Solvers convert fees to the required gas token on execution. Users never need to hold ETH or chain-specific tokens — they pay in whatever asset their intent specifies.
                        </AccordionItem>
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="py-24 bg-[#FF0000] text-black">
                <div className="max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 mb-3">Next Steps</div>
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">Start Building</h2>
                        <p className="text-base font-bold uppercase tracking-wide text-black/70 mt-4 max-w-xl">
                            Deploy intent-centric applications on Anoma's existing Protocol Adapters on Ethereum, Base, Optimism and Arbitrum — today.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4 flex-shrink-0">
                        {[
                            { label: 'Read the Docs', href: 'https://docs.anoma.net', icon: Terminal },
                            { label: 'Builders Program', href: 'https://anoma.net/builders-program', icon: Code2 },
                            { label: 'Research Forum', href: 'https://research.anoma.net', icon: Network },
                        ].map(({ label, href, icon: Icon }) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-5 py-3 border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                                <Icon className="w-4 h-4" /> {label} <ArrowRight className="w-4 h-4 ml-auto" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}

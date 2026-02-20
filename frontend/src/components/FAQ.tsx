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
    // ── PLATFORM ──────────────────────────────────────────────────────────────
    {
        id: "platform-intro",
        q: "What is Gnoma Explorer?",
        a: "Gnoma Explorer is a world-class analytics engine for the Anoma Protocol. It visualizes the full lifecycle of an intent—from P2P gossip to solver matchmaking and final ZK-verified settlement. It indexes real-time data from the Anoma Protocol Adapters deployed on Ethereum, Base, Optimism, and Arbitrum, and provides deep analytics on solvers, shielded pools, and resource state.",
        icon: Zap,
        category: "Platform"
    },
    {
        id: "live-vs-mock",
        q: "Is the data real-time or simulated?",
        a: "The dashboard uses a high-fidelity hybrid model. Settlement data (Transactions, Solvers, Volumes, ARM State) is indexed in real-time directly from the blockchain every 5 minutes via Blockscout. The Intent Mempool and P2P Topology currently use a functional simulation to demonstrate future Anoma mainnet capabilities while the gossip network is in private devnet. Live data indicators throughout the UI show which data is real vs. simulated.",
        icon: Activity,
        category: "Platform"
    },
    {
        id: "supported-chains",
        q: "Which chains does Gnoma Explorer support?",
        a: "Gnoma Explorer currently indexes four chains via Anoma Protocol Adapters: Ethereum Mainnet, Base, Optimism, and Arbitrum. You can switch chains using the network selector in the header. Solana and Cosmos/IBC support are planned for future releases as Anoma expands its Protocol Adapter ecosystem.",
        icon: Globe,
        category: "Platform"
    },
    {
        id: "update-freq",
        q: "How often is data updated?",
        a: "The backend indexer runs on a 5-minute cron schedule. Every cycle it fetches new event logs from Blockscout across all supported chains simultaneously, calculates USD volumes using live pricing, and updates solver rankings. WebSocket connections push live data directly to the UI for the Mempool and Topology views.",
        icon: Clock,
        category: "Platform"
    },

    // ── INTENTS ───────────────────────────────────────────────────────────────
    {
        id: "what-is-intent",
        q: "What is an Intent?",
        a: "An intent is a signed, machine-readable expression of what you want—not how to get it. Instead of specifying exact transaction steps ('call Uniswap → swap X for Y → bridge to Z'), you declare your desired outcome ('I want at least 1,000 USDC for my 0.5 ETH, settled within 10 minutes, preserving my privacy'). The protocol then finds the optimal execution path on your behalf. This is the foundational shift from imperative blockchains to declarative ones.",
        icon: Zap,
        category: "Intents"
    },
    {
        id: "intent-lifecycle",
        q: "What is the lifecycle of an intent through Anoma?",
        a: "An intent travels through 5 phases: (1) Creation — the user signs an intent specifying desired outcomes and validity conditions. (2) Gossip — the intent propagates through the P2P network of solvers who evaluate it. (3) Solving — one or more solvers identify a matching combination (possibly combined with other intents) that satisfies all parties. (4) ZK-Proof Generation — the solution is translated into a resource-balanced transaction with validity proofs. (5) Settlement — the transaction is submitted to the Protocol Adapter on the target chain, where it is verified and finalized on-chain.",
        icon: Activity,
        category: "Intents"
    },
    {
        id: "cow-intents",
        q: "What is a Coincidence of Wants (CoW)?",
        a: "A Coincidence of Wants (CoW) occurs when two or more users' intents can be matched directly against each other without routing through any external liquidity source. For example, Alice wants to trade ETH for USDC and Bob wants to trade USDC for ETH at the same ratio — they can be matched directly. CoW is the most capital-efficient settlement method: zero price impact, zero liquidity fees, pure peer-to-peer exchange. Gnoma's Solver Leaderboard tracks which solvers specialize in CoW matching.",
        icon: Users,
        category: "Intents"
    },
    {
        id: "intent-vs-tx",
        q: "How are intents different from regular transactions?",
        a: "Traditional blockchain transactions are imperative instructions: 'call this contract with these exact parameters.' If the state changes before your transaction executes, it may fail or give you a worse outcome. Intents are declarative constraints: 'satisfy these conditions for me.' This shifts the burden of finding the correct execution path from the user to competitive solvers, eliminates front-running risk (solvers cannot reorder intents since the user sets the outcome bounds), and enables cross-chain settlement without the user bridging manually.",
        icon: Code,
        category: "Intents"
    },
    {
        id: "intent-mempool",
        q: "What is the Intent Mempool?",
        a: "The Intent Mempool is the off-chain P2P overlay network where signed intents are broadcast and gossiped between solvers before settlement. Unlike Ethereum's public mempool (where transaction ordering creates MEV opportunities), Anoma's intent mempool does not expose full execution details publicly. Privacy-preserving gossip protocols mean solvers see enough to identify matches but not enough to front-run or extract value from individual users. Gnoma's Mempool page visualizes this live gossip layer.",
        icon: Layers,
        category: "Intents"
    },

    // ── ARM ───────────────────────────────────────────────────────────────────
    {
        id: "what-is-arm",
        q: "What is the Abstract Resource Machine (ARM)?",
        a: "The ARM is Anoma's core execution model. Instead of accounts with balances (like Ethereum's EVM), the ARM models state as a set of discrete Resources — like UTXO-style objects that exist either in a committed (unspent) or nullified (consumed) state. A valid ARM transaction must be perfectly balanced: every resource consumed must be exactly offset by resources created. This balance check is analogous to double-entry bookkeeping, making accounting errors mathematically impossible.",
        icon: Layers,
        category: "ARM"
    },
    {
        id: "arm-vs-evm",
        q: "How does the ARM compare to the EVM account model?",
        a: "The EVM uses mutable accounts: a global state tree where balances are numbers that change in place. This creates ordering dependencies (transactions must run sequentially) and makes parallel execution hard. The ARM uses an immutable resource model: resources are created and consumed, never modified. This means ARM transactions are naturally parallelizable (no shared mutable state conflicts), easier to prove in ZK (you prove the nullifier and commitment sets are valid), and more composable across chains (resources can exist on multiple domains simultaneously — Chimera Resources).",
        icon: BarChart3,
        category: "ARM"
    },
    {
        id: "arm-scale",
        q: "What is the ARM Balance Scale on transaction pages?",
        a: "Every transaction detail page in Gnoma features a visual ARM Balance Scale. This renders the mathematical proof that the transaction is valid: the left pan shows all resources consumed (Nullifiers), the right pan shows all resources created (Commitments), and they must be perfectly equal. If the scale tips, the transaction would be rejected by the protocol. This is a real visualization of the ARM's core invariant: ΣNullifiers = ΣCommitments.",
        icon: Layers,
        category: "ARM"
    },
    {
        id: "validity-predicates",
        q: "What are Validity Predicates?",
        a: "Every resource in the ARM carries a Validity Predicate (VP) — a ZK-verifiable program that defines the conditions under which that resource can be consumed. Think of it as smart contract logic that lives on the resource itself rather than in a shared contract. A token's VP might say 'I can only be spent if the owner's signature is present.' An NFT's VP might say 'I can only be transferred if a royalty payment is included in the same transaction.' VPs are written in Juvix and compile to ZK circuit constraints.",
        icon: Lock,
        category: "ARM"
    },
    {
        id: "ephemeral-resources",
        q: "What are Ephemeral Resources?",
        a: "Ephemeral Resources exist only within the scope of a single transaction — they are created and consumed in the same step and leave no permanent state on-chain. This makes them ideal for intermediate computation values, temporary authorization tokens, or complex multi-step swaps where intermediate states should not be visible on-chain. A DEX trade might use an ephemeral resource to represent 'authorization to complete this specific swap' that disappears the moment the swap settles.",
        icon: Zap,
        category: "ARM"
    },

    // ── SOLVERS ───────────────────────────────────────────────────────────────
    {
        id: "solver-strategy",
        q: "What do Solver Badges mean?",
        a: "Strategy Intelligence badges classify solvers by their primary behavior. 'CoW Master' identifies intents that can be matched peer-to-peer without external liquidity. 'DeFi Router' uses external protocols like Uniswap, Curve, or Balancer. 'Aggregation Solver' combines multiple intents into a single optimal batch. 'Cross-Chain Solver' routes settlements across multiple domains. 'Whale' processes very high economic volume. Solvers often employ multiple strategies simultaneously.",
        icon: Users,
        category: "Solvers"
    },
    {
        id: "mastery-score",
        q: "How is Mastery Score calculated?",
        a: "Mastery Score rewards solvers who process the most economic value efficiently. It is weighted: 70% USD Volume processed, 20% transaction count, 10% success rate. This surfaces the most reliable and high-volume matchmakers in the network. A high mastery score indicates a solver has consistently found valid matches across many intents over time — the gold standard for intent infrastructure quality.",
        icon: BarChart3,
        category: "Solvers"
    },
    {
        id: "solver-competition",
        q: "How do Solvers compete for intents?",
        a: "Solvers subscribe to the intent gossip network and race to find valid solutions for incoming intents. The first solver to submit a valid, balanced ARM transaction that satisfies all intent constraints wins the right to settle it and collect any available fees. Solvers with better algorithms (finding CoW matches faster, routing more efficiently, or proving ZK validity faster) earn more. This competitive market dynamic drives efficiency and innovation without protocol-level intervention.",
        icon: Zap,
        category: "Solvers"
    },
    {
        id: "mev-solvers",
        q: "Can Solvers front-run or extract MEV?",
        a: "Solver competition in Anoma is fundamentally different from Ethereum MEV. Because intents specify outcome bounds (minimum amounts, maximum slippage, deadlines), solvers cannot worsen a user's outcome beyond what the user explicitly accepts. Any surplus a solver finds beyond the user's minimum constraint can be split or retained as solver profit, but this is a feature — it incentivizes solvers to find the best execution — not traditional MEV which harms users. Intent-based systems effectively eliminate harmful sandwich attacks.",
        icon: Shield,
        category: "Solvers"
    },

    // ── PRIVACY & ZK ──────────────────────────────────────────────────────────
    {
        id: "anonymity-set",
        q: "What is the Anonymity Set?",
        a: "Privacy in Anoma scales with the size of the Shielded Pool. The Anonymity Set is the count of unspent commitments (UTXOs) in the ARM commitment tree. When you consume a resource, an observer sees a nullifier emerge — but must guess which of the N commitments in the pool it corresponds to. If N = 1,400 (current Gnoma testnet), the probability of tracing your transaction is 1/1,400. Our Privacy Pulse widget tracks this number in real time.",
        icon: Shield,
        category: "Privacy & ZK"
    },
    {
        id: "what-is-ifc",
        q: "What is Information Flow Control (IFC)?",
        a: "IFC is Anoma's four-tier privacy architecture. Tier 1 (State Privacy): shielded pools hide balances and resource ownership using ZK proofs — nobody can see what you hold. Tier 2 (Intent Privacy): intent content (amounts, counterparty, strategy) is encrypted end-to-end using threshold encryption, only revealed to matched solvers. Tier 3 (P2P Network Privacy): the gossip layer uses mix networks and onion routing so that even network-level observers cannot correlate IP addresses with intent activity. Tier 4 (Future — Full Homomorphic Encryption): planned FHE layer will allow solvers to compute on fully encrypted intents without ever decrypting them — the ultimate privacy guarantee.",
        icon: Lock,
        category: "Privacy & ZK"
    },
    {
        id: "zk-transparency",
        q: "What is ZK-Source Transparency?",
        a: "Every transaction detail in Gnoma provides a 'Verify Source' link for its ZK logic proofs. This maps the RISC Zero Image ID (a hash of the proof circuit) directly to the open-source Rust code on the Anoma GitHub. Anyone can verify that the exact mathematical rules encoded in the circuit match the published code — making the ZK guarantees auditable by anyone, not just cryptographers.",
        icon: Lock,
        category: "Privacy & ZK"
    },
    {
        id: "zk-stack",
        q: "What ZK proof system does Anoma use?",
        a: "Anoma uses a four-layer ZK stack: (1) Constraint System — Validity Predicates compile to arithmetic circuits encoding resource logic. (2) Proof System — PLONK-family proofs (specifically a variant called Taiga) verify individual resource transitions with sub-second proof times. (3) Recursive Aggregation — individual resource proofs are aggregated into a single transaction proof using recursive SNARKs, so settlement requires only one on-chain verification regardless of transaction complexity. (4) Proof Generation — RISC Zero generates proofs for the cross-chain Settlement Layer, enabling trustless bridging.",
        icon: Code,
        category: "Privacy & ZK"
    },

    // ── PROTOCOL ──────────────────────────────────────────────────────────────
    {
        id: "is-anoma-blockchain",
        q: "Is Anoma a blockchain?",
        a: "Anoma is best described as an intent-centric protocol and operating system for heterogeneous blockchains — not a single blockchain itself. It is a unified middleware layer that sits across existing chains. It processes intents, runs the ARM, and settles via Protocol Adapters on whichever execution layer makes sense (Ethereum, Base, Solana, etc.). Think of it less like 'a new chain' and more like 'a new layer of the internet that coordinates value exchange across all chains.'",
        icon: Globe,
        category: "Protocol"
    },
    {
        id: "chimera-chains",
        q: "What are Chimera Chains?",
        a: "Chimera Chains are a novel Anoma construction where a single chain simultaneously satisfies two different consensus systems. For example, a Chimera Chain might finalize under both Ethereum's and Anoma's consensus rules, meaning assets native to either chain can be used on it with full finality guarantees from both. This eliminates the need for traditional bridges (which require trust in a multisig or validator set) — Chimera resources are natively valid on multiple domains.",
        icon: Layers,
        category: "Protocol"
    },
    {
        id: "protocol-adapters",
        q: "What are Protocol Adapters?",
        a: "Protocol Adapters (PAs) are smart contracts deployed on existing blockchains (Ethereum, Base, Optimism, Arbitrum) that bridge the gap between those chains' native execution environments and the Anoma ARM model. When a solver produces a valid ARM transaction for settlement, it is submitted to the Protocol Adapter, which: (1) verifies the ZK proof, (2) enforces resource balance, (3) executes any required EVM interactions. PAs are what make Anoma chain-agnostic without requiring existing chains to change their VMs.",
        icon: Globe,
        category: "Protocol"
    },
    {
        id: "gas-abstraction",
        q: "How is gas abstracted in Anoma?",
        a: "Anoma abstracts gas from end users in two ways. First, solvers bear the gas cost of submitting settlement transactions and recover it via the surplus they earn from optimal execution. Second, intents can specify any token as the fee token — users don't need to hold the native chain gas token (ETH, MATIC, etc.) at all. The solver handles gas denomination conversion. This makes Anoma invisible as infrastructure: users express what they want, they pay in whatever they have, and the protocol handles the rest.",
        icon: Zap,
        category: "Protocol"
    },
    {
        id: "what-is-juvix",
        q: "What is Juvix?",
        a: "Juvix is Anoma's purpose-built functional programming language for writing intent logic and Validity Predicates. It is designed for high-assurance code: its type system catches entire classes of bugs at compile time, and it compiles directly to ZK circuits (via an intermediate representation called VampIR). Writing a shielded token swap in Juvix looks like writing a type-safe specification of your constraints — not low-level circuit arithmetic. This makes intent programming accessible to developers who know functional programming but not cryptography.",
        icon: Code,
        category: "Protocol"
    },
    {
        id: "anoma-roadmap",
        q: "What is Anoma's current development stage?",
        a: "As of early 2026, Anoma is in active Protocol Adapter testnet phase. Protocol Adapters are live on Ethereum, Base, Optimism, and Arbitrum — meaning real intents are being settled on real chains (which Gnoma indexes). The full ARM devnet (Taiga ZK proofs, Juvix compiler, Solver gossip network) is in private testnet. The public mainnet launch with full privacy, cross-chain ARM, and solver competition is the next major milestone on the official roadmap at anoma.net/roadmap.",
        icon: Activity,
        category: "Protocol"
    },

    // ── TECHNICAL ─────────────────────────────────────────────────────────────
    {
        id: "arm-scale-tx",
        q: "What is the ARM Balance Scale on transaction pages?",
        a: "Every transaction detail page in Gnoma features a visual ARM Balance Scale proving the transaction is mathematically valid: left pan shows all resources consumed (Nullifiers), right pan shows all resources created (Commitments), and they must be perfectly balanced — ΣNullifiers = ΣCommitments. If the scale tilts, the transaction would be rejected by the protocol. It's a live visualization of the ARM's core conservation invariant.",
        icon: Layers,
        category: "Technical"
    },
    {
        id: "auto-asset",
        q: "How does Automatic Asset Recognition work?",
        a: "Our indexer performs on-the-fly token discovery. When it encounters a new ERC-20 contract address, it automatically queries it for symbol, name, and decimals. It then uses symbol-based price inference (tokens containing 'USD' default to $1.00, WETH maps to live ETH price, etc.) and falls back to CoinGecko lookups for broader coverage. This means Gnoma is automatically future-proof for any new test tokens deployed to Anoma Protocol Adapters.",
        icon: Code,
        category: "Technical"
    },
    {
        id: "multi-domain",
        q: "How does Multi-Domain Topology work?",
        a: "Anoma is designed as a unified operating system for all blockchains. The Topology map visualizes user intents originating across multiple domains (Base, Optimism, Ethereum, Arbitrum) being matched by a central Anoma solver layer before settling on a specific execution domain. Resources can be native to any domain; the ARM ensures cross-domain consistency without bridges. Gnoma's Topology visualization shows this live mesh.",
        icon: Globe,
        category: "Technical"
    },
]

const CATEGORIES = ['Platform', 'Intents', 'ARM', 'Solvers', 'Privacy & ZK', 'Protocol', 'Technical']


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
                        KNOWLEDGE<br />BASE
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
                        Smart<br />Contracts
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

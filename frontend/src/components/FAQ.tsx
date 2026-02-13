import { motion } from 'framer-motion'
import { Shield, Zap, Layers } from 'lucide-react'

export function FAQ() {
    const items = [
        {
            q: "What is Gnoma Explorer?",
            a: "Gnoma Explorer is a high-fidelity analytics platform designed to visualize the Anoma Protocol Adapter. It tracks intent resolution, privacy preservation flows, and solver efficiency in real-time.",
            icon: Zap
        },
        {
            q: "How is 'Settled USD Value' calculated?",
            a: "This metric tracks the real economic value of all intents successfully settled by solvers. Unlike basic volume metrics, we calculate this by applying precise pricing at the moment of ingestion: Native ETH is priced at $2,500 and USDC is strictly pegged at $1.00. This avoids inflation and provides a true 'Settled Value' figure.",
            icon: Layers
        },
        {
            q: "What is 'Total Value Shielded'?",
            a: "This represents the 'Net Flow' (Inflows - Outflows) of assets moving into the Anoma Shielded Pool. A positive number indicates net accumulation of privacy-shielded liquidity. We track this using absolute USD pricing to ensure accuracy.",
            icon: Shield
        },
        {
            q: "Is the data real-time?",
            a: "Data is synchronized with the blockchain every 5 minutes. While the dashboard reflects the latest confirmed state, there may be a slight delay (up to 5 mins) between on-chain confirmation and appearance on the Gnoma Explorer.",
            icon: Zap
        },
        {
            q: "What is the 'Intent Satisfaction Index'?",
            a: "This is a composite score reflecting the total number of intents that have been fully resolved with user constraints met. It serves as a heartbeat for the protocol's utility.",
            icon: Zap
        }
    ]

    const contracts = [
        { name: "Shielded Pool", address: "0x990c1773c28b985c2cf32c0a920192bd8717c871", type: "Core Contract" },
        { name: "USDC (Base)", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", type: "Asset" },
        { name: "Anoma Protocol Adapter", address: "0x9ED43C229480659bF6B6607C46d7B96c6D760cBB", type: "Core Contract" }
    ]

    return (
        <section className="py-16 px-6 lg:px-8 max-w-4xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-16"
            >
                <h2 className="swiss-title text-4xl mb-6">Protocol FAQ</h2>
                <div className="swiss-divider w-24" />
                <p className="text-gray-600 text-lg">
                    Technical details and metric definitions for the Gnoma Explorer.
                </p>
            </motion.div>

            <div className="grid gap-8">
                {items.map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="swiss-card"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-black text-white">
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold uppercase mb-2">{item.q}</h3>
                                <p className="text-gray-600 leading-relaxed">{item.a}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-16"
            >
                <h3 className="swiss-title text-2xl mb-8">Contract Addresses (Base)</h3>
                <div className="swiss-card p-0 overflow-hidden">
                    <table className="swiss-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Address</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map((c, i) => (
                                <tr key={i}>
                                    <td className="font-bold">{c.name}</td>
                                    <td className="font-mono text-xs">
                                        <a
                                            href={`https://basescan.org/address/${c.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-[#FF0000] hover:underline transition-colors"
                                        >
                                            {c.address}
                                        </a>
                                    </td>
                                    <td>
                                        <span className="swiss-badge">{c.type}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </section>
    )
}

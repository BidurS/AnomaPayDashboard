import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Copy, Check, Zap, ExternalLink, AlertTriangle, Code2, Layers, Shield, Hash, Clock, Globe, User, FileCode2 } from 'lucide-react'
import {
    detectAndDecode,
    formatTimestamp,
    shortenHex,
    CHAIN_REGISTRY,
    SAMPLE_ARM_CALLDATA,
    SAMPLE_ERC7683_CALLDATA,
    type DecodedResult,
    type GaslessCrossChainOrder,
    type OnchainCrossChainOrder,
    type ARMTransaction,
} from '../lib/erc7683'

export default function IntentDecoderPage() {
    const [input, setInput] = useState('')
    const [result, setResult] = useState<DecodedResult | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    const handleDecode = useCallback(() => {
        if (!input.trim()) return
        const decoded = detectAndDecode(input)
        setResult(decoded)
    }, [input])

    const loadExample = (type: 'arm' | 'erc7683') => {
        const data = type === 'arm' ? SAMPLE_ARM_CALLDATA : SAMPLE_ERC7683_CALLDATA
        setInput(data)
        setResult(detectAndDecode(data))
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <section className="py-12 md:py-16 px-4 md:px-6 bg-black dark:bg-zinc-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 swiss-grid-bg opacity-10 pointer-events-none" />
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-[#FF0000] flex items-center justify-center">
                            <Code2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">
                                Intent Decoder
                            </h1>
                            <p className="text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-zinc-400 mt-1">
                                ERC-7683 Cross-Chain Orders • ARM Protocol Transactions
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                        Paste raw calldata to decode ERC-7683 cross-chain intent orders or ARM Protocol Adapter
                        <code className="mx-1 px-1.5 py-0.5 bg-zinc-800 text-zinc-300 text-xs">execute()</code>
                        transactions. View decoded fields, chain routing, deadlines, and resource proofs.
                    </p>
                </div>
            </section>

            {/* Input Section */}
            <section className="py-8 md:py-10 px-4 md:px-6 border-b-4 border-black dark:border-white/10">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                            Calldata Input
                        </span>
                    </div>

                    <div className="relative border-2 border-black dark:border-white/10 bg-white dark:bg-zinc-900">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste raw calldata (hex), e.g. 0x09c5eabe... or 0x8bc87712..."
                            className="w-full h-40 p-4 font-mono text-xs bg-transparent resize-none focus:outline-none text-black dark:text-white placeholder-gray-400 dark:placeholder-zinc-600"
                            spellCheck={false}
                        />
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
                                {input.length > 0 ? `${Math.ceil((input.length - 2) / 2)} bytes` : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mt-4">
                        <button
                            onClick={handleDecode}
                            disabled={!input.trim()}
                            className="btn-swiss-primary px-6 py-3 text-sm font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Zap className="w-4 h-4" /> Decode
                        </button>

                        <div className="flex items-center gap-2 sm:ml-auto">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Examples:</span>
                            <button
                                onClick={() => loadExample('arm')}
                                className="px-3 py-1.5 border-2 border-black dark:border-white/10 text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                            >
                                ARM Execute
                            </button>
                            <button
                                onClick={() => loadExample('erc7683')}
                                className="px-3 py-1.5 border-2 border-black dark:border-white/10 text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                            >
                                ERC-7683 Order
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Results */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="py-10 px-6"
                    >
                        <div className="max-w-5xl mx-auto">
                            {/* Result Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-8 h-8 flex items-center justify-center text-white text-xs font-black ${result.error ? 'bg-red-500' :
                                    result.type === 'arm-execute' ? 'bg-black dark:bg-white dark:text-black' :
                                        result.type.startsWith('erc7683') ? 'bg-[#FF0000]' :
                                            'bg-gray-400'
                                    }`}>
                                    {result.error ? '!' :
                                        result.type === 'arm-execute' ? 'A' :
                                            result.type.startsWith('erc7683') ? '76' : '?'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter">
                                        {result.error ? 'Decode Error' :
                                            result.type === 'arm-execute' ? 'ARM Protocol Transaction' :
                                                result.type === 'erc7683-gasless' ? 'ERC-7683 Gasless Cross-Chain Order' :
                                                    result.type === 'erc7683-onchain' ? 'ERC-7683 On-Chain Cross-Chain Order' :
                                                        'Unknown Format'}
                                    </h3>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                        Selector: {input.substring(0, 10)} • {Math.ceil((input.length - 2) / 2)} bytes
                                    </p>
                                </div>
                            </div>

                            {/* Error */}
                            {result.error && (
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 mb-6">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm font-bold">{result.error}</span>
                                    </div>
                                </div>
                            )}

                            {/* ERC-7683 Gasless Order */}
                            {result.type === 'erc7683-gasless' && result.data && (
                                <ERC7683GaslessView
                                    order={result.data as GaslessCrossChainOrder}
                                    onCopy={copyToClipboard}
                                    copied={copied}
                                />
                            )}

                            {/* ERC-7683 Onchain Order */}
                            {result.type === 'erc7683-onchain' && result.data && (
                                <ERC7683OnchainView
                                    order={result.data as OnchainCrossChainOrder}
                                    onCopy={copyToClipboard}
                                    copied={copied}
                                />
                            )}

                            {/* ARM Transaction */}
                            {result.type === 'arm-execute' && result.data && (
                                <ARMTransactionView
                                    tx={result.data as ARMTransaction}
                                    onCopy={copyToClipboard}
                                    copied={copied}
                                />
                            )}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Reference Section */}
            <section className="py-12 px-6 bg-gray-50 dark:bg-zinc-950 border-t-2 border-black/5 dark:border-white/5">
                <div className="max-w-5xl mx-auto">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Supported Standards</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 border-2 border-black/10 dark:border-white/5 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-5 h-5 text-[#FF0000]" />
                                <h4 className="font-black uppercase text-sm">ERC-7683</h4>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed mb-3">
                                Cross-chain intent standard defining a universal order format. Enables any settler contract
                                to process cross-chain swaps with standardized deadlines and fee structures.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">GaslessCrossChainOrder</code>
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">OnchainCrossChainOrder</code>
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">ResolvedCrossChainOrder</code>
                            </div>
                        </div>
                        <div className="p-6 border-2 border-black/10 dark:border-white/5 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-2 mb-3">
                                <Layers className="w-5 h-5" />
                                <h4 className="font-black uppercase text-sm">ARM Protocol Adapter</h4>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-500 leading-relaxed mb-3">
                                Anoma Resource Machine's on-chain adapter. Decodes <code className="text-[10px]">execute(Transaction)</code> calls
                                containing Actions with compliance proofs, nullifiers, commitments, and logic references.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">Actions[]</code>
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">ComplianceProof</code>
                                <code className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[10px] font-mono">DeltaProof</code>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

// ============================================================
// Sub-components
// ============================================================

function CopyButton({ text, label, copied, onCopy }: { text: string; label: string; copied: string | null; onCopy: (t: string, l: string) => void }) {
    return (
        <button onClick={() => onCopy(text, label)} className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            {copied === label ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
        </button>
    )
}

function FieldRow({ icon: Icon, label, value, mono = false, copyable = false, copied, onCopy, children }: {
    icon?: React.ComponentType<{ className?: string }>
    label: string
    value?: string
    mono?: boolean
    copyable?: boolean
    copied?: string | null
    onCopy?: (t: string, l: string) => void
    children?: React.ReactNode
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100 dark:border-zinc-800 last:border-0">
            <div className="flex items-center gap-2 sm:w-48 shrink-0">
                {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-600" />}
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-500">{label}</span>
            </div>
            <div className="flex-1 min-w-0">
                {children || (
                    <div className="flex items-center">
                        <span className={`text-sm break-all ${mono ? 'font-mono text-xs' : ''} text-black dark:text-white`}>
                            {value}
                        </span>
                        {copyable && value && onCopy && <CopyButton text={value} label={label} copied={copied!} onCopy={onCopy} />}
                    </div>
                )}
            </div>
        </div>
    )
}

function ERC7683GaslessView({ order, onCopy, copied }: { order: GaslessCrossChainOrder; onCopy: (t: string, l: string) => void; copied: string | null }) {
    const chain = CHAIN_REGISTRY[order.originChainId]
    return (
        <div className="border-2 border-black dark:border-white/10">
            <div className="p-4 bg-[#FF0000]/5 dark:bg-[#FF0000]/10 border-b-2 border-black/10 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0000]">
                    Gasless Cross-Chain Order Fields
                </span>
            </div>
            <div className="p-4 md:p-6 bg-white dark:bg-zinc-900">
                <FieldRow icon={Globe} label="Origin Settler" value={order.originSettler} mono copyable copied={copied} onCopy={onCopy} />
                <FieldRow icon={User} label="User" value={order.user} mono copyable copied={copied} onCopy={onCopy} />
                <FieldRow icon={Hash} label="Nonce" value={order.nonce} mono />
                <FieldRow icon={Globe} label="Origin Chain">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{chain?.icon || '🔗'}</span>
                        <span className="text-sm font-bold">{chain?.name || `Chain #${order.originChainId}`}</span>
                        <span className="text-xs text-gray-400 font-mono">({order.originChainId})</span>
                        {chain?.explorer && (
                            <a href={chain.explorer} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#FF0000]">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </FieldRow>
                <FieldRow icon={Clock} label="Open Deadline" value={formatTimestamp(order.openDeadline)} />
                <FieldRow icon={Clock} label="Fill Deadline" value={formatTimestamp(order.fillDeadline)} />
                <FieldRow icon={FileCode2} label="Order Data Type" value={order.orderDataType} mono copyable copied={copied} onCopy={onCopy} />
                <FieldRow icon={Code2} label="Order Data" value={order.orderData} mono />
            </div>
        </div>
    )
}

function ERC7683OnchainView({ order, onCopy, copied }: { order: OnchainCrossChainOrder; onCopy: (t: string, l: string) => void; copied: string | null }) {
    return (
        <div className="border-2 border-black dark:border-white/10">
            <div className="p-4 bg-[#FF0000]/5 dark:bg-[#FF0000]/10 border-b-2 border-black/10 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0000]">
                    On-Chain Cross-Chain Order Fields
                </span>
            </div>
            <div className="p-4 md:p-6 bg-white dark:bg-zinc-900">
                <FieldRow icon={Clock} label="Fill Deadline" value={formatTimestamp(order.fillDeadline)} />
                <FieldRow icon={FileCode2} label="Order Data Type" value={order.orderDataType} mono copyable copied={copied} onCopy={onCopy} />
                <FieldRow icon={Code2} label="Order Data" value={order.orderData} mono />
            </div>
        </div>
    )
}

function ARMTransactionView({ tx, onCopy, copied }: { tx: ARMTransaction; onCopy: (t: string, l: string) => void; copied: string | null }) {
    return (
        <div className="space-y-4">
            {/* Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-black dark:border-white/10">
                <div className="p-4 md:p-6 bg-black dark:bg-white text-white dark:text-black sm:border-r border-b sm:border-b-0 border-white/10 dark:border-black/10">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Actions</span>
                    <div className="text-2xl font-black font-mono-swiss mt-1">{tx.actions.length}</div>
                </div>
                <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 sm:border-r border-b sm:border-b-0 border-black/10 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Delta Proof</span>
                    <div className="text-xs font-mono mt-1 text-black dark:text-white truncate">{shortenHex(tx.deltaProof, 12)}</div>
                </div>
                <div className="p-4 md:p-6 bg-white dark:bg-zinc-900">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Aggregation Proof</span>
                    <div className="text-xs font-mono mt-1 text-black dark:text-white truncate">{shortenHex(tx.aggregationProof, 12)}</div>
                </div>
            </div>

            {/* Actions */}
            {tx.actions.map((action, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="border-2 border-black dark:border-white/10"
                >
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 border-b-2 border-black/5 dark:border-white/5 flex items-center gap-2">
                        <div className="w-6 h-6 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400">
                            Action {i + 1}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400 ml-auto">
                            {action.complianceVerifierInputs.length} compliance input{action.complianceVerifierInputs.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="p-4 md:p-6 bg-white dark:bg-zinc-900">
                        {action.complianceVerifierInputs.map((comp, j) => (
                            <div key={j} className="mb-4 last:mb-0">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Compliance Instance {j + 1}
                                </div>
                                <div className="space-y-0">
                                    <FieldRow label="Nullifier" value={shortenHex(comp.instance.consumed.nullifier)} mono copyable copied={copied} onCopy={onCopy} />
                                    <FieldRow label="Logic Ref (consumed)" value={shortenHex(comp.instance.consumed.logicRef)} mono copyable copied={copied} onCopy={onCopy} />
                                    <FieldRow label="CM Tree Root" value={shortenHex(comp.instance.consumed.commitmentTreeRoot)} mono copyable copied={copied} onCopy={onCopy} />
                                    <FieldRow label="Commitment (created)" value={shortenHex(comp.instance.created.commitment)} mono copyable copied={copied} onCopy={onCopy} />
                                    <FieldRow label="Logic Ref (created)" value={shortenHex(comp.instance.created.logicRef)} mono copyable copied={copied} onCopy={onCopy} />
                                    <FieldRow label="Unit Delta X" value={shortenHex(comp.instance.unitDeltaX)} mono />
                                    <FieldRow label="Unit Delta Y" value={shortenHex(comp.instance.unitDeltaY)} mono />
                                </div>
                            </div>
                        ))}
                        {action.complianceVerifierInputs.length === 0 && (
                            <div className="text-xs text-gray-400 dark:text-zinc-600 italic">
                                Complex action — compliance data requires deeper parsing
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

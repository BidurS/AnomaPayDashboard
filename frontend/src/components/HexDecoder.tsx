import { useState, useMemo } from 'react'
import { Copy, Check, Terminal, FileJson, Type, Code, ShieldAlert, type LucideIcon } from 'lucide-react'
import { cn } from '../lib/utils'

interface HexDecoderProps {
    hexData: string
    title?: string
    className?: string
}

interface DecoderMode {
    id: 'utf8' | 'hex' | 'json' | 'raw' | 'anoma'
    label: string
    icon: LucideIcon
    hidden?: boolean
    disabled?: boolean
}

export function HexDecoder({ hexData, title, className }: HexDecoderProps) {
    const [activeMode, setActiveMode] = useState<'utf8' | 'hex' | 'json' | 'raw' | 'anoma'>('json')
    const [copied, setCopied] = useState(false)

    // Check if input is likely a raw JSON string instead of hex
    const isRawJson = useMemo(() => {
        const trimmed = hexData.trim()
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
    }, [hexData])

    // Clean the hex string
    const cleanHex = useMemo(() => {
        if (isRawJson) return ''
        return hexData.startsWith('0x') ? hexData.slice(2) : hexData
    }, [hexData, isRawJson])

    // Decode functions
    const decodeUtf8 = useMemo(() => {
        if (isRawJson) return hexData
        try {
            const hex = cleanHex.length % 2 === 0 ? cleanHex : cleanHex + '0'
            let str = ''
            for (let i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16))
            }
            try { str = decodeURIComponent(escape(str)) } catch (e) { }
            // Filter out non-printable characters for display
            return str.replace(/[^\x20-\x7E]/g, '·')
        } catch (e) {
            return 'Invalid UTF-8 sequence'
        }
    }, [cleanHex, isRawJson, hexData])

    const decodeJson = useMemo(() => {
        // If already raw JSON, just try to pretty print it
        if (isRawJson) {
            try {
                const json = JSON.parse(hexData)
                return { valid: true, value: JSON.stringify(json, null, 2) }
            } catch (e) {
                return { valid: false, value: 'Malformed JSON string' }
            }
        }

        // Otherwise try to decode from hex
        try {
            const hex = cleanHex.length % 2 === 0 ? cleanHex : cleanHex + '0'
            let str = ''
            for (let i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16))
            }
            try { str = decodeURIComponent(escape(str)) } catch (e) { }
            const json = JSON.parse(str)
            return { valid: true, value: JSON.stringify(json, null, 2) }
        } catch (e) {
            return { valid: false, value: 'No valid JSON struct found' }
        }
    }, [cleanHex, isRawJson, hexData])

    const decodeAnoma = useMemo(() => {
        if (isRawJson || cleanHex.length < 64) return { valid: false, value: 'Payload too short or not hex.' }
        try {
            // Attempt to structurally decode an Anoma intent blob (mocking sections for demonstration)
            const header = cleanHex.substring(0, 8)
            const signature = cleanHex.substring(cleanHex.length - 128)
            const body = cleanHex.substring(8, cleanHex.length - 128)

            const struct = {
                protocol_version: 'v1.0.0',
                magic_bytes: header,
                payload_body: {
                    raw_hex: body,
                    length_bytes: body.length / 2,
                    entropy: 'High'
                },
                signature_proof: {
                    curve: 'Ed25519 / BLS12-381',
                    raw: signature
                }
            }
            return { valid: true, value: JSON.stringify(struct, null, 2) }
        } catch (e) {
            return { valid: false, value: 'Failed to decode Anoma structure.' }
        }
    }, [cleanHex, isRawJson])

    const getContent = () => {
        switch (activeMode) {
            case 'json': return decodeJson.valid ? decodeJson.value : hexData
            case 'utf8': return decodeUtf8
            case 'anoma': return decodeAnoma.valid ? decodeAnoma.value : hexData
            case 'raw': return hexData
            case 'hex':
            default: return hexData
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getContent())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const MODES: DecoderMode[] = [
        { id: 'json', label: 'JSON', icon: FileJson, disabled: !decodeJson.valid && !isRawJson },
        { id: 'anoma', label: 'STRUCT', icon: ShieldAlert, disabled: !decodeAnoma.valid, hidden: isRawJson },
        { id: 'utf8', label: 'UTF-8', icon: Type },
        { id: 'hex', label: 'HEX', icon: Terminal, hidden: isRawJson },
        { id: 'raw', label: 'RAW', icon: Code },
    ]

    return (
        <div className={cn("swiss-border bg-[#0a0a0a] dark:bg-[#050505] border-black dark:border-white/10 overflow-hidden flex flex-col h-full", className)}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-white/5 border-b-2 border-black dark:border-white/10">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF0000] border border-black/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-black/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-black/20" />
                    </div>
                    <span className="ml-2 text-[10px] font-mono text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                        {title || 'Payload Decoder'}
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-black border border-black/10 dark:border-white/10 p-0.5 rounded-sm overflow-x-auto">
                    {MODES.map((m) => {
                        if (m.hidden) return null
                        const Icon = m.icon
                        const isDisabled = m.disabled
                        return (
                            <button
                                key={m.id}
                                onClick={() => {
                                    if (!isDisabled) setActiveMode(m.id)
                                }}
                                disabled={isDisabled}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all duration-200",
                                    activeMode === m.id
                                        ? "bg-[#FF0000] text-white shadow-sm"
                                        : "text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5",
                                    isDisabled && "opacity-30 cursor-not-allowed"
                                )}
                            >
                                <Icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{m.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="relative flex-1 group">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={copyToClipboard}
                        className="p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-sm hover:scale-105 transition-transform"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
                <div className="h-full overflow-auto custom-scrollbar p-4">
                    <pre className="font-mono text-xs leading-relaxed text-gray-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
                        {getContent()}
                    </pre>
                </div>
            </div>

            {/* Status Footer */}
            <div className="px-3 py-1.5 bg-black dark:bg-[#050505] border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-gray-500 dark:text-zinc-600 uppercase tracking-wider">
                <span>{isRawJson ? hexData.length : cleanHex.length / 2} {isRawJson ? 'chars' : 'bytes'}</span>
                <span>{activeMode === 'json' ? 'application/json' : activeMode === 'hex' ? 'hex/raw' : 'text/plain'}</span>
            </div>
        </div>
    )
}


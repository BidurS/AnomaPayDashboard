import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, Type, Braces, Copy, Check } from 'lucide-react'

type ViewMode = 'hex' | 'utf8' | 'json'

interface HexDecoderProps {
    hexData: string
    className?: string
}

export function HexDecoder({ hexData, className = '' }: HexDecoderProps) {
    const [mode, setMode] = useState<ViewMode>('json')
    const [copied, setCopied] = useState(false)

    const cleanHex = hexData.startsWith('0x') ? hexData.slice(2) : hexData

    const decodeUtf8 = useMemo(() => {
        try {
            const bytes = new Uint8Array(
                cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            )
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        } catch {
            return '[Unable to decode as UTF-8]'
        }
    }, [cleanHex])

    const decodeJson = useMemo(() => {
        try {
            const parsed = JSON.parse(decodeUtf8)
            return { valid: true, formatted: JSON.stringify(parsed, null, 2) }
        } catch {
            return { valid: false, formatted: '[Not valid JSON]' }
        }
    }, [decodeUtf8])

    // Auto-select best view mode on mount
    useState(() => {
        if (decodeJson.valid) setMode('json')
        else if (decodeUtf8.length > 0 && !decodeUtf8.includes('')) setMode('utf8')
        else setMode('hex')
    })

    const getContent = (): string => {
        switch (mode) {
            case 'hex':
                return cleanHex.match(/.{1,64}/g)?.join('\n') || cleanHex
            case 'utf8':
                return decodeUtf8
            case 'json':
                return decodeJson.formatted
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(getContent())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const modes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
        { id: 'json', label: 'JSON', icon: <Braces className="w-3.5 h-3.5" /> },
        { id: 'utf8', label: 'UTF-8', icon: <Type className="w-3.5 h-3.5" /> },
        { id: 'hex', label: 'HEX', icon: <Code className="w-3.5 h-3.5" /> },
    ]

    return (
        <div className={`swiss-border bg-white dark:bg-black overflow-hidden ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-black dark:border-white bg-gray-50 dark:bg-zinc-900 px-2 py-2">
                <div className="flex gap-1">
                    {modes.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded
                                transition-all duration-200
                                ${mode === m.id
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-800'
                                }
                            `}
                        >
                            {m.icon}
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider hidden sm:inline-block">
                        {cleanHex.length / 2} bytes
                    </span>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                        title="Copy content"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative group">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="max-h-80 overflow-y-auto custom-scrollbar bg-white dark:bg-black"
                    >
                        <pre className={`p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all ${mode === 'json' ? 'text-blue-600 dark:text-blue-400' :
                                mode === 'hex' ? 'text-gray-500 dark:text-gray-400' :
                                    'text-black dark:text-white'
                            }`}>
                            {getContent()}
                        </pre>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

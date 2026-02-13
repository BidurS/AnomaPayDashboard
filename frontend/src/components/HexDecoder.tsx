import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code, Type, Braces } from 'lucide-react'

type ViewMode = 'hex' | 'utf8' | 'json'

interface HexDecoderProps {
    hexData: string
    className?: string
}

export function HexDecoder({ hexData, className = '' }: HexDecoderProps) {
    const [mode, setMode] = useState<ViewMode>('hex')

    const cleanHex = hexData.startsWith('0x') ? hexData.slice(2) : hexData

    const decodeUtf8 = (): string => {
        try {
            const bytes = new Uint8Array(
                cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            )
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        } catch {
            return '[Unable to decode as UTF-8]'
        }
    }

    const decodeJson = (): { valid: boolean; formatted: string } => {
        try {
            const utf8 = decodeUtf8()
            const parsed = JSON.parse(utf8)
            return { valid: true, formatted: JSON.stringify(parsed, null, 2) }
        } catch {
            return { valid: false, formatted: '[Not valid JSON]' }
        }
    }

    const getContent = (): string => {
        switch (mode) {
            case 'hex':
                // Format hex in groups of 32 bytes per line
                return cleanHex.match(/.{1,64}/g)?.join('\n') || cleanHex
            case 'utf8':
                return decodeUtf8()
            case 'json':
                return decodeJson().formatted
        }
    }

    const modes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
        { id: 'hex', label: 'Raw Hex', icon: <Code className="w-3.5 h-3.5" /> },
        { id: 'utf8', label: 'UTF-8', icon: <Type className="w-3.5 h-3.5" /> },
        { id: 'json', label: 'JSON', icon: <Braces className="w-3.5 h-3.5" /> },
    ]

    return (
        <div className={`border-2 border-black ${className}`}>
            {/* Toggle bar */}
            <div className="flex border-b-2 border-black bg-gray-50">
                {modes.map(m => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`
                            flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider
                            transition-colors duration-150
                            ${mode === m.id
                                ? 'bg-black text-white'
                                : 'text-gray-500 hover:text-black hover:bg-gray-100'
                            }
                        `}
                    >
                        {m.icon}
                        {m.label}
                    </button>
                ))}
                <div className="ml-auto flex items-center px-3 text-[10px] text-gray-400 uppercase tracking-wider">
                    {cleanHex.length / 2} bytes
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.pre
                    key={mode}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-64 overflow-y-auto bg-white whitespace-pre-wrap break-all"
                >
                    {getContent()}
                </motion.pre>
            </AnimatePresence>
        </div>
    )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink, Zap } from 'lucide-react'
import { useChainContext } from '../context/ChainContext'
import { cn } from '../lib/utils'

interface HeaderProps {
    currentView: 'explorer' | 'faq'
    onNavigate: (view: 'explorer' | 'faq') => void
    onSearch?: (query: string) => void
}

export function Header({ currentView, onNavigate, onSearch }: HeaderProps) {
    const { chains, activeChain, setActiveChainId } = useChainContext()
    const [isOpen, setIsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const hasMultipleChains = chains.length > 1

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (onSearch) onSearch(searchValue)
    }

    return (
        <header className="sticky top-0 z-50 border-b-4 border-black bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="h-20 flex items-center justify-between gap-4">
                    {/* Logo - Swiss Style */}
                    <div className="flex items-center gap-4 cursor-pointer shrink-0" onClick={() => onNavigate('explorer')}>
                        <div className="h-12 w-12 bg-[#FF0000] flex items-center justify-center">
                            <Zap className="w-7 h-7 text-white" fill="currentColor" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-extrabold tracking-tight uppercase">Gnoma</h1>
                            <p className="text-[10px] font-semibold tracking-[0.3em] text-gray-500 uppercase">Explorer</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-4">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search by Address / Tx Hash..."
                                className="w-full h-10 px-4 pr-10 border-2 border-gray-200 focus:border-black outline-none font-mono text-sm uppercase tracking-wide transition-colors bg-gray-50 focus:bg-white"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                            <button type="submit" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-black">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </button>
                        </form>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-sm shrink-0">
                        {/* ... existing tabs ... */}
                        <button
                            onClick={() => onNavigate('explorer')}
                            className={cn(
                                "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                                currentView === 'explorer'
                                    ? "bg-white shadow-sm text-black border border-black"
                                    : "text-gray-500 hover:text-black"
                            )}
                        >
                            Explorer
                        </button>
                        <button
                            onClick={() => onNavigate('faq')}
                            className={cn(
                                "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                                currentView === 'faq'
                                    ? "bg-white shadow-sm text-black border border-black"
                                    : "text-gray-500 hover:text-black"
                            )}
                        >
                            FAQ
                        </button>
                    </nav>

                    {/* Chain Switcher */}
                    <div className="flex items-center gap-4 shrink-0">
                        {hasMultipleChains ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className={cn(
                                        "flex items-center gap-3 px-5 py-3",
                                        "bg-black text-white font-semibold uppercase text-xs tracking-wider",
                                        "border-2 border-black hover:bg-white hover:text-black transition-colors"
                                    )}
                                >
                                    <span className="text-base">{activeChain?.icon}</span>
                                    <span>{activeChain?.name}</span>
                                    <ChevronDown className={cn(
                                        "w-4 h-4 transition-transform",
                                        isOpen && "rotate-180"
                                    )} />
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-52 bg-white border-2 border-black shadow-[4px_4px_0_#000]"
                                        >
                                            {chains.map((chain) => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => {
                                                        setActiveChainId(chain.id)
                                                        setIsOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-medium",
                                                        "hover:bg-gray-100 transition-colors",
                                                        activeChain?.id === chain.id && "bg-[#FF0000] text-white hover:bg-[#CC0000]"
                                                    )}
                                                >
                                                    <span className="text-lg">{chain.icon}</span>
                                                    <span>{chain.name}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-5 py-3 bg-black text-white">
                                <span className="text-base">{activeChain?.icon}</span>
                                <span className="font-semibold uppercase text-xs tracking-wider">{activeChain?.name}</span>
                                <span className="swiss-badge">
                                    Live
                                </span>
                            </div>
                        )}

                        {activeChain?.explorer_url && (
                            <a
                                href={activeChain.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

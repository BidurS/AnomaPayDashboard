import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink, Zap } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
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
        <header className="sticky top-0 z-50 border-b-4 border-black dark:border-white bg-white dark:bg-black transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="h-20 flex items-center justify-between gap-4">
                    {/* Logo - Swiss Style */}
                    <div className="flex items-center gap-4 cursor-pointer shrink-0" onClick={() => onNavigate('explorer')}>
                        <div className="h-12 w-12 bg-[#FF0000] flex items-center justify-center">
                            <Zap className="w-7 h-7 text-white" fill="currentColor" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-extrabold tracking-tight uppercase text-black dark:text-white">Gnoma</h1>
                            <p className="text-[10px] font-semibold tracking-[0.3em] text-gray-500 dark:text-gray-400 uppercase">Explorer</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-4">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search by Address / Tx Hash..."
                                className="w-full h-10 px-4 pr-10 border-2 border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none font-mono text-sm uppercase tracking-wide transition-colors bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-black text-black dark:text-white placeholder-gray-400"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                            <button type="submit" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </button>
                        </form>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-sm shrink-0">
                        <button
                            onClick={() => onNavigate('explorer')}
                            className={cn(
                                "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                                currentView === 'explorer'
                                    ? "bg-white dark:bg-black shadow-sm text-black dark:text-white border border-black dark:border-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                            )}
                        >
                            Explorer
                        </button>
                        <button
                            onClick={() => onNavigate('faq')}
                            className={cn(
                                "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                                currentView === 'faq'
                                    ? "bg-white dark:bg-black shadow-sm text-black dark:text-white border border-black dark:border-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
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
                                        "bg-black dark:bg-white text-white dark:text-black font-semibold uppercase text-xs tracking-wider",
                                        "border-2 border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors"
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
                                            className="absolute right-0 mt-2 w-52 bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff]"
                                        >
                                            {chains.map((chain) => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => {
                                                        setActiveChainId(chain.id)
                                                        setIsOpen(false)
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-3 flex items-center gap-3 text-left text-sm font-medium text-black dark:text-white",
                                                        "hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors",
                                                        activeChain?.id === chain.id && "bg-[#FF0000] text-white hover:bg-[#CC0000] dark:bg-[#FF0000]"
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
                            <div className="flex items-center gap-3 px-5 py-3 bg-black dark:bg-white text-white dark:text-black">
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
                                className="p-3 border-2 border-black hover:bg-black hover:text-white transition-colors dark:border-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        )}

                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink, Menu, X, Users, ArrowRightLeft, HelpCircle, Home as HomeIcon } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useChainContext } from '../context/ChainContext'
import { cn } from '../lib/utils'

interface HeaderProps {
    currentView: string
    onNavigate: (view: string) => void
    onSearch?: (query: string) => void
}

const NAV_ITEMS = [
    { id: 'explorer', label: 'Dashboard', icon: HomeIcon },
    { id: 'solvers', label: 'Solvers', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

export function Header({ currentView, onNavigate, onSearch }: HeaderProps) {
    const { chains, activeChain, setActiveChainId } = useChainContext()
    const [isChainOpen, setIsChainOpen] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const hasMultipleChains = chains.length > 1

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (onSearch) onSearch(searchValue)
        onNavigate('explorer')
    }

    return (
        <header className="sticky top-0 z-50 border-b-4 border-black dark:border-white bg-white dark:bg-black transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 sm:h-20 flex items-center justify-between gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onNavigate('explorer')}>
                        <img src="/logo.svg" alt="Gnoma Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
                        <div className="hidden sm:block">
                            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase text-black dark:text-white transition-all hover:scale-105 duration-200"
                                style={{
                                    textShadow: '1px 1px 0 #ddd, 2px 2px 0 #ccc, 3px 3px 0 #bbb, 4px 4px 0 #aaa, 5px 5px 0 #999, 6px 6px 1px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.3), 0 3px 5px rgba(0,0,0,0.2), 0 5px 10px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.2), 0 20px 20px rgba(0,0,0,0.15)'
                                }}>
                                Gnoma
                            </h1>
                            <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.3em] text-gray-500 dark:text-gray-400 uppercase">Explorer</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-0.5 shrink-0">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon
                            const isActive = currentView === item.id ||
                                (item.id === 'explorer' && !['faq', 'solvers', 'transactions'].includes(currentView))
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={cn(
                                        "relative px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 group",
                                        isActive
                                            ? "text-[#FF0000]"
                                            : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-underline"
                                            className="absolute bottom-0 left-2 right-2 h-[3px] bg-[#FF0000]"
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-xs mx-2 hidden md:block">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search address / tx..."
                                className="w-full h-9 px-3 pr-9 border-2 border-gray-200 dark:border-gray-700 focus:border-[#FF0000] outline-none font-mono text-xs uppercase tracking-wide transition-colors bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-black text-black dark:text-white placeholder-gray-400 rounded-sm"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                            <button type="submit" className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-gray-400 hover:text-[#FF0000] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </button>
                        </form>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Chain Badge */}
                        {hasMultipleChains ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsChainOpen(!isChainOpen)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2",
                                        "bg-black dark:bg-white text-white dark:text-black font-semibold uppercase text-[10px] tracking-wider",
                                        "border-2 border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors"
                                    )}
                                >
                                    <span className="text-sm">{activeChain?.icon}</span>
                                    <span className="hidden sm:inline">{activeChain?.name}</span>
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", isChainOpen && "rotate-180")} />
                                </button>
                                <AnimatePresence>
                                    {isChainOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#fff] z-50"
                                        >
                                            {chains.map((chain) => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => { setActiveChainId(chain.id); setIsChainOpen(false) }}
                                                    className={cn(
                                                        "w-full px-4 py-3 flex items-center gap-3 text-left text-xs font-medium text-black dark:text-white",
                                                        "hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors",
                                                        activeChain?.id === chain.id && "bg-[#FF0000] text-white hover:bg-[#CC0000] dark:bg-[#FF0000]"
                                                    )}
                                                >
                                                    <span className="text-base">{chain.icon}</span>
                                                    <span>{chain.name}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-black dark:bg-white text-white dark:text-black">
                                <span className="text-sm">{activeChain?.icon}</span>
                                <span className="font-semibold uppercase text-[10px] tracking-wider hidden sm:inline">{activeChain?.name}</span>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            </div>
                        )}

                        {activeChain?.explorer_url && (
                            <a
                                href={activeChain.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:flex p-2.5 border-2 border-black hover:bg-black hover:text-white transition-colors dark:border-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white"
                                title={`View on ${activeChain?.name} Explorer`}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}

                        <ThemeToggle />

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="lg:hidden p-2 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                        >
                            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden border-t-2 border-black dark:border-white overflow-hidden"
                    >
                        <div className="px-4 py-3 space-y-1 bg-gray-50 dark:bg-gray-950">
                            {/* Mobile Search */}
                            <form onSubmit={handleSearch} className="relative mb-3">
                                <input
                                    type="text"
                                    placeholder="Search address / tx hash..."
                                    className="w-full h-10 px-4 pr-10 border-2 border-gray-200 dark:border-gray-700 focus:border-[#FF0000] outline-none font-mono text-sm uppercase tracking-wide bg-white dark:bg-black text-black dark:text-white placeholder-gray-400"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                <button type="submit" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-[#FF0000]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </button>
                            </form>

                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon
                                const isActive = currentView === item.id ||
                                    (item.id === 'explorer' && !['faq', 'solvers', 'transactions'].includes(currentView))
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onNavigate(item.id)
                                            setIsMobileOpen(false)
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all",
                                            isActive
                                                ? "bg-[#FF0000] text-white border-l-4 border-[#FF0000]"
                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 border-l-4 border-transparent"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}

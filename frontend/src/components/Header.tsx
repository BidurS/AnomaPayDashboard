import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Menu, X, Users, ArrowRightLeft, HelpCircle, Home as HomeIcon, Activity } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useChainContext } from '../context/ChainContext'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

interface HeaderProps {
    currentView: string
    onSearch?: (query: string) => void
    onOpenPalette?: () => void
}

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/' },
    { id: 'live', label: 'Live Feed', icon: Activity, path: '/live', isLive: true },
    { id: 'solvers', label: 'Solvers', icon: Users, path: '/solvers' },
    { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft, path: '/transactions' },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, path: '/faq' },
]

export function Header({ currentView, onSearch, onOpenPalette }: HeaderProps) {
    const { chains, activeChain, setActiveChainId } = useChainContext()
    const navigate = useNavigate()
    const [isChainOpen, setIsChainOpen] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const hasMultipleChains = chains.length > 1

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (onSearch) onSearch(searchValue)
    }

    const handleNavigate = (path: string) => {
        navigate(path)
        setIsMobileOpen(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <header className="sticky top-0 z-50 border-b-4 border-black dark:border-white/10 bg-white dark:bg-black transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 sm:h-20 flex items-center justify-between gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => handleNavigate('/')}>
                        <img src="/logo.svg" alt="Gnoma Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
                        <div className="hidden sm:block">
                            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase text-black dark:text-zinc-100 transition-all hover:scale-105 duration-200"
                                style={{
                                    textShadow: '1px 1px 0 #ddd, 2px 2px 0 #ccc, 3px 3px 0 #bbb, 4px 4px 0 #aaa, 5px 5px 0 #999, 6px 6px 1px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.3), 0 3px 5px rgba(0,0,0,0.2), 0 5px 10px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.2), 0 20px 20px rgba(0,0,0,0.15)'
                                }}>
                                Gnoma
                            </h1>
                            <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.3em] text-gray-500 dark:text-zinc-500 uppercase">Explorer</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-2 shrink-0">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon
                            const isActive = currentView === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.path)}
                                    className={cn(
                                        "relative px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 group",
                                        isActive
                                            ? "text-[#FF0000]"
                                            : "text-gray-500 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-200"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{item.label}</span>
                                    {item.isLive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />
                                    )}
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

                    {/* Search Bar / Command Palette Trigger */}
                    <div className="flex-1 max-w-xs mx-2 hidden md:block">
                        <button
                            onClick={onOpenPalette}
                            className="w-full h-9 px-3 flex items-center justify-between border-2 border-gray-200 dark:border-white/10 hover:border-[#FF0000] focus:border-[#FF0000] outline-none font-mono text-xs uppercase tracking-wide transition-colors bg-gray-50 dark:bg-black hover:bg-white dark:hover:bg-zinc-900 text-gray-400 dark:text-zinc-600 hover:text-black dark:hover:text-white rounded-sm group"
                        >
                            <span className="truncate">Search commands...</span>
                            <div className="flex items-center gap-1">
                                <span className="bg-gray-200 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-zinc-500 font-bold group-hover:text-black dark:group-hover:text-white transition-colors">⌘K</span>
                            </div>
                        </button>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <ThemeToggle />

                        {/* Chain Badge */}
                        {hasMultipleChains ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsChainOpen(!isChainOpen)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2",
                                        "bg-black dark:bg-zinc-950 text-white dark:text-zinc-200 font-semibold uppercase text-[10px] tracking-wider",
                                        "border-2 border-black dark:border-white/10 hover:bg-white hover:text-black dark:hover:bg-zinc-900 transition-colors"
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
                                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-black border-2 border-black dark:border-white/20 shadow-[4px_4px_0_#000] dark:shadow-none z-50"
                                        >
                                            {chains.map((chain) => (
                                                <button
                                                    key={chain.id}
                                                    onClick={() => { setActiveChainId(chain.id); setIsChainOpen(false) }}
                                                    className={cn(
                                                        "w-full px-4 py-3 flex items-center gap-3 text-left text-xs font-medium text-black dark:text-zinc-200",
                                                        "hover:bg-gray-100 dark:hover:bg-white/5 transition-colors",
                                                        activeChain?.id === chain.id && "bg-[#FF0000] text-white hover:bg-[#CC0000] dark:bg-[#FF0000]/20 dark:text-[#FF0000]"
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
                            <div className="flex items-center gap-2 px-3 py-2 bg-black dark:bg-zinc-950 text-white dark:text-zinc-200 border-2 border-black dark:border-white/10">
                                <span className="text-sm">{activeChain?.icon}</span>
                                <span className="font-semibold uppercase text-[10px] tracking-wider hidden sm:inline">{activeChain?.name}</span>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                            className="lg:hidden p-2 border-2 border-black dark:border-white/10 text-black dark:text-zinc-200 hover:bg-black hover:text-white dark:hover:bg-white/10 transition-colors"
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
                        className="lg:hidden border-t-2 border-black dark:border-white/10 overflow-hidden"
                    >
                        <div className="px-4 py-3 space-y-1 bg-gray-50 dark:bg-black">
                            {/* Mobile Search */}
                            <form onSubmit={handleSearch} className="relative mb-3">
                                <input
                                    type="text"
                                    placeholder="Search address / tx hash..."
                                    className="w-full h-10 px-4 pr-10 border-2 border-gray-200 dark:border-white/10 focus:border-[#FF0000] outline-none font-mono text-sm uppercase tracking-wide bg-white dark:bg-black text-black dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-700"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                <button type="submit" className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-[#FF0000]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </button>
                            </form>

                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon
                                const isActive = currentView === item.id
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavigate(item.path)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all",
                                            isActive
                                                ? "bg-[#FF0000] text-white border-l-4 border-[#FF0000]"
                                                : "text-gray-600 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/5 border-l-4 border-transparent"
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

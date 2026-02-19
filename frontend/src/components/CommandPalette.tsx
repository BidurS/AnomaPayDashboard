import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Hash, User, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CommandPaletteProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

// Mock Data for the prototype
const MOCK_RESULTS = [
    {
        category: 'Recent', items: [
            { id: '1', label: '0x71C...9A23', type: 'solver', icon: User },
            { id: '2', label: 'Tx 0x8ba...22c1', type: 'tx', icon: Hash },
        ]
    },
    {
        category: 'Navigation', items: [
            { id: '3', label: 'Solver Leaderboard', type: 'nav', path: '/', icon: ArrowRight },
            { id: '4', label: 'All Transactions', type: 'nav', path: '/', icon: ArrowRight },
        ]
    },
    {
        category: 'Solvers', items: [
            { id: '5', label: 'Wintermute Prod', type: 'solver', icon: User },
            { id: '6', label: 'Gnosis DAO', type: 'solver', icon: User },
        ]
    }
]

export function CommandPalette({ isOpen, setIsOpen }: CommandPaletteProps) {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Toggle on Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(!isOpen)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setIsOpen])

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Flatten items for keyboard navigation
    const filteredResults = MOCK_RESULTS.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
    })).filter(cat => cat.items.length > 0)

    const flatItems = filteredResults.flatMap(cat => cat.items)

    const handleSelect = (item: any) => {
        setIsOpen(false)
        if (item.type === 'nav') navigate(item.path)
        if (item.type === 'tx') navigate(`/tx/${item.label.split(' ')[1]}`)
        if (item.type === 'solver') navigate(`/solver/${item.label}`)
    }

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return
        const handleNav = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(i => (i + 1) % flatItems.length)
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(i => (i - 1 + flatItems.length) % flatItems.length)
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                if (flatItems[selectedIndex]) handleSelect(flatItems[selectedIndex])
            }
        }
        window.addEventListener('keydown', handleNav)
        return () => window.removeEventListener('keydown', handleNav)
    }, [isOpen, flatItems, selectedIndex])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-4xl z-[101] overflow-hidden border-4 border-black dark:border-white bg-white dark:bg-black shadow-[16px_16px_0_#FF0000]"
                    >
                        {/* Input */}
                        <div className="flex items-center border-b-4 border-black dark:border-white px-6 py-6 group">
                            <Search className="w-8 h-8 text-black dark:text-white mr-4 group-focus-within:text-[#FF0000] transition-colors" strokeWidth={3} />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="SEARCH COMMANDS..."
                                className="flex-1 bg-transparent text-3xl md:text-4xl font-black uppercase placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none text-black dark:text-white"
                            />
                            <div className="flex items-center gap-1">
                                <span className="bg-black text-white dark:bg-white dark:text-black px-3 py-1 text-sm font-black uppercase tracking-widest border-2 border-transparent">ESC</span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                            {filteredResults.length === 0 ? (
                                <div className="p-16 text-center text-gray-400">
                                    <p className="text-2xl font-black uppercase tracking-widest">No results found</p>
                                </div>
                            ) : (
                                filteredResults.map((category) => (
                                    <div key={category.category} className="mb-6 last:mb-0">
                                        <div className="px-4 py-3 text-sm font-black text-white bg-black dark:bg-white dark:text-black uppercase tracking-widest inline-block mb-2">
                                            {category.category}
                                        </div>
                                        <div className="space-y-2">
                                            {category.items.map((item) => {
                                                const isSelected = flatItems.indexOf(item) === selectedIndex
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleSelect(item)}
                                                        onMouseEnter={() => setSelectedIndex(flatItems.indexOf(item))}
                                                        className={`w-full flex items-center px-4 py-4 border-2 transition-all ${isSelected
                                                            ? 'bg-[#FF0000] text-white border-[#FF0000] scale-[1.01]'
                                                            : 'text-black dark:text-white border-transparent hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-zinc-900'
                                                            }`}
                                                    >
                                                        <item.icon className={`w-6 h-6 mr-4 ${isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} strokeWidth={3} />
                                                        <span className="font-mono text-lg font-bold">{item.label}</span>
                                                        {isSelected && (
                                                            <ArrowRight className="w-4 h-4 ml-auto text-white" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t-4 border-black dark:border-white px-6 py-4 bg-gray-50 dark:bg-zinc-900 flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            <div className="flex gap-6">
                                <span><strong className="text-black dark:text-white font-black text-lg mr-1">↑↓</strong> NAVIGATE</span>
                                <span><strong className="text-black dark:text-white font-black text-lg mr-1">↵</strong> SELECT</span>
                            </div>
                            <span className="text-black dark:text-white">COMMAND PALETTE</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Chain } from '../lib/api'
import { useChains } from '../lib/api'

interface ChainContextType {
    chains: Chain[]
    activeChain: Chain | null
    setActiveChainId: (id: number) => void
    loading: boolean
}

const ChainContext = createContext<ChainContextType | undefined>(undefined)

export function ChainProvider({ children }: { children: ReactNode }) {
    const { chains, loading } = useChains()
    const [activeChainId, setActiveChainId] = useState<number>(8453) // Default Base

    const activeChain = chains.find(c => c.id === activeChainId) || chains[0] || null

    return (
        <ChainContext.Provider value={{ chains, activeChain, setActiveChainId, loading }}>
            {children}
        </ChainContext.Provider>
    )
}

export function useChainContext() {
    const context = useContext(ChainContext)
    if (!context) {
        throw new Error('useChainContext must be used within ChainProvider')
    }
    return context
}

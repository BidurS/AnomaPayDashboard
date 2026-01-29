import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define supported chains
// Other chains can be added here when support is enabled
export const CHAINS = [
    { id: 8453, name: 'Base', icon: '🔵', explorer: 'https://basescan.org' },
    // { id: 1, name: 'Ethereum', icon: 'Ξ', explorer: 'https://etherscan.io' },
    // { id: 42161, name: 'Arbitrum', icon: '🔷', explorer: 'https://arbiscan.io' },
];

interface ChainContextType {
    activeChainId: number;
    setActiveChainId: (id: number) => void;
    activeChain: typeof CHAINS[0];
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const ChainProvider = ({ children }: { children: ReactNode }) => {
    const [activeChainId, setActiveChainId] = useState<number>(8453); // Default to Base

    const activeChain = CHAINS.find(c => c.id === activeChainId) || CHAINS[0];

    return (
        <ChainContext.Provider value={{ activeChainId, setActiveChainId, activeChain }}>
            {children}
        </ChainContext.Provider>
    );
};

export const useChain = () => {
    const context = useContext(ChainContext);
    if (!context) {
        throw new Error('useChain must be used within a ChainProvider');
    }
    return context;
};

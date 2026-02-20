import React, { createContext, useContext, useState } from 'react';

export type TrustAnchor = 'Global Perspective' | 'Local Node A' | 'Local Node B' | 'Taiga Shielded Set';

interface TrustContextType {
    activeTrustAnchor: TrustAnchor;
    setActiveTrustAnchor: (anchor: TrustAnchor) => void;
    isVisible: (intentId: string) => boolean;
}

const TrustContext = createContext<TrustContextType | undefined>(undefined);

export function TrustProvider({ children }: { children: React.ReactNode }) {
    const [activeTrustAnchor, setActiveTrustAnchor] = useState<TrustAnchor>('Global Perspective');

    // Logic to simulate visibility based on trust distance
    const isVisible = (intentId: string) => {
        if (activeTrustAnchor === 'Global Perspective') return true;
        
        // Deterministic mock visibility based on hash
        const charCodeSum = intentId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        
        if (activeTrustAnchor === 'Local Node A') {
            return charCodeSum % 2 === 0; // See only 50%
        }
        if (activeTrustAnchor === 'Local Node B') {
            return charCodeSum % 3 === 0; // See only 33%
        }
        if (activeTrustAnchor === 'Taiga Shielded Set') {
            return intentId.includes('settled') || charCodeSum % 5 === 0; // Only see shielded/settled
        }
        
        return true;
    };

    return (
        <TrustContext.Provider value={{ activeTrustAnchor, setActiveTrustAnchor, isVisible }}>
            {children}
        </TrustContext.Provider>
    );
}

export function useTrust() {
    const context = useContext(TrustContext);
    if (context === undefined) {
        throw new Error('useTrust must be used within a TrustProvider');
    }
    return context;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type EffectIntensity = 'off' | 'subtle' | 'full';

export interface UserPreferences {
    animationsEnabled: boolean;
    effectIntensity: EffectIntensity;
    compactMode: boolean;
    showGridBackground: boolean;
}

interface PreferencesContextType {
    preferences: UserPreferences;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
    resetPreferences: () => void;
}

const STORAGE_KEY = 'anomascan-prefs';

const DEFAULT_PREFERENCES: UserPreferences = {
    animationsEnabled: true,
    effectIntensity: 'full',
    compactMode: false,
    showGridBackground: true,
};

function getInitialPreferences(): UserPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as Partial<UserPreferences>;
            return {
                ...DEFAULT_PREFERENCES,
                ...parsed,
                // Only override animations if user hasn't explicitly set them
                ...(saved.includes('animationsEnabled') ? {} : { animationsEnabled: !prefersReducedMotion }),
            };
        }
    } catch {
        // Ignore parse errors
    }

    return {
        ...DEFAULT_PREFERENCES,
        animationsEnabled: !prefersReducedMotion,
        effectIntensity: prefersReducedMotion ? 'off' : 'full',
    };
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(getInitialPreferences);

    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }, [preferences]);

    // Apply compact mode class to root
    useEffect(() => {
        const root = document.documentElement;
        if (preferences.compactMode) {
            root.classList.add('compact-mode');
        } else {
            root.classList.remove('compact-mode');
        }
    }, [preferences.compactMode]);

    const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    const resetPreferences = () => {
        setPreferences(DEFAULT_PREFERENCES);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <PreferencesContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
}

import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { SnowParticles } from './SnowParticles';
import { FireflyParticles } from './FireflyParticles';

export function BackgroundEffects() {
    const { theme } = useTheme();
    const { preferences } = usePreferences();

    // Don't render anything if animations are disabled or intensity is off
    if (!preferences.animationsEnabled || preferences.effectIntensity === 'off') {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {theme === 'dark'
                ? <FireflyParticles intensity={preferences.effectIntensity} />
                : <SnowParticles intensity={preferences.effectIntensity} />
            }
        </div>
    );
}

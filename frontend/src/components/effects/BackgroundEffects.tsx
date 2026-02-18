import { useTheme } from '../../context/ThemeContext';
import { SnowParticles } from './SnowParticles';
import { FireflyParticles } from './FireflyParticles';

export function BackgroundEffects() {
    const { theme } = useTheme();

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {theme === 'dark' ? <FireflyParticles /> : <SnowParticles />}
        </div>
    );
}

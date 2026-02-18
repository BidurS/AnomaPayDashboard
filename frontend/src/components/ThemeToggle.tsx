import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {theme === 'dark' ?
                <Sun className="w-5 h-5 text-yellow-400" /> :
                <Moon className="w-5 h-5 text-gray-600" />
            }
        </button>
    );
}

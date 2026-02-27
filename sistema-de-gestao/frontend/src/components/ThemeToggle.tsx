// components/ThemeToggle.tsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { ThemeContext } from '@/App';

interface ThemeToggleProps {
    showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false }) => {
    const { themeMode, toggleTheme } = React.useContext(ThemeContext);

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{
                backgroundColor: 'var(--surfaceHover)',
                color: 'var(--textTitle)',
                border: '1px solid var(--border)',
            }}
            title={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            aria-label="Alternar tema"
        >
            {themeMode === 'light' ? (
                <>
                    <Moon className="w-4 h-4" />
                    {showLabel && <span className="text-sm font-medium">Escuro</span>}
                </>
            ) : (
                <>
                    <Sun className="w-4 h-4" />
                    {showLabel && <span className="text-sm font-medium">Claro</span>}
                </>
            )}
        </button>
    );
};

export default ThemeToggle;

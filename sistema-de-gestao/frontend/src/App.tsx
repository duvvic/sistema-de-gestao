// App.tsx - Versão com React Router e Theme Management
import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import AppRoutes from './routes/AppRoutes';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';

// Theme Helpers
const getThemeKey = (userId: string) => `nic_theme_${userId}`;

const loadTheme = (userId: string): 'dark' | 'light' => {
    const saved = localStorage.getItem(getThemeKey(userId));
    return (saved as 'dark' | 'light') || 'dark'; // Default: dark
};

const applyTheme = (mode: 'dark' | 'light') => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
};

const saveTheme = (userId: string, mode: 'dark' | 'light') => {
    localStorage.setItem(getThemeKey(userId), mode);
    applyTheme(mode);
};

// Theme Context para compartilhar com componentes
export const ThemeContext = React.createContext<{
    themeMode: 'dark' | 'light';
    toggleTheme: () => void;
}>({
    themeMode: 'dark',
    toggleTheme: () => { },
});

function AppContent() {
    const { currentUser } = useAuth();
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

    // Carregar tema quando usuário mudar
    useEffect(() => {
        if (currentUser?.id) {
            const theme = loadTheme(currentUser.id);
            setThemeMode(theme);
            applyTheme(theme);
        }
    }, [currentUser?.id]);

    const toggleTheme = () => {
        if (!currentUser?.id) return;

        const nextMode = themeMode === 'dark' ? 'light' : 'dark';
        setThemeMode(nextMode);
        saveTheme(currentUser.id, nextMode);
    };

    return (
        <ThemeContext.Provider value={{ themeMode, toggleTheme }}>
            <DataProvider>
                <AppRoutes />
            </DataProvider>
        </ThemeContext.Provider>
    );
}

function App() {
    // Register Service Worker for auto-updates
    useEffect(() => {
        // Only register in production
        if (import.meta.env.PROD) {
            serviceWorkerRegistration.register();
        }
    }, []);

    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

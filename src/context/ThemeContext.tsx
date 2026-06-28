import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'ganaderoOS_theme';

function getInitialTheme(): Theme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return 'light'; // default: claro
}

/**
 * Aplica el tema a <html> (clase .theme-light que activa los tokens claros),
 * actualiza el fondo y las meta tags de la barra de estado / theme-color.
 */
function applyTheme(theme: Theme) {
    const isLight = theme === 'light';
    const root = document.documentElement;
    root.classList.toggle('theme-light', isLight);
    root.style.backgroundColor = isLight ? '#f4f5f3' : '#09090b';

    const sb = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const tc = document.querySelector('meta[name="theme-color"]');
    // 'default' => glifos oscuros (legibles en claro); 'black-translucent' => glifos blancos (oscuro)
    if (sb) sb.setAttribute('content', isLight ? 'default' : 'black-translucent');
    if (tc) tc.setAttribute('content', isLight ? '#f4f5f3' : '#09090b');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
    }, [theme]);

    const setTheme = useCallback((t: Theme) => setThemeState(t), []);
    const toggleTheme = useCallback(() => setThemeState(prev => (prev === 'light' ? 'dark' : 'light')), []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
    return ctx;
}

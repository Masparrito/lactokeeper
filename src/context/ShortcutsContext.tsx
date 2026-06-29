import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Atajos del usuario: animales vistos recientemente y favoritos. Persistido en
// localStorage (no es dato del rebaño, es preferencia de navegación por dispositivo).
const RECENTS_KEY = 'ganaderoOS_recentAnimals';
const FAVS_KEY = 'ganaderoOS_favAnimals';
const MAX_RECENTS = 12;

interface ShortcutsValue {
    recents: string[];
    favorites: string[];
    recordView: (id: string) => void;
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
}

const ShortcutsContext = createContext<ShortcutsValue | undefined>(undefined);

function read(key: string): string[] {
    try {
        const s = localStorage.getItem(key);
        if (s) { const v = JSON.parse(s); if (Array.isArray(v)) return v; }
    } catch { /* ignore */ }
    return [];
}

export const ShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [recents, setRecents] = useState<string[]>(() => read(RECENTS_KEY));
    const [favorites, setFavorites] = useState<string[]>(() => read(FAVS_KEY));

    useEffect(() => { try { localStorage.setItem(RECENTS_KEY, JSON.stringify(recents)); } catch { /* ignore */ } }, [recents]);
    useEffect(() => { try { localStorage.setItem(FAVS_KEY, JSON.stringify(favorites)); } catch { /* ignore */ } }, [favorites]);

    const recordView = useCallback((id: string) => {
        if (!id) return;
        setRecents(prev => [id, ...prev.filter(x => x !== id)].slice(0, MAX_RECENTS));
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        if (!id) return;
        setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev]);
    }, []);

    const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

    return (
        <ShortcutsContext.Provider value={{ recents, favorites, recordView, toggleFavorite, isFavorite }}>
            {children}
        </ShortcutsContext.Provider>
    );
};

export function useShortcuts(): ShortcutsValue {
    const ctx = useContext(ShortcutsContext);
    if (!ctx) throw new Error('useShortcuts debe usarse dentro de <ShortcutsProvider>');
    return ctx;
}

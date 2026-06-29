import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppModule } from '../types/navigation';

// Rebaño es el núcleo: siempre activo, no se puede desactivar.
export const TOGGLEABLE_MODULES: AppModule[] = ['lactokeeper', 'kilos', 'salud', 'famacha', 'cents', 'evolucion'];

type EnabledMap = Partial<Record<AppModule, boolean>>;

interface ModulePrefsValue {
    enabled: EnabledMap;
    isEnabled: (id: AppModule) => boolean;
    toggleModule: (id: AppModule) => void;
    setModule: (id: AppModule, value: boolean) => void;
}

const ModulePrefsContext = createContext<ModulePrefsValue | undefined>(undefined);

const STORAGE_KEY = 'ganaderoOS_enabledModules';

function getInitial(): EnabledMap {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved) as EnabledMap;
    } catch { /* ignore */ }
    return {}; // vacío = todos activos por defecto
}

export const ModulePrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [enabled, setEnabled] = useState<EnabledMap>(getInitial);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)); } catch { /* ignore */ }
    }, [enabled]);

    // Rebaño siempre activo; el resto: true por defecto si no está definido.
    const isEnabled = useCallback((id: AppModule) => {
        if (id === 'rebano') return true;
        return enabled[id] !== false;
    }, [enabled]);

    const setModule = useCallback((id: AppModule, value: boolean) => {
        if (id === 'rebano') return; // no se desactiva
        setEnabled(prev => ({ ...prev, [id]: value }));
    }, []);

    const toggleModule = useCallback((id: AppModule) => {
        if (id === 'rebano') return;
        setEnabled(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
    }, []);

    return (
        <ModulePrefsContext.Provider value={{ enabled, isEnabled, toggleModule, setModule }}>
            {children}
        </ModulePrefsContext.Provider>
    );
};

export function useModulePrefs(): ModulePrefsValue {
    const ctx = useContext(ModulePrefsContext);
    if (!ctx) throw new Error('useModulePrefs debe usarse dentro de <ModulePrefsProvider>');
    return ctx;
}

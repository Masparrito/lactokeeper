import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
// --- CORRECCIÓN: Se importa el tipo 'LactoKeeperPage' (el nombre que SÍ se exporta) ---
import LactoKeeperShell, { type LactoKeeperPage } from './pages/modules/LactoKeeperShell';
import KilosShell from './pages/modules/KilosShell';
import SaludShell from './pages/modules/salud/SaludShell';
import CentsShell from './pages/modules/CentsShell';
// --- CAMBIO: Importar el nuevo Shell de Evolución ---
import EvolucionShell from './pages/modules/evolucion/EvolucionShell';
import type { PageState as RebanoPageState, AppModule } from './types/navigation';
import { LoadingOverlay } from './components/ui/LoadingOverlay';

// --- NUEVO: Se define un tipo para el estado inicial de Rebaño ---
type InitialRebanoState = {
    page: RebanoPageState | null;
    sourceModule?: AppModule; // Módulo de origen (ej: 'lactokeeper')
}

export default function App() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isDataLoading } = useData();
    
    const [activeModule, setActiveModule] = useState<AppModule>('rebano');
    // --- CORRECCIÓN: Se cambia 'initialRebanoPage' por 'initialRebanoState' ---
    const [initialRebanoState, setInitialRebanoState] = useState<InitialRebanoState>({ page: null, sourceModule: undefined });

    const [moduleStates, setModuleStates] = useState({
        // El estado inicial debe ser un objeto del tipo 'LactoKeeperPage'
        lactokeeper: { name: 'dashboard' } as LactoKeeperPage,
    });
    
    useEffect(() => {
        if (activeModule !== 'rebano') {
            setInitialRebanoState({ page: null, sourceModule: undefined });
        }
    }, [activeModule]);

    const handleSwitchModule = useCallback((module: AppModule) => {
        setActiveModule(module);
    }, []);

    // --- CORRECCIÓN: 'handleNavigateToRebanoPage' ahora acepta 'sourceModule' ---
    const handleNavigateToRebanoPage = useCallback((page: RebanoPageState, sourceModule?: AppModule) => {
        setInitialRebanoState({ page: page, sourceModule: sourceModule });
        setActiveModule('rebano');
    }, []);

    const handleLactoKeeperStateChange = useCallback((page: LactoKeeperPage) => {
        setModuleStates(prev => ({ ...prev, lactokeeper: page }));
    }, []);

    if (isAuthLoading || (currentUser && isDataLoading)) {
        return <LoadingOverlay />;
    }

    if (!currentUser) {
        return <LoginPage />;
    }

    switch (activeModule) {
        case 'lactokeeper':
            return (
                <LactoKeeperShell    
                    initialPage={moduleStates.lactokeeper}
                    onPageStateChange={handleLactoKeeperStateChange}
                    navigateToRebano={handleNavigateToRebanoPage}
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        case 'kilos':
            return (
                <KilosShell    
                    navigateToRebano={handleNavigateToRebanoPage}
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        case 'salud':
            return (
                <SaludShell
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        case 'cents':
return (
                <CentsShell
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        // --- CAMBIO: Nuevo case para el módulo de Evolución ---
        case 'evolucion':
            return (
                <EvolucionShell
                    onSwitchModule={handleSwitchModule}
                />
            );

        case 'rebano':
        default:
            return (
                <RebanoShell    
                    // --- CORRECCIÓN: Se cambia 'initialPage' por 'initialState' ---
                    initialState={initialRebanoState}
                    onSwitchModule={handleSwitchModule}
                />
            );
    }
}
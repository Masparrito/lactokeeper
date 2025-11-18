// src/App.tsx
// (ACTUALIZADO: El estado de Kilos ahora es un objeto que recuerda la fecha de análisis)

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell, { type LactoKeeperPage } from './pages/modules/LactoKeeperShell';
// (ACTUALIZADO) Importar 'KilosPage'
import KilosShell, { type KilosPage } from './pages/modules/KilosShell';
import SaludShell from './pages/modules/salud/SaludShell';
import CentsShell from './pages/modules/CentsShell';
import EvolucionShell from './pages/modules/evolucion/EvolucionShell';
import type { PageState as RebanoPageState, AppModule } from './types/navigation';
import { LoadingOverlay } from './components/ui/LoadingOverlay';

type InitialRebanoState = {
    page: RebanoPageState | null;
    sourceModule?: AppModule; 
}

// (NUEVO) Tipo para el estado del módulo de Kilos
type KilosState = {
    activePage: KilosPage;
    analysisDate: string | null; // <-- Almacena la fecha
}

export default function App() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isDataLoading } = useData();
    
    const [activeModule, setActiveModule] = useState<AppModule>('rebano');
    const [initialRebanoState, setInitialRebanoState] = useState<InitialRebanoState>({ page: null, sourceModule: undefined });

    const [moduleStates, setModuleStates] = useState({
        lactokeeper: { name: 'dashboard' } as LactoKeeperPage,
        // (ACTUALIZADO) Kilos ahora es un objeto
        kilos: { 
            activePage: 'dashboard', 
            analysisDate: null 
        } as KilosState,
    });
    
    useEffect(() => {
        if (activeModule !== 'rebano') {
            setInitialRebanoState({ page: null, sourceModule: undefined });
        }
    }, [activeModule]);

    const handleSwitchModule = useCallback((module: AppModule) => {
        setActiveModule(module);
    }, []);

    const handleNavigateToRebanoPage = useCallback((page: RebanoPageState, sourceModule?: AppModule) => {
        setInitialRebanoState({ page: page, sourceModule: sourceModule });
        setActiveModule('rebano');
    }, []);

    const handleLactoKeeperStateChange = useCallback((page: LactoKeeperPage) => {
        setModuleStates(prev => ({ ...prev, lactokeeper: page }));
    }, []);

    // (ACTUALIZADO) Handler para la PÁGINA de Kilos
    const handleKilosPageChange = useCallback((page: KilosPage) => {
        setModuleStates(prev => ({ 
            ...prev, 
            kilos: { ...prev.kilos, activePage: page } 
        }));
    }, []);

    // (NUEVO) Handler para la FECHA de Análisis de Kilos
    const handleKilosDateChange = useCallback((date: string) => {
        setModuleStates(prev => ({
            ...prev,
            kilos: { ...prev.kilos, analysisDate: date }
        }));
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
                    navigateToRebano={(page) => handleNavigateToRebanoPage(page, 'lactokeeper')}
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        case 'kilos':
            return (
                <KilosShell    
                    // (ACTUALIZADO) Pasa el estado completo y los dos handlers
                    initialKilosState={moduleStates.kilos}
                    onPageChange={handleKilosPageChange}
                    onAnalysisDateChange={handleKilosDateChange}
                    navigateToRebano={(page) => handleNavigateToRebanoPage(page, 'kilos')}
                    onSwitchModule={handleSwitchModule}
                />
            );
        
        case 'salud':
            return ( <SaludShell onSwitchModule={handleSwitchModule} /> );
        
        case 'cents':
            return ( <CentsShell onSwitchModule={handleSwitchModule} /> );
        
        case 'evolucion':
            return ( <EvolucionShell onSwitchModule={handleSwitchModule} /> );

        case 'rebano':
        default:
            return (
                <RebanoShell    
                    initialState={initialRebanoState}
                    onSwitchModule={handleSwitchModule}
                />
            );
    }
}
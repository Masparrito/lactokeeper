// src/App.tsx

import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell from './pages/modules/LactoKeeperShell';
import KilosShell from './pages/modules/KilosShell';
import SaludShell from './pages/modules/salud/SaludShell'; 
import type { PageState as RebanoPageState } from './types/navigation';
import { LoadingOverlay } from './components/ui/LoadingOverlay';

type ActiveModule = 'rebano' | 'lactokeeper' | 'kilos' | 'salud';

export default function App() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isDataLoading } = useData();
    
    const [activeModule, setActiveModule] = useState<ActiveModule>('rebano');
    const [initialRebanoPage, setInitialRebanoPage] = useState<RebanoPageState | null>(null);

    const handleSwitchModule = (module: ActiveModule) => {
        // --- Línea de diagnóstico que añadimos ---
        console.log(`[Debug] App.tsx: Recibida la orden de cambiar a: ${module}. Actualizando estado.`);

        setInitialRebanoPage(null);
        setActiveModule(module);
    };

    const handleExitToRebano = () => {
        setActiveModule('rebano');
    };

    const handleNavigateToRebanoPage = (page: RebanoPageState) => {
        setInitialRebanoPage(page);
        setActiveModule('rebano');
    };

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
                    onExitModule={handleExitToRebano}
                    navigateToRebano={handleNavigateToRebanoPage}
                />
            );
        
        case 'kilos':
            return (
                <KilosShell 
                    onExitModule={handleExitToRebano}
                    navigateToRebano={handleNavigateToRebanoPage}
                />
            );
        
        case 'salud':
            return (
                <SaludShell
                    onExitModule={handleExitToRebano}
                    navigateToRebano={handleNavigateToRebanoPage}
                />
            );

        case 'rebano':
        default:
            return (
                <RebanoShell 
                    initialPage={initialRebanoPage}
                    onSwitchModule={handleSwitchModule}
                />
            );
    }
}
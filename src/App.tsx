// --- CAMBIO CLAVE: Se añade "export default" para que main.tsx pueda encontrar el componente ---
import { useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell, { LactoKeeperPage } from './pages/modules/LactoKeeperShell';
import KilosShell from './pages/modules/KilosShell';
import SaludShell from './pages/modules/salud/SaludShell';
import CentsShell from './pages/modules/CentsShell';
import type { PageState as RebanoPageState, AppModule } from './types/navigation';
import { LoadingOverlay } from './components/ui/LoadingOverlay';


export default function App() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isDataLoading } = useData();
    
    const [activeModule, setActiveModule] = useState<AppModule>('rebano');
    const [initialRebanoPage, setInitialRebanoPage] = useState<RebanoPageState | null>(null);

    const [moduleStates, setModuleStates] = useState({
        lactokeeper: 'dashboard' as LactoKeeperPage,
    });

    const handleSwitchModule = useCallback((module: AppModule) => {
        setInitialRebanoPage(null);
        setActiveModule(module);
    }, []);

    const handleNavigateToRebanoPage = useCallback((page: RebanoPageState) => {
        setInitialRebanoPage(page);
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

import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell from './pages/modules/LactoKeeperShell';
import KilosShell from './pages/modules/KilosShell'; // <-- 1. Importamos el shell real
import { PageState as RebanoPageState } from './pages/RebanoShell';

type ActiveModule = 'rebano' | 'lactokeeper' | 'kilos';

export default function App() {
    const { currentUser } = useAuth();
    const [activeModule, setActiveModule] = useState<ActiveModule>('rebano');
    const [initialRebanoPage, setInitialRebanoPage] = useState<RebanoPageState | null>(null);

    const handleSwitchModule = (module: ActiveModule) => {
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
            // --- 2. Reemplazamos el componente temporal por el real ---
            return (
                <KilosShell 
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
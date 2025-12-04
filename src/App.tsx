import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell, { type LactoKeeperPage } from './pages/modules/LactoKeeperShell';
import KilosShell, { type KilosPage } from './pages/modules/KilosShell';
import SaludShell from './pages/modules/salud/SaludShell';
import CentsShell from './pages/modules/CentsShell';
import EvolucionShell from './pages/modules/evolucion/EvolucionShell';
import type { PageState as RebanoPageState, AppModule } from './types/navigation';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { checkDailyNotifications, requestNotificationPermission } from './utils/notificationService';

type InitialRebanoState = {
    page: RebanoPageState | null;
    sourceModule?: AppModule; 
}

// Estado específico para Kilos que incluye la fecha de análisis
type KilosState = {
    activePage: KilosPage;
    analysisDate: string | null; 
}

export default function App() {
    const { currentUser, isLoading: isAuthLoading } = useAuth();
    // Extraemos breedingSeasons para chequear alertas
    const { isLoading: isDataLoading, breedingSeasons } = useData();
    
    const [activeModule, setActiveModule] = useState<AppModule>('rebano');
    const [initialRebanoState, setInitialRebanoState] = useState<InitialRebanoState>({ page: null, sourceModule: undefined });

    const [moduleStates, setModuleStates] = useState({
        lactokeeper: { name: 'dashboard' } as LactoKeeperPage,
        // Estado inicial de Kilos
        kilos: { 
            activePage: 'dashboard', 
            analysisDate: null 
        } as KilosState,
    });
    
    // --- EFECTO: Chequeo de Notificaciones Diarias ---
    useEffect(() => {
        if (currentUser && !isDataLoading && breedingSeasons.length > 0) {
            // 1. Solicitar permiso al navegador/sistema (si no se ha hecho)
            requestNotificationPermission();
            
            // 2. Verificar si hay alertas de luz para hoy
            checkDailyNotifications(breedingSeasons);
        }
    }, [currentUser, isDataLoading, breedingSeasons]);

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

    // Handler para cambiar la PÁGINA de Kilos (Dashboard/Análisis/Añadir)
    const handleKilosPageChange = useCallback((page: KilosPage) => {
        setModuleStates(prev => ({ 
            ...prev, 
            kilos: { ...prev.kilos, activePage: page } 
        }));
    }, []);

    // Handler para persistir la FECHA seleccionada en Análisis
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
                    // Pasamos el estado completo y los handlers
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
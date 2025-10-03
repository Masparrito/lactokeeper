import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import RebanoShell from './pages/RebanoShell';
import LactoKeeperShell from './pages/modules/LactoKeeperShell';
import { PageState as RebanoPageState } from './pages/RebanoShell'; // Importaremos este tipo desde el nuevo archivo

// El tipo de módulo activo que puede tener la app
type ActiveModule = 'rebano' | 'lactokeeper' | 'kilos';

export default function App() {
    const { currentUser } = useAuth();
    
    // Estado para saber qué módulo principal está activo
    const [activeModule, setActiveModule] = useState<ActiveModule>('rebano');
    
    // Estado para manejar la navegación desde un módulo hacia una página específica de Rebaño
    const [initialRebanoPage, setInitialRebanoPage] = useState<RebanoPageState | null>(null);

    // --- Funciones para manejar la navegación entre módulos ---

    const handleSwitchModule = (module: ActiveModule) => {
        setInitialRebanoPage(null); // Limpiamos cualquier navegación pendiente
        setActiveModule(module);
    };

    const handleExitToRebano = () => {
        setActiveModule('rebano');
    };

    // Esta función permite que un módulo (ej. LactoKeeper) nos pida navegar a una página
    // específica del núcleo Rebaño (ej. el perfil de un animal).
    const handleNavigateToRebanoPage = (page: RebanoPageState) => {
        setInitialRebanoPage(page);
        setActiveModule('rebano');
    };

    // Si no hay usuario, mostramos la página de login
    if (!currentUser) {
        return <LoginPage />;
    }

    // --- Enrutador Principal de Módulos ---
    // Según el módulo activo, renderizamos el "Shell" o contenedor correspondiente.
    switch (activeModule) {
        case 'lactokeeper':
            return (
                <LactoKeeperShell 
                    onExitModule={handleExitToRebano}
                    navigateToRebano={handleNavigateToRebanoPage}
                />
            );
        
        // El caso 'kilos' se añadirá en el futuro
        // case 'kilos':
        //     return <KilosShell />;

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
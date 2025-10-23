import { useState, useEffect } from 'react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
import { ArrowLeft, BarChart3, CalendarClock, List, PlusCircle, Wind } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
import { GiMilkCarton } from 'react-icons/gi';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';

// Se importan las páginas específicas del módulo
import LactoKeeperDashboardPage from './lactokeeper/LactoKeeperDashboardPage';
import LactoKeeperAnalysisPage from './lactokeeper/LactoKeeperAnalysisPage';
import LactoKeeperHistoryPage from './lactokeeper/LactoKeeperHistoryPage';
import LactoKeeperAddDataPage from './lactokeeper/LactoKeeperAddDataPage';
import LactoKeeperDryOffPage from './lactokeeper/LactoKeeperDryOffPage';
import LactationProfilePage from '../LactationProfilePage';

// Se usa y exporta el tipo correcto
export type LactoKeeperPage =
    | { name: 'dashboard' }
    | { name: 'analysis' }
    | { name: 'history' }
    | { name: 'add-data' }
    | { name: 'drying' }
    | { name: 'lactation-profile', animalId: string };

interface LactoKeeperShellProps {
    initialPage: LactoKeeperPage;
    onPageStateChange: (page: LactoKeeperPage) => void;
    navigateToRebano: (page: RebanoPageState, sourceModule?: AppModule) => void;
    onSwitchModule: (module: AppModule) => void;
}

export default function LactoKeeperShell({ initialPage, onPageStateChange, navigateToRebano, onSwitchModule }: LactoKeeperShellProps) {
    const { syncStatus } = useData();
    // --- LÓGICA DE NAVEGACIÓN CORREGIDA ---
    const [page, setPage] = useState<LactoKeeperPage>(initialPage || { name: 'dashboard' });
    const [history, setHistory] = useState<LactoKeeperPage[]>([]);

    // Este useEffect notifica a App.tsx del estado actual, para recordarlo si sales del módulo
    useEffect(() => {
        onPageStateChange(page);
    }, [page, onPageStateChange]);

    // Este useEffect SOLO se ejecuta si el 'initialPage' cambia desde App.tsx (ej. al volver al módulo)
    useEffect(() => {
        setPage(initialPage && typeof initialPage === 'object' && 'name' in initialPage ? initialPage : { name: 'dashboard' });
        // NO reseteamos el historial aquí para permitir la navegación interna
    }, [initialPage]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'analysis', label: 'Análisis', icon: List },
        { id: 'history', label: 'Historial', icon: CalendarClock },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
        { id: 'drying', label: 'Secado', icon: Wind },
    ];

    // Navegación HACIA ADELANTE
    const navigateTo = (newPage: LactoKeeperPage) => {
        setHistory(currentHistory => [...currentHistory, page]);
        setPage(newPage);
    };

    // Navegación HACIA ATRÁS
    const navigateBack = () => {
        const lastPage = history.pop();
        if (lastPage) {
            // Si hay historial, vamos a la página anterior
            setPage(lastPage);
            setHistory([...history]); // Actualiza el estado del array mutado
        } else if (page.name !== 'dashboard') {
            // Si no hay historial y NO estamos en el dashboard, vamos al dashboard
            setPage({ name: 'dashboard' });
        } else {
            // Si no hay historial y SÍ estamos en el dashboard, salimos del módulo
            onSwitchModule('rebano');
        }
    };

    // Clic en la BARRA DE NAVEGACIÓN INFERIOR
    const handleNavClick = (pageName: LactoKeeperPage['name']) => {
        // Ir a una pestaña principal siempre resetea el historial de esa pestaña
        setHistory([]);
        setPage({ name: pageName } as LactoKeeperPage);
    };

    // Handler para NAVEGAR HACIA OTRO MÓDULO
    const handleNavigateToRebano = (pageState: RebanoPageState) => {
        // Al navegar a Rebaño, le decimos que venimos de 'lactokeeper'
        navigateToRebano(pageState, 'lactokeeper');
    };

    const renderContent = () => {
        switch (page.name) {
            case 'dashboard':
                return <LactoKeeperDashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'analysis' })} />;
            case 'analysis':
                return <LactoKeeperAnalysisPage onSelectAnimal={(animalId) => navigateTo({ name: 'lactation-profile', animalId })} />;
            case 'history':
                return <LactoKeeperHistoryPage navigateToRebano={handleNavigateToRebano} />;
            case 'add-data':
                return <LactoKeeperAddDataPage onNavigate={(pageName, state) => handleNavigateToRebano({ name: pageName, ...state })} onSaveSuccess={() => navigateTo({ name: 'analysis' })} />;
            case 'drying':
                return <LactoKeeperDryOffPage navigateToRebano={handleNavigateToRebano} />;
            case 'lactation-profile':
                return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={handleNavigateToRebano} />;
            default:
                return <LactoKeeperDashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'analysis' })} />;
        }
    };

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col bg-brand-dark">
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-brand-dark/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                    <button onClick={navigateBack} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Atrás">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <GiMilkCarton className="text-brand-orange" size={28} />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">LactoKeeper</p>
                        </div>
                    </div>
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>

            <main className="flex-grow pt-16 pb-24">
                {renderContent()}
            </main>

            <ModuleSwitcher onSwitchModule={onSwitchModule} />

            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around z-20 h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id as LactoKeeperPage['name'])}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${
                            page.name === item.id ? 'text-brand-orange' : 'text-gray-400 hover:text-brand-orange'
                        }`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}


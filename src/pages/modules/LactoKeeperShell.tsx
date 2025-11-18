// src/pages/modules/LactoKeeperShell.tsx (CORREGIDO)

import { useState, useEffect } from 'react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
// --- (NUEVO) Importar 'Grid' ---
import { ArrowLeft, BarChart3, CalendarClock, List, PlusCircle, Wind, Grid } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
import { GiMilkCarton } from 'react-icons/gi';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';

// Se importan las páginas específicas del módulo
import LactoKeeperDashboardPage from './lactokeeper/LactoKeeperDashboardPage';
import LactoKeeperAnalysisPage from './lactokeeper/LactoKeeperAnalysisPage';
import LactoKeeperHistoryPage from './lactokeeper/LactoKeeperHistoryPage';
// (CORREGIDO) Eliminada la importación de 'LactoKeeperAddDataPageProps'
import LactoKeeperAddDataPage from './lactokeeper/LactoKeeperAddDataPage';
import LactoKeeperDryOffPage from './lactokeeper/LactoKeeperDryOffPage';
import LactationProfilePage from '../LactationProfilePage';

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
    const [page, setPage] = useState<LactoKeeperPage>(initialPage || { name: 'dashboard' });
    const [history, setHistory] = useState<LactoKeeperPage[]>([]);
    
    // --- (NUEVO) Estado para el modal de Módulos ---
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);

    useEffect(() => {
        onPageStateChange(page);
    }, [page, onPageStateChange]);

    useEffect(() => {
        setPage(initialPage && typeof initialPage === 'object' && 'name' in initialPage ? initialPage : { name: 'dashboard' });
    }, [initialPage]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'analysis', label: 'Análisis', icon: List },
        { id: 'history', label: 'Historial', icon: CalendarClock },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
        { id: 'drying', label: 'Secado', icon: Wind },
    ];

    const navigateTo = (newPage: LactoKeeperPage) => {
        setHistory(currentHistory => [...currentHistory, page]);
        setPage(newPage);
    };

    const navigateBack = () => {
        const lastPage = history.pop();
        if (lastPage) {
            setPage(lastPage);
            setHistory([...history]);
        } else if (page.name !== 'dashboard') {
            setPage({ name: 'dashboard' });
        } else {
            onSwitchModule('rebano');
        }
    };

    const handleNavClick = (pageName: LactoKeeperPage['name']) => {
        setHistory([]);
        setPage({ name: pageName } as LactoKeeperPage);
    };

    const handleNavigateToRebano = (pageState: RebanoPageState) => {
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
                return <LactoKeeperAddDataPage onSaveSuccess={() => navigateTo({ name: 'analysis' })} />;
            case 'drying':
                return <LactoKeeperDryOffPage navigateToRebano={handleNavigateToRebano} />;
            case 'lactation-profile':
                return <LactationProfilePage animalId={page.animalId} onBack={navigateBack} navigateTo={handleNavigateToRebano} />;
            default:
                return <LactoKeeperDashboardPage onNavigateToAnalysis={() => navigateTo({ name: 'analysis' })} />;
        }
    };

    return (
        // --- (INICIO) CORRECCIÓN DE SCROLL ---
        // 1. Contenedor raíz con 'h-screen' y 'overflow-hidden'
        <div className="h-screen overflow-hidden animate-fade-in text-white flex flex-col bg-brand-dark">
            
            {/* 2. Header fijo con 'h-16' */}
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-brand-dark/80 backdrop-blur-lg border-b border-brand-border h-16">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-full">
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
                    {/* --- (NUEVO) Contenedor para iconos de header --- */}
                    <div className="flex items-center gap-4">
                        <SyncStatusIcon status={syncStatus} />
                        {/* --- (NUEVO) Botón de Módulos --- */}
                        <button 
                            onClick={() => setIsModuleSwitcherOpen(true)}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                            title="Módulos"
                        >
                            <Grid size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 3. <main> es el ÚNICO scroll, con 'flex-1', 'overflow-y-auto' y padding */}
            <main className="flex-1 overflow-y-auto pt-16 pb-16">
                {renderContent()}
            </main>
            {/* --- (FIN) CORRECCIÓN DE SCROLL --- */}

            {/* --- (NUEVO) ModuleSwitcher actualizado a modal --- */}
            <ModuleSwitcher 
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule} 
            />

            {/* 4. Nav fijo con 'h-16' */}
            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around z-20 h-16">
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
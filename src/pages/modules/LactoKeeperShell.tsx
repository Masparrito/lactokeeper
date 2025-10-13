import { useState, useEffect } from 'react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation'; // <-- CAMBIO CLAVE
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

export type LactoKeeperPage = 'dashboard' | 'analysis' | 'history' | 'add-data' | 'drying';

interface LactoKeeperShellProps {
    initialPage: LactoKeeperPage;
    onPageStateChange: (page: LactoKeeperPage) => void;
    navigateToRebano: (page: RebanoPageState) => void;
    onSwitchModule: (module: AppModule) => void;
}

export default function LactoKeeperShell({ initialPage, onPageStateChange, navigateToRebano, onSwitchModule }: LactoKeeperShellProps) {
    const { syncStatus } = useData();
    const [page, setPage] = useState<LactoKeeperPage>(initialPage || 'dashboard');

    useEffect(() => {
        onPageStateChange(page);
    }, [page, onPageStateChange]);
    
    useEffect(() => {
        setPage(initialPage || 'dashboard');
    }, [initialPage]);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'analysis', label: 'Análisis', icon: List },
        { id: 'history', label: 'Historial', icon: CalendarClock },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
        { id: 'drying', label: 'Secado', icon: Wind },
    ];

    const handleBackPress = () => {
        if (page !== 'dashboard') {
            setPage('dashboard');
        } else {
            onSwitchModule('rebano');
        }
    };

    const handleSelectAnimal = (animalId: string) => {
        onPageStateChange(page); 
        navigateToRebano({ name: 'lactation-profile', animalId });
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard':
                return <LactoKeeperDashboardPage onNavigateToAnalysis={() => setPage('analysis')} />;
            case 'analysis':
                return <LactoKeeperAnalysisPage onSelectAnimal={handleSelectAnimal} />;
            case 'history':
                return <LactoKeeperHistoryPage navigateToRebano={navigateToRebano} />;
            case 'add-data':
                return <LactoKeeperAddDataPage onNavigate={(pageName, state) => navigateToRebano({ name: pageName, ...state })} onSaveSuccess={() => setPage('analysis')} />;
            case 'drying':
                return <LactoKeeperDryOffPage navigateToRebano={navigateToRebano} />;
            default:
                return <LactoKeeperDashboardPage onNavigateToAnalysis={() => setPage('analysis')} />;
        }
    };

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col">
            
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                    <button onClick={handleBackPress} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Atrás">
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

            <nav className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setPage(item.id as LactoKeeperPage)}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${
                            page === item.id ? 'text-brand-orange' : 'text-gray-400 hover:text-brand-orange'
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

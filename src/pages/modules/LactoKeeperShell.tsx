import { useState } from 'react';
import { PageState as RebanoPageState } from '../RebanoShell';
import Dashboard from '../Dashboard';
import AnimalsPage from '../AnimalsPage';
import HistoryPage from '../HistoryPage';
import AddDataPage from '../AddDataPage';
import { PeriodStats } from '../../hooks/useHistoricalAnalysis';
import { BarChart2, ArrowLeft, CalendarClock, List, PlusCircle } from 'lucide-react';

type LactoKeeperPage = 'dashboard' | 'analysis' | 'history' | 'add-data';

interface LactoKeeperShellProps {
    navigateToRebano: (page: RebanoPageState) => void;
    onExitModule: () => void;
}

export default function LactoKeeperShell({ navigateToRebano, onExitModule }: LactoKeeperShellProps) {
    const [page, setPage] = useState<LactoKeeperPage>('dashboard');
    const [historySelectedPeriod, setHistorySelectedPeriod] = useState<PeriodStats | null>(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: List },
        { id: 'history', label: 'Historial', icon: CalendarClock },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
    ];

    const renderContent = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard onNavigateToAnalysis={() => setPage('analysis')} />;
            case 'analysis':
                return <AnimalsPage onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'rebano-profile', animalId })} />;
            case 'history':
                return <HistoryPage 
                            onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'rebano-profile', animalId })} 
                            selectedPeriod={historySelectedPeriod}
                            setSelectedPeriod={setHistorySelectedPeriod}
                       />;
            case 'add-data':
                return <AddDataPage onNavigate={(pageName: any, state: any) => navigateToRebano({ name: pageName, ...state })} />;
            default:
                return <Dashboard onNavigateToAnalysis={() => setPage('analysis')} />;
        }
    };

    return (
        <div className="min-h-screen animate-fade-in">
            <button
                onClick={onExitModule}
                className="fixed top-4 left-4 z-50 w-12 h-12 bg-zinc-800/80 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-700"
                aria-label="Volver a Rebaño"
            >
                <ArrowLeft size={24} />
            </button>

            <main className="pb-24">
                {renderContent()}
            </main>

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
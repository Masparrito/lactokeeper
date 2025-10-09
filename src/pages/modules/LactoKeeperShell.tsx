// src/pages/modules/LactoKeeperShell.tsx

import { useState } from 'react';
import type { PageState as RebanoPageState } from '../../types/navigation';
import Dashboard from '../Dashboard';
import AnimalsPage from '../AnimalsPage';
import HistoryPage from '../HistoryPage';
import AddDataPage from '../AddDataPage';
import ManagementPage from '../ManagementPage';
import { PeriodStats } from '../../hooks/useHistoricalAnalysis';
import { BarChart2, ArrowLeft, CalendarClock, List, PlusCircle, Wind } from 'lucide-react';
// --- CAMBIO CLAVE 1: Se importa el nuevo ícono ---
import { GiMilkCarton } from 'react-icons/gi';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';

type LactoKeeperPage = 'dashboard' | 'analysis' | 'history' | 'add-data' | 'drying';

interface LactoKeeperShellProps {
    navigateToRebano: (page: RebanoPageState) => void;
    onExitModule: () => void;
}

export default function LactoKeeperShell({ navigateToRebano, onExitModule }: LactoKeeperShellProps) {
    const { syncStatus } = useData();
    const [page, setPage] = useState<LactoKeeperPage>('dashboard');
    const [historySelectedPeriod, setHistorySelectedPeriod] = useState<PeriodStats | null>(null);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: List },
        { id: 'history', label: 'Historial', icon: CalendarClock },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
        { id: 'drying', label: 'Secado', icon: Wind },
    ];

    const handleBackPress = () => {
        if (page === 'dashboard') {
            onExitModule();
        } else {
            setPage('dashboard');
        }
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard': return <Dashboard onNavigateToAnalysis={() => setPage('analysis')} />;
            case 'analysis': return <AnimalsPage onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'rebano-profile', animalId })} />;
            case 'history': return <HistoryPage onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'rebano-profile', animalId })} selectedPeriod={historySelectedPeriod} setSelectedPeriod={setHistorySelectedPeriod} />;
            case 'add-data': return <AddDataPage onNavigate={(pageName: any, state: any) => navigateToRebano({ name: pageName, ...state })} />;
            case 'drying': return <ManagementPage onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'rebano-profile', animalId })} />;
            default: return <Dashboard onNavigateToAnalysis={() => setPage('analysis')} />;
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
                        {/* --- CAMBIO CLAVE 2: Se reemplaza Droplets por GiMilkCarton --- */}
                        <GiMilkCarton className="text-brand-orange" size={28} />
                        <h1 className="text-xl font-bold">LactoKeeper</h1>
                    </div>
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>

            <main className="flex-grow pt-16 pb-24">
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
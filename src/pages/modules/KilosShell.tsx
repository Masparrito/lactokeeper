import { useState } from 'react';
// --- CAMBIO CLAVE: Se importan los tipos centralizados ---
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
import { ArrowLeft, BarChart2, PlusCircle, Scale } from 'lucide-react';
import { GiChart } from 'react-icons/gi';
import AddWeightPage from './kilos/AddWeightPage';
import KilosDashboard from './kilos/KilosDashboard';
import KilosAnalysisPage from './kilos/KilosAnalysisPage';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';

type KilosPage = 'dashboard' | 'analysis' | 'add-data';

interface KilosShellProps {
    navigateToRebano: (page: RebanoPageState) => void;
    onSwitchModule: (module: AppModule) => void;
}

export default function KilosShell({ navigateToRebano, onSwitchModule }: KilosShellProps) {
    const { syncStatus } = useData();
    const [page, setPage] = useState<KilosPage>('dashboard');

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: GiChart },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
    ];

    const handleBackPress = () => {
        if (page !== 'dashboard') {
            setPage('dashboard');
        } else {
            onSwitchModule('rebano');
        }
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard': 
                return <KilosDashboard onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} />;
            case 'analysis': 
                return <KilosAnalysisPage onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} />;
            case 'add-data': 
                return <AddWeightPage onNavigate={navigateToRebano} onSaveSuccess={() => setPage('analysis')} />;
            default: 
                return <KilosDashboard onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} />;
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
                        <Scale className="text-brand-green" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">Kilos</p>
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

            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setPage(item.id as KilosPage)}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${page === item.id ? 'text-brand-green' : 'text-gray-400 hover:text-brand-green'}`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

import { useState } from 'react';
// --- (NUEVO) Importar 'Grid' ---
import { ArrowLeft, BarChart2, PlusCircle, Scale, Grid } from 'lucide-react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
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
    
    // --- (NUEVO) Estado para el modal de Módulos ---
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);

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
        // --- CORRECCIÓN SCROLL: 'h-screen overflow-hidden' ---
        <div className="h-screen overflow-hidden animate-fade-in text-white flex flex-col">
            
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border h-16">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-full">
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
            
            {/* --- CORRECCIÓN SCROLL: 'flex-1 overflow-y-auto' y padding --- */}
            <main className="flex-1 overflow-y-auto pt-16 pb-16">
                {renderContent()}
            </main>

            {/* --- (NUEVO) ModuleSwitcher actualizado a modal --- */}
            <ModuleSwitcher 
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule} 
            />

            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
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
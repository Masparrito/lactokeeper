// src/pages/modules/KilosShell.tsx
// (ACTUALIZADO: Recibe y pasa el estado completo de 'Kilos' desde App.tsx)

import { useState } from 'react'; // 'useState' se mantiene para el modal
import { ArrowLeft, BarChart2, PlusCircle, Scale, Grid } from 'lucide-react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
import { GiChart } from 'react-icons/gi';
import AddWeightPage from './kilos/AddWeightPage';
import KilosDashboard from './kilos/KilosDashboard';
import KilosAnalysisPage from './kilos/KilosAnalysisPage';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';

// Exportar el tipo de página
export type KilosPage = 'dashboard' | 'analysis' | 'add-data';

// (NUEVO) Tipo para el estado del módulo de Kilos (importado de App.tsx)
type KilosState = {
    activePage: KilosPage;
    analysisDate: string | null;
}

// (ACTUALIZADO) Props
interface KilosShellProps {
    initialKilosState: KilosState; // <-- NUEVO
    onPageChange: (page: KilosPage) => void; // <-- NUEVO
    onAnalysisDateChange: (date: string) => void; // <-- NUEVO
    navigateToRebano: (page: RebanoPageState) => void;
    onSwitchModule: (module: AppModule) => void;
}

export default function KilosShell({ 
    initialKilosState, 
    onPageChange,
    onAnalysisDateChange,
    navigateToRebano, 
    onSwitchModule 
}: KilosShellProps) {
    
    const { syncStatus } = useData();
    // 'page' ahora se lee desde la prop
    const page = initialKilosState.activePage; 
    
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: GiChart },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
    ];

    const handleBackPress = () => {
        if (page !== 'dashboard') {
            onPageChange('dashboard'); // Llama al handler
        } else {
            onSwitchModule('rebano'); 
        }
    };
    
    const handleNavClick = (newPage: KilosPage) => {
        onPageChange(newPage); // Llama al handler
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard': 
                return <KilosDashboard 
                            onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} 
                        />;
            case 'analysis': 
                return <KilosAnalysisPage 
                            // Props de navegación
                            onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} 
                            navigateTo={navigateToRebano}
                            // (NUEVO) Props de estado de fecha
                            initialDate={initialKilosState.analysisDate}
                            onDateChange={onAnalysisDateChange}
                        />;
            case 'add-data': 
                return <AddWeightPage 
                            onSaveSuccess={() => onPageChange('analysis')} 
                        />;
            default: 
                return <KilosDashboard 
                            onSelectAnimal={(animalId) => navigateToRebano({ name: 'growth-profile', animalId })} 
                        />;
        }
    };

    return (
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
                    <div className="flex items-center gap-4">
                        <SyncStatusIcon status={syncStatus} />
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
            
            <main className="flex-1 overflow-y-auto pt-16 pb-16">
                {renderContent()}
            </main>

            <ModuleSwitcher 
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule} 
            />

            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id as KilosPage)}
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
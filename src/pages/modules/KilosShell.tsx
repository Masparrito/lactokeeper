import { useState } from 'react'; 
import { ArrowLeft, BarChart2, PlusCircle, Grid } from 'lucide-react';
import type { PageState as RebanoPageState, AppModule } from '../../types/navigation';
import { GiChart } from 'react-icons/gi';
import AddWeightPage from './kilos/AddWeightPage';
import KilosDashboard from './kilos/KilosDashboard'; // CORREGIDO: Nombre original
import KilosAnalysisPage from './kilos/KilosAnalysisPage';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';

export type KilosPage = 'dashboard' | 'analysis' | 'add-data';

type KilosState = {
    activePage: KilosPage;
    analysisDate: string | null;
}

interface KilosShellProps {
    initialKilosState: KilosState;
    onPageChange: (page: KilosPage) => void;
    onAnalysisDateChange: (date: string) => void;
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
    
    const page = initialKilosState.activePage; 
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'analysis', label: 'Análisis', icon: GiChart },
        { id: 'add-data', label: 'Añadir', icon: PlusCircle },
        { id: 'modules', label: 'Módulos', icon: Grid }, 
    ];

    const handleBackPress = () => {
        if (page !== 'dashboard') {
            onPageChange('dashboard');
        } else {
            onSwitchModule('rebano'); 
        }
    };
    
    const handleNavClick = (newPage: KilosPage) => {
        onPageChange(newPage);
    };

    const renderContent = () => {
        switch (page) {
            case 'dashboard': 
                return <KilosDashboard 
                            onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'growth-profile', animalId })}
                            onBack={handleBackPress}
                        />;
            case 'analysis': 
                return <KilosAnalysisPage 
                            onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'growth-profile', animalId })} 
                            navigateTo={navigateToRebano}
                            initialDate={initialKilosState.analysisDate}
                            onDateChange={onAnalysisDateChange}
                        />;
            case 'add-data': 
                return <AddWeightPage 
                            onSaveSuccess={() => onPageChange('analysis')} 
                        />;
            default: 
                return <KilosDashboard 
                            onSelectAnimal={(animalId: string) => navigateToRebano({ name: 'growth-profile', animalId })}
                            onBack={handleBackPress}
                        />;
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-black overflow-hidden text-white relative">
            
            {/* Botón Atrás - Oculto en dashboard porque ya tiene su propio header */}
            {page !== 'dashboard' && (
                <button 
                    onClick={handleBackPress} 
                    className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-4 z-40 p-2 bg-black/50 backdrop-blur-md rounded-full border border-zinc-800 text-zinc-400 hover:text-white shadow-lg"
                    aria-label="Atrás"
                >
                    <ArrowLeft size={18} />
                </button>
            )}

            {/* MAIN */}
            <main 
                className="flex-1 w-full overflow-y-auto overflow-x-hidden bg-black scroll-smooth"
                style={{
                    paddingTop: page === 'dashboard' ? '0' : 'env(safe-area-inset-top)',
                    paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 20px)'
                }}
            >
                {renderContent()}
            </main>

            {/* NAV */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center h-[60px] pt-1">
                    {navItems.map((item) => {
                        const isActive = page === item.id;
                        const isModuleBtn = item.id === 'modules';

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (isModuleBtn) setIsModuleSwitcherOpen(true);
                                    else handleNavClick(item.id as KilosPage);
                                }}
                                className="flex-1 flex flex-col items-center justify-center relative group active:scale-95 transition-transform h-full"
                            >
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-0.5 bg-brand-green rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                                )}
                                <div className={`p-1 rounded-xl transition-all duration-300 ${
                                    isActive ? 'text-brand-green -translate-y-0.5' : (isModuleBtn ? 'text-zinc-400 hover:text-white' : 'text-zinc-500')
                                }`}>
                                    <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wide transition-all duration-300 ${
                                    isActive ? 'text-brand-green' : 'text-zinc-600'
                                }`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* MODULE SWITCHER */}
            {isModuleSwitcherOpen && (
                <div className="fixed inset-0 z-[100]">
                    <ModuleSwitcher 
                        isOpen={isModuleSwitcherOpen}
                        onClose={() => setIsModuleSwitcherOpen(false)}
                        onSwitchModule={onSwitchModule} 
                    />
                </div>
            )}
        </div>
    );
}
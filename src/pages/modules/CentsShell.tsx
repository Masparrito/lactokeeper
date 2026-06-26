import { useState } from 'react'; // <-- Importar useState
import { ArrowLeft, DollarSign, Grid } from 'lucide-react'; // <-- Importar Grid
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
import EconomyDashboardPage from './economy/EconomyDashboardPage';
import { ModuleSwitcher } from '../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../types/navigation';


interface CentsShellProps {
    onSwitchModule: (module: AppModule) => void;
}

export default function CentsShell({ onSwitchModule }: CentsShellProps) {
    const { syncStatus } = useData();
    // --- (NUEVO) Estado para el modal de Módulos ---
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);

    return (
        // --- CORRECCIÓN SCROLL: 'h-screen overflow-hidden' ---
        <div className="h-[100dvh] overflow-hidden animate-fade-in text-white flex flex-col bg-brand-dark">

            <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border pt-[env(safe-area-inset-top)]">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
                    <button onClick={() => onSwitchModule('rebano')} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <DollarSign className="text-yellow-400" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">Cents</p>
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
            <main className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                <EconomyDashboardPage />
            </main>

            {/* --- (NUEVO) ModuleSwitcher actualizado a modal --- */}
            <ModuleSwitcher 
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule} 
            />
        </div>
    );
}
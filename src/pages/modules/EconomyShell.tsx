// src/pages/modules/EconomyShell.tsx

import { ArrowLeft, DollarSign } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SyncStatusIcon } from '../../components/ui/SyncStatusIcon';
// --- RUTA CORREGIDA: Ahora busca dentro de la carpeta 'economy' ---
import EconomyDashboardPage from './economy/EconomyDashboardPage';

interface EconomyShellProps {
    onExitModule: () => void;
}

export default function EconomyShell({ onExitModule }: EconomyShellProps) {
    const { syncStatus } = useData();

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col">
            
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                    <button onClick={onExitModule} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <DollarSign className="text-yellow-400" />
                        <h1 className="text-xl font-bold">Economía</h1>
                    </div>
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            
            <main className="flex-grow pt-16 pb-24">
                <EconomyDashboardPage />
            </main>

            {/* Este módulo por ahora no necesita su propia barra de navegación inferior */}
        </div>
    );
}
import { useState } from 'react';
import { ArrowLeft, Eye, Grid, ClipboardCheck, Activity } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import { FamachaCapturePage } from './FamachaCapturePage';
import { FamachaIndexPage } from './FamachaIndexPage';

interface FamachaShellProps {
    onSwitchModule: (module: AppModule) => void;
}

type FamachaView = 'captura' | 'indice';

export default function FamachaShell({ onSwitchModule }: FamachaShellProps) {
    const { syncStatus } = useData();
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);
    const [activeView, setActiveView] = useState<FamachaView>('captura');

    const navItems = [
        { view: 'captura', label: 'Captura', icon: ClipboardCheck },
        { view: 'indice', label: 'Índice', icon: Activity },
    ] as const;

    return (
        // Columna flex a pantalla completa: respeta safe-areas sin posicionamiento fijo.
        <div className="h-[100dvh] w-screen overflow-hidden animate-fade-in text-white flex flex-col bg-brand-dark">
            {/* Header (con safe-area superior para no chocar con la barra de estado) */}
            <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border pt-[env(safe-area-inset-top)]">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
                    <button onClick={() => onSwitchModule('rebano')} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Eye className="text-rose-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none mt-0.5">Famacha</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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

            {/* Contenido scrolleable */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden py-4">
                {activeView === 'captura' ? <FamachaCapturePage /> : <FamachaIndexPage />}
            </main>

            {/* Navegación inferior (con safe-area inferior para la barra de inicio) */}
            <nav className="flex-shrink-0 bg-gray-900/90 backdrop-blur-lg border-t border-brand-border pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-4xl mx-auto flex justify-around items-center h-16">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => setActiveView(item.view)}
                                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-rose-500' : 'text-zinc-400 hover:text-white'}`}
                            >
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[11px] font-semibold">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <ModuleSwitcher
                isOpen={isModuleSwitcherOpen}
                onClose={() => setIsModuleSwitcherOpen(false)}
                onSwitchModule={onSwitchModule}
            />
        </div>
    );
}

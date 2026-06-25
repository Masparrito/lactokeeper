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
        <div className="h-screen overflow-hidden animate-fade-in text-white flex flex-col">
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border h-16">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-full">
                    <button onClick={() => onSwitchModule('rebano')} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Eye className="text-rose-500" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">Famacha</p>
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

            <main className="flex-1 overflow-y-auto pt-16 pb-20">
                {activeView === 'captura' ? <FamachaCapturePage /> : <FamachaIndexPage />}
            </main>

            {/* Navegación inferior */}
            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 z-20 bg-gray-900/90 backdrop-blur-lg border-t border-brand-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="max-w-4xl mx-auto flex justify-around items-center h-16">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => setActiveView(item.view)}
                                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-rose-500' : 'text-zinc-400 hover:text-white'}`}
                            >
                                <item.icon size={22} />
                                <span className="text-xs font-medium">{item.label}</span>
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

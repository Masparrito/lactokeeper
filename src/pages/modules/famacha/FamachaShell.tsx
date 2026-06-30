import { useState } from 'react';
import { ArrowLeft, Eye, Grid, Zap, ClipboardList, BarChart3, Settings, GitCompareArrows } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import { ModuleSwitcher } from '../../../components/ui/ModuleSwitcher';
import type { AppModule } from '../../../types/navigation';
import { FamachaCapturePage } from './FamachaCapturePage';
import { FamachaAnimalsPage } from './FamachaAnimalsPage';
import { FamachaIndexPage } from './FamachaIndexPage';
import { FamachaMorePage } from './FamachaMorePage';
import { FamachaBalancePage } from './FamachaBalancePage';

interface FamachaShellProps {
    onSwitchModule: (module: AppModule) => void;
}

type FamachaView = 'revision' | 'animales' | 'indice' | 'cotejo' | 'mas';

export default function FamachaShell({ onSwitchModule }: FamachaShellProps) {
    const { syncStatus } = useData();
    const [isModuleSwitcherOpen, setIsModuleSwitcherOpen] = useState(false);
    const [activeView, setActiveView] = useState<FamachaView>('revision');

    const navItems = [
        { view: 'revision', label: 'Revisión', icon: Zap },
        { view: 'animales', label: 'Animales', icon: ClipboardList },
        { view: 'indice', label: 'Análisis', icon: BarChart3 },
        { view: 'cotejo', label: 'Cotejo', icon: GitCompareArrows },
        { view: 'mas', label: 'Más', icon: Settings },
    ] as const;

    return (
        <div className="h-full w-screen overflow-hidden animate-fade-in text-c-text flex flex-col bg-c-bg">
            {/* Header */}
            <header className="flex-shrink-0 bg-c-bg/95 backdrop-blur-lg border-b border-c-border pt-[env(safe-area-inset-top)]">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
                    <button onClick={() => onSwitchModule('rebano')} className="p-2 -ml-2 text-c-text-muted hover:text-c-text" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Eye className="text-rose-500" />
                        <div>
                            <h1 className="text-lg font-bold text-c-text leading-none">Famacha</h1>
                            <p className="text-[11px] text-c-text-muted leading-none mt-0.5">Anemia del rebaño</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <SyncStatusIcon status={syncStatus} />
                        <button onClick={() => setIsModuleSwitcherOpen(true)} className="p-2 text-c-text-muted hover:text-c-text transition-colors" title="Módulos">
                            <Grid size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden py-4">
                {activeView === 'revision' && <FamachaCapturePage />}
                {activeView === 'animales' && <FamachaAnimalsPage />}
                {activeView === 'indice' && <FamachaIndexPage />}
                {activeView === 'cotejo' && <FamachaBalancePage />}
                {activeView === 'mas' && <FamachaMorePage />}
            </main>

            {/* Navegación inferior */}
            <nav className="flex-shrink-0 bg-c-surface border-t border-c-border pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-4xl mx-auto flex justify-around items-center h-16">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => setActiveView(item.view)}
                                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-rose-500' : 'text-c-text-muted hover:text-c-text'}`}
                            >
                                <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[11px] font-semibold">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <ModuleSwitcher isOpen={isModuleSwitcherOpen} onClose={() => setIsModuleSwitcherOpen(false)} onSwitchModule={onSwitchModule} />
        </div>
    );
}

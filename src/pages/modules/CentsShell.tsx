import { ArrowLeft, DollarSign } from 'lucide-react';
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

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col">
            
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
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
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            
            <main className="flex-grow pt-16 pb-24">
                <EconomyDashboardPage />
            </main>

            <ModuleSwitcher onSwitchModule={onSwitchModule} />
        </div>
    );
}

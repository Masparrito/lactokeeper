import { useState } from 'react';
import type { AppModule } from '../../../types/navigation';
import { ArrowLeft, CalendarCheck, ClipboardList, Syringe, DollarSign, HeartPulse } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import ProductManagerPage from './ProductManagerPage';
import HealthPlannerPage from './HealthPlannerPage';
import HealthCalendarPage from './HealthCalendarPage';
import PlanDetailPage from './PlanDetailPage';
import CostAnalysisPage from './CostAnalysisPage';

type SaludPage =
    | { name: 'calendario' }
    | { name: 'planes' }
    | { name: 'inventario' }
    | { name: 'costos' }
    | { name: 'plan-detail', planId: string };

interface SaludShellProps {
    onSwitchModule: (module: AppModule) => void;
}

export default function SaludShell({ onSwitchModule }: SaludShellProps) {
    const { syncStatus } = useData();
    const [page, setPage] = useState<SaludPage>({ name: 'calendario' });
    const [history, setHistory] = useState<SaludPage[]>([]);

    const navItems = [
        { id: 'calendario', label: 'Calendario', icon: CalendarCheck },
        { id: 'planes', label: 'Planes', icon: ClipboardList },
        { id: 'inventario', label: 'Inventario', icon: Syringe },
        { id: 'costos', label: 'Costos', icon: DollarSign },
    ];

    const navigateTo = (newPage: SaludPage) => {
        setHistory(current => [...current, page]);
        setPage(newPage);
    };

    const navigateBack = () => {
        const lastPage = history.pop();
        if (lastPage) {
            setHistory([...history]); // Actualizar el estado del historial
            setPage(lastPage);
        } else {
            onSwitchModule('rebano');
        }
    };

    const handleNavClick = (pageName: SaludPage['name']) => {
        setHistory([]);
        setPage({ name: pageName } as SaludPage);
    };

    const renderContent = () => {
        switch (page.name) {
            case 'calendario':
                return <HealthCalendarPage />;
            case 'planes':
                return <HealthPlannerPage navigateTo={navigateTo} />;
            case 'inventario':
                return <ProductManagerPage />;
            case 'costos':
                return <CostAnalysisPage />;
            case 'plan-detail':
                return <PlanDetailPage planId={page.planId} onBack={navigateBack} />;
            default:
                return <HealthCalendarPage />;
        }
    };

    return (
        // --- (INICIO) CORRECCIÓN DE SCROLL ---
        // 1. Contenedor raíz con 'h-screen' y 'overflow-hidden'
        <div className="h-screen overflow-hidden animate-fade-in text-white flex flex-col bg-brand-dark">
            
            {/* 2. Header fijo con 'h-16' */}
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-brand-dark/80 backdrop-blur-lg border-b border-brand-border h-16">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-full">
                    <button onClick={navigateBack} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Atrás">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <HeartPulse className="text-teal-400" />
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">GanaderoOS</h1>
                            <p className="text-xs text-zinc-400 leading-none">StockCare</p>
                        </div>
                    </div>
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            
            {/* 3. <main> es el ÚNICO scroll, con 'flex-1', 'overflow-y-auto' y padding */}
            <main className="flex-1 overflow-y-auto pt-16 pb-16">
                {renderContent()}
            </main>
            {/* --- (FIN) CORRECCIÓN DE SCROLL --- */}

            {/* 4. Nav fijo con 'h-16' */}
            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around z-20 h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id as SaludPage['name'])}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${page.name === item.id ? 'text-teal-400' : 'text-gray-400 hover:text-teal-400'}`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
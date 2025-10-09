// src/pages/modules/salud/SaludShell.tsx

import React, { useState } from 'react';
import type { PageState as RebanoPageState } from '../../../types/navigation';
import { ArrowLeft, CalendarCheck, ClipboardList, Syringe, DollarSign, HeartPulse } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { SyncStatusIcon } from '../../../components/ui/SyncStatusIcon';
import ProductManagerPage from './ProductManagerPage';
import HealthPlannerPage from './HealthPlannerPage';
// --- CAMBIO CLAVE 1: Se importa la nueva página de la Agenda ---
import AgendaPage from './AgendaPage';

// Definimos los tipos para las páginas internas del módulo de Salud
type SaludPage = 'agenda' | 'planes' | 'inventario' | 'costos';

// Componente placeholder para las secciones que construiremos en el futuro
const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="text-center p-8 animate-fade-in">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-zinc-400 mt-2">Esta sección estará disponible próximamente.</p>
    </div>
);

interface SaludShellProps {
    navigateToRebano: (page: RebanoPageState) => void;
    onExitModule: () => void;
}

export default function SaludShell({ navigateToRebano, onExitModule }: SaludShellProps) {
    const { syncStatus } = useData();
    // --- CAMBIO CLAVE 2: Hacemos que la página inicial sea "Agenda" para ver nuestro cambio ---
    const [page, setPage] = useState<SaludPage>('agenda');

    // Items de navegación para el módulo de Salud
    const navItems = [
        { id: 'agenda', label: 'Agenda', icon: CalendarCheck },
        { id: 'planes', label: 'Planes', icon: ClipboardList },
        { id: 'inventario', label: 'Inventario', icon: Syringe },
        { id: 'costos', label: 'Costos', icon: DollarSign },
    ];

    const renderContent = () => {
        switch (page) {
            case 'inventario':
                return <ProductManagerPage />;
            // --- CAMBIO CLAVE 3: Se renderiza la nueva página en lugar del placeholder ---
            case 'agenda':
                return <AgendaPage />;
            case 'planes':
                return <HealthPlannerPage />;
            case 'costos':
                return <PlaceholderPage title="Análisis de Costos" />;
            default:
                return <AgendaPage />;
        }
    };

    return (
        <div className="min-h-screen animate-fade-in text-white flex flex-col">
            
            <header className="flex-shrink-0 fixed top-0 left-0 right-0 z-20 bg-gray-900/80 backdrop-blur-lg border-b border-brand-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between p-4 h-16">
                    <button onClick={onExitModule} className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Salir del módulo">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <HeartPulse className="text-teal-400" />
                        <h1 className="text-xl font-bold">Salud</h1>
                    </div>
                    <div className="w-8 flex justify-end">
                        <SyncStatusIcon status={syncStatus} />
                    </div>
                </div>
            </header>
            
            <main className="flex-grow pt-16 pb-24">
                {renderContent()}
            </main>

            <nav className="flex-shrink-0 fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xl border-t border-white/20 flex justify-around">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setPage(item.id as SaludPage)}
                        className={`flex flex-col items-center justify-center p-3 w-full transition-colors ${page === item.id ? 'text-teal-400' : 'text-gray-400 hover:text-teal-400'}`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
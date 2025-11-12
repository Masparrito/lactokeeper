// src/pages/ManagementPage.tsx (CORREGIDO)

import React, { useMemo, useState } from 'react';
import { useManagementAlerts, ManagementAlert } from '../hooks/useManagementAlerts';
import type { PageState } from '../types/navigation';
import { 
    Wind, // Secado
    Baby, // Destete
    Heart, // Reproductivo
    ChevronDown,
    ChevronRight,
    AlertCircle, // Icono para 'Sin Alertas'
    ArrowLeft // --- (NUEVO) Icono de 'Atrás' ---
} from 'lucide-react';

// --- (NUEVO) Tarjeta de Alerta Individual ---
const AlertCard: React.FC<{ alert: ManagementAlert, onClick: () => void }> = ({ alert, onClick }) => {
    const { icon: Icon, color, animalDisplay, title, message } = alert;

    return (
        <button 
            onClick={onClick}
            className="w-full flex items-start text-left p-3 bg-ios-modal-bg hover:bg-zinc-800 transition-colors"
        >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${color} bg-zinc-700/50`}>
                <Icon size={18} />
            </div>
            
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-zinc-300">{animalDisplay}</p>
                    <p className={`text-xs font-bold ${color}`}>{title}</p>
                </div>
                <p className="text-base text-white mt-0.5">{message}</p>
            </div>
            
            <div className="flex-shrink-0 ml-2 self-center">
                <ChevronRight size={20} className="text-zinc-500" />
            </div>
        </button>
    );
};

// --- (NUEVO) Grupo de Alertas (El "Widget") ---
const AlertGroup: React.FC<{ 
    title: string, 
    icon: React.ElementType, 
    alerts: ManagementAlert[],
    onAlertClick: (animalId: string) => void,
    startOpen?: boolean 
}> = ({ title, icon: Icon, alerts, onAlertClick, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    const alertCount = alerts.length;

    return (
        <div className="mb-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2 px-4"
            >
                <span className="flex items-center gap-2">
                    <Icon size={16} />
                    {title}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-white bg-zinc-700 rounded-full px-2 py-0.5 text-xs font-bold">
                        {alertCount}
                    </span>
                    <ChevronDown 
                        size={20} 
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                </div>
            </button>
            
            {isOpen && (
                <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden animate-fade-in">
                    {alerts.map(alert => (
                        <AlertCard 
                            key={alert.id}
                            alert={alert}
                            onClick={() => onAlertClick(alert.animalId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

// --- (CORRECCIÓN) Se añade la prop 'onBack' ---
interface ManagementPageProps {
    navigateTo: (page: PageState) => void;
    onBack: () => void; 
}

export default function ManagementPage({ navigateTo, onBack }: ManagementPageProps) {
    const allAlerts = useManagementAlerts();

    const { 
        reproductiveAlerts, 
        dryingAlerts, 
        weaningAlerts 
    } = useMemo(() => {
        return {
            reproductiveAlerts: allAlerts.filter(a => a.type === 'REPRODUCTIVO'),
            dryingAlerts: allAlerts.filter(a => a.type === 'SECADO'),
            weaningAlerts: allAlerts.filter(a => a.type === 'DESTETE'),
        }
    }, [allAlerts]);

    const handleAlertClick = (animalId: string) => {
        navigateTo({ name: 'rebano-profile', animalId: animalId });
    };

    const totalAlerts = allAlerts.length;

    return (
        <div className="w-full max-w-lg mx-auto pb-8">
            
            {/* --- (CORRECCIÓN DE COLOR) Header ahora usa el fondo de la app y borde --- */}
            <div className="sticky top-0 z-10 bg-[#1C1C1E] pt-4 pb-4 px-4 border-b border-brand-border">
                {/* Botón de Volver */}
                <div className="absolute top-4 left-4">
                    <button onClick={onBack} className="p-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                </div>
                
                {/* Títulos (centrados) */}
                <div className="text-center">
                    <h1 className="text-xl font-bold tracking-tight text-white">Alertas de Manejo</h1>
                    <p className="text-base text-zinc-400">
                        {totalAlerts > 0 
                            ? `Tienes ${totalAlerts} tareas prioritarias.` 
                            : "No hay tareas urgentes. ¡Todo en orden!"}
                    </p>
                </div>
            </div>

            <main className="pt-4 px-4">
                {totalAlerts === 0 && (
                    <div className="flex flex-col items-center justify-center text-center p-10 bg-brand-glass rounded-2xl border border-brand-border">
                        <AlertCircle size={40} className="text-green-500" />
                        <h2 className="text-xl font-semibold text-white mt-4">Todo en Orden</h2>
                        <p className="text-zinc-400">No se detectaron alertas de manejo basadas en tu configuración.</p>
                    </div>
                )}

                {reproductiveAlerts.length > 0 && (
                    <AlertGroup 
                        title="Reproductivo"
                        icon={Heart}
                        alerts={reproductiveAlerts}
                        onAlertClick={handleAlertClick}
                        startOpen={true}
                    />
                )}
                
                {dryingAlerts.length > 0 && (
                    <AlertGroup 
                        title="Secado"
                        icon={Wind}
                        alerts={dryingAlerts}
                        onAlertClick={handleAlertClick}
                        startOpen={true}
                    />
                )}
                
                {weaningAlerts.length > 0 && (
                    <AlertGroup 
                        title="Destete"
                        icon={Baby}
                        alerts={weaningAlerts}
                        onAlertClick={handleAlertClick}
                        startOpen={true}
                    />
                )}

            </main>
        </div>
    );
}
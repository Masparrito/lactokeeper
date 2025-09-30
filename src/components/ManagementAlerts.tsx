// src/components/ManagementAlerts.tsx

import React from 'react';
import { useData } from '../context/DataContext';
import { Bell, Wind, Archive } from 'lucide-react';
import { calculateDEL } from '../utils/calculations';

interface ManagementAlertsProps {
    onSelectAnimal: (animalId: string) => void;
}

export const ManagementAlerts: React.FC<ManagementAlertsProps> = ({ onSelectAnimal }) => {
    const { parturitions } = useData();

    // Usamos useMemo para calcular las alertas solo cuando los datos cambien
    const alerts = React.useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        // Alerta 1: Animales que necesitan secado (más de 270 DEL)
        const dryingNeededAlerts = parturitions
            .filter(p => {
                if (p.status !== 'activa') return false;
                const del = calculateDEL(p.parturitionDate, today);
                return del >= 270;
            })
            .map(p => ({
                key: `drying-needed-${p.id}`,
                animalId: p.goatId,
                type: 'Necesita Secado',
                message: `Con ${calculateDEL(p.parturitionDate, today)} DEL, es hora de iniciar el secado.`,
                icon: <Wind className="text-blue-400" size={18}/>,
                bgColor: 'bg-blue-500/20'
            }));

        // Alerta 2: Animales que ya están en proceso de secado
        const inDryingProcessAlerts = parturitions
            .filter(p => p.status === 'en-secado')
            .map(p => ({
                key: `in-drying-${p.id}`,
                animalId: p.goatId,
                type: 'En Secado',
                message: `Inició el proceso de secado el ${new Date(p.dryingStartDate!).toLocaleDateString()}.`,
                icon: <Archive className="text-gray-400" size={18}/>,
                bgColor: 'bg-gray-500/20'
            }));
            
        return [...dryingNeededAlerts, ...inDryingProcessAlerts];
    }, [parturitions]);

    // Si no hay alertas, no renderizamos nada.
    if (alerts.length === 0) {
        return null;
    }

    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase tracking-wider border-b border-brand-border pb-2 mb-3">
                <Bell className="text-amber-400"/>
                <span>Alertas de Manejo</span>
            </div>
            <div className="space-y-2">
                {alerts.map((alert) => (
                    <button 
                        key={alert.key}
                        onClick={() => onSelectAnimal(alert.animalId)}
                        className="w-full text-left p-3 bg-black/30 rounded-lg hover:bg-white/10 transition-colors flex items-start space-x-3"
                    >
                        <div className={`w-8 h-8 flex-shrink-0 ${alert.bgColor} rounded-full flex items-center justify-center`}>
                            {alert.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-white">{alert.animalId} - <span className="text-zinc-300 font-normal">{alert.type}</span></p>
                            <p className="text-sm text-zinc-400">{alert.message}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
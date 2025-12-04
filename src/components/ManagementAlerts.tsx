import React, { useState } from 'react';
import { useManagementAlerts, ManagementAlert } from '../hooks/useManagementAlerts';
import { Bell } from 'lucide-react';
import { LightTreatmentActionModal } from './modals/LightTreatmentActionModal';

interface ManagementAlertsProps {
    onSelectAnimal: (animalId: string, openAction?: 'wean' | 'service') => void;
}

export const ManagementAlerts: React.FC<ManagementAlertsProps> = ({ onSelectAnimal }) => {
    const alerts = useManagementAlerts();
    
    // Estado para ocultar visualmente las alertas descartadas en esta sesión
    const [hiddenAlerts, setHiddenAlerts] = useState<Set<string>>(new Set());

    // Estados para el Modal de Tratamiento de Luz
    const [lightModalOpen, setLightModalOpen] = useState(false);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [lightActionType, setLightActionType] = useState<'START' | 'END'>('START');

    const visibleAlerts = alerts.filter((alert: ManagementAlert) => !hiddenAlerts.has(alert.id));

    if (visibleAlerts.length === 0) {
        return null;
    }

    const handleAlertClick = (alert: ManagementAlert) => {
        // CASO 1: Alertas de Acción de Luz (Inicio/Fin)
        if (alert.subType === 'LIGHT_START' || alert.subType === 'LIGHT_END') {
             setSelectedSeasonId(alert.data?.seasonId || alert.animalId);
             setLightActionType(alert.subType === 'LIGHT_START' ? 'START' : 'END');
             setLightModalOpen(true);
             return; 
        }

        // CASO 2: Recordatorios de Luz (Informativos)
        if (alert.type === 'MANEJO' && !alert.subType) {
             setHiddenAlerts(prev => new Set(prev).add(alert.id));
             return;
        }

        // CASO 3: Alertas de Animales (Estándar)
        setHiddenAlerts(prev => new Set(prev).add(alert.id));

        let action: 'wean' | 'service' | undefined = undefined;
        if (alert.subType === 'WEANING') action = 'wean';
        if (alert.subType === 'SERVICE_WEIGHT') action = 'service';

        onSelectAnimal(alert.animalId, action);
    };

    return (
        <>
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in mb-6">
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase tracking-wider border-b border-brand-border pb-2 mb-3">
                    <Bell className="text-amber-400" size={16}/>
                    <span>Alertas de Manejo ({visibleAlerts.length})</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {visibleAlerts.map((alert: ManagementAlert) => (
                        <button 
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className="w-full text-left p-3 bg-black/30 rounded-lg hover:bg-white/10 transition-all active:scale-[0.98] flex items-start space-x-3 group"
                        >
                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-zinc-800 group-hover:scale-110 transition-transform`}>
                                <alert.icon className={alert.color} size={18}/>
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm flex items-center gap-2">
                                    {alert.animalDisplay} 
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 ${alert.color} bg-opacity-10 border border-current`}>
                                        {alert.title}
                                    </span>
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{alert.message}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Modal de Acción para Tratamiento de Luz */}
            {selectedSeasonId && (
                <LightTreatmentActionModal 
                    isOpen={lightModalOpen}
                    onClose={() => setLightModalOpen(false)}
                    seasonId={selectedSeasonId}
                    actionType={lightActionType}
                />
            )}
        </>
    );
};
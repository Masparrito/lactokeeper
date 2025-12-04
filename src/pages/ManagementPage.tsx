import React, { useMemo, useState } from 'react';
import { useManagementAlerts, ManagementAlert } from '../hooks/useManagementAlerts';
import { useData } from '../context/DataContext'; 
import type { PageState } from '../types/navigation';
import { Animal } from '../db/local';

// --- ICONOS ---
import { 
    Wind, Baby, Heart, ChevronDown, ChevronRight, 
    ArrowLeft, CheckCircle 
} from 'lucide-react';

// --- MODALES NECESARIOS ---
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';

// --- TARJETA DE ALERTA ---
const AlertCard: React.FC<{ alert: ManagementAlert, onClick: () => void }> = ({ alert, onClick }) => {
    const { icon: Icon, color, animalDisplay, title, message } = alert;

    return (
        <button 
            onClick={onClick}
            className="w-full flex items-start text-left p-3 bg-[#27272a]/50 hover:bg-[#27272a] border-b border-zinc-800 last:border-0 transition-colors active:bg-zinc-800"
        >
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mr-3 ${color} bg-zinc-800 border border-zinc-700`}>
                <Icon size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                    <p className="text-sm font-bold text-zinc-200 truncate pr-2">{animalDisplay}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${color.replace('text-', 'text-opacity-80 text-')}`}>{title}</p>
                </div>
                <p className="text-xs text-zinc-400 leading-snug line-clamp-2">{message}</p>
            </div>
            
            <div className="flex-shrink-0 ml-3 self-center text-zinc-600">
                <ChevronRight size={18} />
            </div>
        </button>
    );
};

// --- GRUPO DE ALERTAS ---
const AlertGroup: React.FC<{ 
    title: string, 
    icon: React.ElementType, 
    alerts: ManagementAlert[],
    onAlertClick: (alert: ManagementAlert) => void,
    startOpen?: boolean 
}> = ({ title, icon: Icon, alerts, onAlertClick, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    const alertCount = alerts.length;

    return (
        <div className="mb-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center py-2 px-1 mb-1"
            >
                <span className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    <Icon size={16} />
                    {title}
                </span>
                <div className="flex items-center gap-2">
                    <span className="bg-zinc-800 text-zinc-300 rounded-md px-2 py-0.5 text-xs font-bold border border-zinc-700">
                        {alertCount}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            
            {isOpen && (
                <div className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-sm animate-fade-in">
                    {alerts.map(alert => (
                        <AlertCard 
                            key={alert.id}
                            alert={alert}
                            onClick={() => onAlertClick(alert)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---

interface ManagementPageProps {
    navigateTo: (page: PageState) => void;
    onBack: () => void; 
}

export default function ManagementPage({ navigateTo, onBack }: ManagementPageProps) {
    const { animals, addServiceRecord, updateAnimal, addEvent } = useData();
    const allAlerts = useManagementAlerts();

    // --- ESTADOS PARA MODALES DE ACCIÓN ---
    const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
    const [activeModal, setActiveModal] = useState<'service' | 'wean' | 'drying' | null>(null);

    const { reproductiveAlerts, dryingAlerts, weaningAlerts } = useMemo(() => {
        return {
            reproductiveAlerts: allAlerts.filter(a => a.type === 'REPRODUCTIVO'),
            dryingAlerts: allAlerts.filter(a => a.type === 'SECADO'),
            weaningAlerts: allAlerts.filter(a => a.type === 'DESTETE'),
        }
    }, [allAlerts]);

    // --- LOGICA DE INTERCEPTACIÓN DE CLICS ---
    const handleAlertClick = (alert: ManagementAlert) => {
        // 1. Buscamos al animal completo usando el ID de la alerta
        const animal = animals.find(a => a.id === alert.animalId);
        
        if (!animal) {
            console.warn("Animal no encontrado para la alerta:", alert);
            return; 
        }

        setSelectedAnimal(animal);

        // 2. Decidimos qué modal abrir según el tipo de alerta
        if (alert.type === 'REPRODUCTIVO') {
            setActiveModal('service');
        } 
        else if (alert.type === 'DESTETE') {
            setActiveModal('wean');
        }
        else if (alert.type === 'SECADO') {
            // Para secado redirigimos al perfil
            navigateTo({ name: 'rebano-profile', animalId: animal.id });
        }
        else {
            navigateTo({ name: 'rebano-profile', animalId: animal.id });
        }
    };

    // --- HANDLER: GUARDAR SERVICIO ---
    const handleServiceSave = async (date: Date, sireLotId: string) => {
        if (!selectedAnimal) return;
        
        await addServiceRecord({
            femaleId: selectedAnimal.id,
            sireLotId: sireLotId,
            serviceDate: date.toISOString().split('T')[0]
        });

        closeModals();
    };

    // --- HANDLER: GUARDAR DESTETE ---
    const handleWeanSave = async (data: { weaningDate: string, weaningWeight: number }) => {
        if (!selectedAnimal) return;
        
        await updateAnimal(selectedAnimal.id, { 
            weaningDate: data.weaningDate, 
            weaningWeight: data.weaningWeight 
        });
        
        if (addEvent) {
            addEvent({
                animalId: selectedAnimal.id,
                date: data.weaningDate,
                type: 'Destete',
                details: `Destete registrado desde Alertas: ${data.weaningWeight} Kg.`,
                metaWeight: data.weaningWeight
            });
        }
        closeModals();
    };

    const closeModals = () => {
        setActiveModal(null);
        setSelectedAnimal(null);
    };

    const totalAlerts = allAlerts.length;

    return (
        <div className="w-full max-w-lg mx-auto pb-24 bg-[#09090b] min-h-screen">
            
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#09090b]/95 backdrop-blur-md pt-4 pb-4 px-4 border-b border-zinc-800">
                <div className="relative text-center">
                    <button onClick={onBack} className="absolute left-0 top-0 p-1 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-white">Centro de Alertas</h1>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {totalAlerts > 0 ? `${totalAlerts} acciones pendientes` : "Al día"}
                    </p>
                </div>
            </div>

            <main className="pt-6 px-4">
                {totalAlerts === 0 && (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 mt-10">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h2 className="text-lg font-bold text-white">¡Todo al día!</h2>
                        <p className="text-sm text-zinc-500 mt-2 max-w-[200px]">
                            No hay alertas de manejo pendientes en este momento.
                        </p>
                    </div>
                )}

                {reproductiveAlerts.length > 0 && (
                    <AlertGroup 
                        title="Reproducción"
                        icon={Heart}
                        alerts={reproductiveAlerts}
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

                {dryingAlerts.length > 0 && (
                    <AlertGroup 
                        title="Secado"
                        icon={Wind}
                        alerts={dryingAlerts}
                        onAlertClick={handleAlertClick}
                        startOpen={true}
                    />
                )}
            </main>

            {/* --- MODALES DE ACCIÓN DIRECTA --- */}
            
            {/* 1. Modal de Servicio (Reproductivo) */}
            {activeModal === 'service' && selectedAnimal && (
                <DeclareServiceModal
                    isOpen={true}
                    animal={selectedAnimal}
                    onClose={closeModals}
                    onSave={handleServiceSave}
                />
            )}

            {/* 2. Modal de Destete */}
            {activeModal === 'wean' && selectedAnimal && (
                <WeanAnimalForm
                    isOpen={true}
                    animalId={selectedAnimal.id}
                    birthDate={selectedAnimal.birthDate}
                    onSave={handleWeanSave}
                    onCancel={closeModals}
                />
            )}

        </div>
    );
}
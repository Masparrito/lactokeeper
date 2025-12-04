import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Search, Heart, HeartCrack, DollarSign, Ban, Trash2, MoreHorizontal, HeartHandshake, CalendarClock } from 'lucide-react';
import { Animal, Father, ServiceRecord } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { formatAnimalDisplay } from '../utils/formatting';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { MilkWeighingActionModal } from '../components/modals/MilkWeighingActionModal';
import { BodyWeighingActionModal } from '../components/modals/BodyWeighingActionModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal';
import { Modal } from '../components/ui/Modal';
import { LogWeightForm } from '../components/forms/LogWeightForm';
import { BatchWeighingForm } from '../components/forms/BatchWeighingForm';
import { NewWeighingSessionFlow } from './modules/shared/NewWeighingSessionFlow';

// --- SUB-COMPONENTE: Tarjeta de Hembra Asignada ---
interface AssignedFemaleCardProps {
    animal: Animal;
    services: ServiceRecord[];
    onClick: () => void;
    onOpenActions: (animal: Animal) => void;
}

const AssignedFemaleCard = ({ animal, services, onClick, onOpenActions }: AssignedFemaleCardProps) => {
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';
    
    // --- LÓGICA DE CONTADOR DE SERVICIOS ---
    const animalServices = useMemo(() => {
        return services.filter(s => s.femaleId === animal.id)
            .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    }, [services, animal.id]);

    const serviceCount = animalServices.length;
    // Asumimos que es "Servida" si tiene servicios pero aún no está diagnosticada preñada
    // Usamos 'as string' para evitar conflictos si el tipo ReproductiveStatus es estricto
    const currentStatus = animal.reproductiveStatus as string;
    const isServed = serviceCount > 0 && currentStatus !== 'Preñada';
    
    // Forzamos el tipo 'string' para poder asignar textos personalizados como "SERVIDA x2"
    let statusLabel: string = currentStatus || 'N/A';
    
    // Comparación segura usando el string casteado
    if (isServed && (currentStatus === 'En Servicio' || currentStatus === 'Servida' || currentStatus === 'Vacía')) {
        statusLabel = serviceCount > 1 ? `SERVIDA x${serviceCount}` : 'SERVIDA';
    }

    return (
        <div 
            onClick={onClick}
            className={`bg-zinc-900/50 border rounded-2xl p-3.5 mb-2 flex justify-between items-center transition-all active:scale-[0.99] cursor-pointer group relative overflow-hidden ${isServed ? 'border-pink-500/30 bg-pink-500/5' : 'border-zinc-800 hover:border-zinc-600'}`}
        >
            {/* Efecto de "Corazón Iluminado" sutil de fondo si está servida */}
            {isServed && <div className="absolute -left-4 -top-4 w-20 h-20 bg-pink-500/10 blur-2xl rounded-full pointer-events-none"></div>}

            <div className="flex items-center gap-3 min-w-0 relative z-10">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${isServed ? 'bg-black border-pink-500/50 text-pink-400' : 'bg-black border-zinc-800 text-zinc-400 group-hover:border-zinc-600'}`}>
                    {isServed ? <Heart size={16} className="fill-pink-500/20" /> : animal.id.substring(0, 2)}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-mono font-bold text-base truncate leading-tight ${isServed ? 'text-white' : 'text-zinc-200'}`}>{animal.id}</p>
                        {/* Indicador de última fecha de servicio */}
                        {isServed && animalServices[0] && (
                             <span className="text-[9px] text-pink-400/80 flex items-center gap-0.5 bg-pink-900/20 px-1.5 py-0.5 rounded">
                                <CalendarClock size={10} />
                                {new Date(animalServices[0].serviceDate).toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit'})}
                             </span>
                        )}
                    </div>
                    {formattedName && <p className="text-xs text-zinc-500 truncate mt-0.5 font-medium">{formattedName}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="text-right">
                    {/* Estado Reproductivo (Badge Dinámico) */}
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wide ${
                        currentStatus === 'Preñada' ? 'text-brand-green border-brand-green/30 bg-brand-green/10' :
                        isServed ? 'text-pink-400 border-pink-500/40 bg-pink-500/10 shadow-[0_0_10px_rgba(236,72,153,0.1)]' :
                        currentStatus === 'En Servicio' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                        'text-zinc-500 border-zinc-700 bg-zinc-800'
                    }`}>
                        {statusLabel}
                    </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onOpenActions(animal); }}
                    className="p-2 text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-colors"
                >
                    <MoreHorizontal size={18} />
                </button>
            </div>
        </div>
    );
};


interface SireLotDetailPageProps {
    lotId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function SireLotDetailPage({ lotId, navigateTo, onBack }: SireLotDetailPageProps) {
    // Importamos fetchData para forzar recarga
    const { sireLots, fathers, animals, parturitions, serviceRecords, breedingSeasons, updateAnimal, addServiceRecord, startDryingProcess, setLactationAsDry, appConfig, fetchData } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    type ModalType = | 'parturition' | 'abortion' | 'decommission' | 'milkWeighingAction' | 'bodyWeighingAction' | 'logSimpleMilk' | 'logSimpleBody' | 'newMilkSession' | 'newBodySession' | 'bulkWeighing' | 'service' | 'decommissionSheet';
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]);
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal');

    // Lógica de datos
    const lot = useMemo(() => sireLots.find(l => l.id === lotId), [sireLots, lotId]);
    const sire = useMemo(() => {
        if (!lot) return undefined;
        const fatherRef = fathers.find((f: Father) => f.id === lot.sireId);
        if (fatherRef) return { ...fatherRef, isReference: true };
        return animals.find(a => a.id === lot.sireId);
    }, [fathers, animals, lot]);
    const sireName = useMemo(() => sire ? formatAnimalDisplay(sire) : 'Desconocido', [sire]);

    const assignedFemales = useMemo(() => {
        if (!lot) return [];
        return animals
            .filter((animal: Animal) => animal.sireLotId === lot.id && !animal.isReference)
            .sort((a: Animal, b: Animal) => a.id.localeCompare(b.id));
    }, [animals, lot]);

    const filteredFemales = useMemo(() => {
        if (!searchTerm) return assignedFemales;
        const term = searchTerm.toLowerCase();
        return assignedFemales.filter(animal =>
            animal.id.toLowerCase().includes(term) || (animal.name && animal.name.toLowerCase().includes(term))
        );
    }, [assignedFemales, searchTerm]);

    const handleAssignFemales = async (selectedIds: string[]) => {
        if (!lot) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { sireLotId: lot.id, reproductiveStatus: 'En Servicio' });
        });
        await Promise.all(updatePromises);
        setSelectorOpen(false);
    };

    // --- CORRECCIÓN CRÍTICA: Desasignación y Recarga ---
    const handleRemoveFromLot = async () => {
        if (!actionSheetAnimal) return;
        
        // Lógica de estado: Si estaba 'En Servicio' -> 'Vacía'. Si no, se mantiene su estado (ej: Preñada).
        const newStatus = actionSheetAnimal.reproductiveStatus === 'En Servicio' ? 'Vacía' : actionSheetAnimal.reproductiveStatus;
        
        try {
            // 1. Actualizamos la base de datos local
            // Importante: Pasamos 'undefined' casteado o null para borrar el campo
            await updateAnimal(actionSheetAnimal.id, { 
                sireLotId: undefined as any, // Dexie interpreta undefined como "borrar esta clave"
                reproductiveStatus: newStatus 
            });
            
            // 2. Forzamos la recarga de datos desde la DB para que la UI se actualice con la verdad
            // Esto previene que la caché de React muestre datos viejos
            await fetchData(); 
            
            console.log(`Hembra ${actionSheetAnimal.id} removida exitosamente.`);
        } catch (e) {
            console.error("Error al remover hembra:", e);
            alert("Error al eliminar. Por favor intente de nuevo.");
        }

        closeModal();
    };

    // --- ACCIONES DE HOJA ---
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [
            { label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' },
            { label: 'Quitar del Lote', icon: Trash2, onClick: handleRemoveFromLot, color: 'text-brand-red' },
            { label: 'Ver Perfil', icon: Search, onClick: () => navigateTo({ name: 'rebano-profile', animalId: animal.id }) }
        ];
        return actions;
    };

    const handleDeclareService = async (date: Date) => {
        if (!lot || !actionSheetAnimal) return;
        await addServiceRecord({ sireLotId: lot.id, femaleId: actionSheetAnimal.id, serviceDate: date.toISOString().split('T')[0] });
        closeModal();
    };
    
    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); setSessionDate(null); setBulkAnimals([]); setDecommissionReason(null); setIsActionSheetOpen(false); };
    const handleDecommissionSelect = (reason: any) => { setDecommissionReason(reason); setActiveModal('decommission'); };
    
    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!actionSheetAnimal) return;
        const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date };
        if (details.reason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (details.reason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (details.reason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        await updateAnimal(actionSheetAnimal.id, dataToUpdate);
        closeModal();
    };

    const decommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => handleDecommissionSelect('Venta') },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => handleDecommissionSelect('Muerte'), color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => handleDecommissionSelect('Descarte'), color: 'text-brand-red' },
    ];

    const handleOpenActions = (animal: Animal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };
    const handleStartDrying = (parturitionId: string) => { startDryingProcess(parturitionId); closeModal(); };
    const handleSetDry = (parturitionId: string) => { setLactationAsDry(parturitionId); closeModal(); };


    if (!lot) return null;

    return (
        <>
            <div className="w-full max-w-2xl mx-auto h-screen flex flex-col bg-black">
                
                {/* Header */}
                <header className="flex-shrink-0 pt-8 pb-4 px-4 bg-black border-b border-zinc-800 z-20">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                        <div className="text-center">
                            <p className="text-[10px] text-brand-blue font-bold uppercase tracking-wider mb-0.5">Lote de Monta</p>
                            <h1 className="text-lg font-bold text-white truncate max-w-[200px] leading-tight">{sireName}</h1>
                        </div>
                        <button 
                            onClick={() => setSelectorOpen(true)} 
                            className="p-2 -mr-2 bg-brand-blue text-white rounded-lg shadow-lg shadow-blue-900/20 active:scale-90 transition-transform"
                            title="Añadir Hembras"
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* Buscador Integrado */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={`Buscar entre ${assignedFemales.length} hembras...`}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-brand-blue outline-none transition-all placeholder-zinc-600"
                        />
                    </div>
                </header>

                {/* Lista de Hembras */}
                <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 custom-scrollbar">
                    {filteredFemales.length > 0 ? (
                        filteredFemales.map(animal => (
                            <AssignedFemaleCard 
                                key={animal.id} 
                                animal={animal} 
                                services={serviceRecords} // <-- PASAMOS LOS SERVICIOS AQUÍ
                                onClick={() => navigateTo({ name: 'rebano-profile', animalId: animal.id })}
                                onOpenActions={handleOpenActions}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                            <HeartHandshake size={48} className="opacity-20 mb-4" />
                            <p className="text-sm font-medium">No hay hembras asignadas.</p>
                            <button onClick={() => setSelectorOpen(true)} className="mt-3 text-brand-blue font-bold text-xs uppercase tracking-wide hover:underline">
                                + Asignar ahora
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALES --- */}
            
            <AdvancedAnimalSelector
                isOpen={isSelectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleAssignFemales}
                animals={animals}
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                appConfig={appConfig}
                title={`Asignar a ${sireName}`}
                sireIdForInbreedingCheck={lot.sireId}
            />

            <ActionSheetModal
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                title={`Opciones: ${formatAnimalDisplay(actionSheetAnimal)}`}
                actions={getActionsForAnimal(actionSheetAnimal)}
            />
            
            <ActionSheetModal
                isOpen={activeModal === 'decommissionSheet'}
                onClose={closeModal}
                title="Causa de la Baja"
                actions={decommissionActions}
            />

            {actionSheetAnimal && (
                <>
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    
                    {activeModal === 'decommission' && decommissionReason && (
                        <DecommissionAnimalModal
                            isOpen={activeModal === 'decommission'}
                            animal={actionSheetAnimal}
                            onCancel={closeModal}
                            onConfirm={handleDecommissionConfirm}
                            reason={decommissionReason}
                        />
                    )}

                    {activeModal === 'milkWeighingAction' && (<MilkWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date) => handleLogToSession(date, 'leche')} onStartNewSession={() => handleStartNewSession('leche')} onStartDrying={handleStartDrying} onSetDry={handleSetDry} />)}
                    {activeModal === 'bodyWeighingAction' && (<BodyWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date) => handleLogToSession(date, 'corporal')} onStartNewSession={() => handleStartNewSession('corporal')} onSetReadyForMating={handleSetReadyForMating} />)}
                    {activeModal === 'logSimpleMilk' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Pesaje Leche: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="leche" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    {activeModal === 'logSimpleBody' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Peso Corporal: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="corporal" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    {(activeModal === 'newMilkSession' || activeModal === 'newBodySession') && (<NewWeighingSessionFlow weightType={bulkWeightType} onBack={closeModal} onAnimalsSelected={handleAnimalsSelectedForBulk} />)}
                    {activeModal === 'bulkWeighing' && (<Modal isOpen={true} onClose={closeModal} title={`Carga Masiva - ${bulkWeightType === 'leche' ? 'Leche' : 'Corporal'}`} size="fullscreen"><BatchWeighingForm weightType={bulkWeightType} animalsToWeigh={bulkAnimals} onSaveSuccess={handleBulkSaveSuccess} onCancel={closeModal} /></Modal>)}
                </>
            )}
        </>
    );
}
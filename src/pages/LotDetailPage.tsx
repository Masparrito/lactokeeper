// src/pages/LotDetailPage.tsx

import { useState, useMemo, useRef } from 'react'; // React removed
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Edit, Trash2, MoveRight, CheckSquare, Square, Baby, Droplets, Scale, Archive, HeartCrack, Heart } from 'lucide-react';
// Father removed
import { Animal } from '../db/local'; // Parturition IS used via getAnimalStatusObjects
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { TransferAnimalsModal } from '../components/ui/TransferAnimalsModal';
import { formatAge, getAnimalStatusObjects } from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA
import { useVirtualizer } from '@tanstack/react-virtual';
import { SwipeableAnimalCard } from '../components/ui/SwipeableAnimalCard';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
// Import necessary modals
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { MilkWeighingActionModal } from '../components/modals/MilkWeighingActionModal';
import { BodyWeighingActionModal } from '../components/modals/BodyWeighingActionModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal';
import { Modal } from '../components/ui/Modal';
import { LogWeightForm } from '../components/forms/LogWeightForm';
import { BatchWeighingForm } from '../components/forms/BatchWeighingForm';
import { NewWeighingSessionFlow } from './modules/shared/NewWeighingSessionFlow';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
// Status definitions removed
// import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';


// --- SUB-COMPONENTES ---

// Componente para fila de animal seleccionable en modo edición
const SelectableAnimalRow = ({ animal, isSelected, onSelect }: {
    animal: Animal & { formattedAge: string },
    isSelected: boolean,
    onSelect: (id: string) => void
}) => {
    return (
        <div
            onClick={() => onSelect(animal.id)}
            className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border flex justify-between items-center transition-all cursor-pointer min-h-[96px] ${
                isSelected ? 'border-brand-orange ring-2 ring-brand-orange/50' : 'border-brand-border'
            }`}
        >
            <div className="flex items-center gap-4">
                {isSelected ? <CheckSquare className="text-brand-orange flex-shrink-0" size={24} /> : <Square className="text-zinc-500 flex-shrink-0" size={24} />}
                <div>
                    {/* --- USO DE formatAnimalDisplay --- */}
                    <p className="font-bold text-lg text-white">{formatAnimalDisplay(animal)}</p>
                    <p className="text-sm text-zinc-400">
                        {animal.sex} | {animal.formattedAge}
                    </p>
                </div>
            </div>
            {/* Optional ChevronRight */}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function LotDetailPage({ lotName, onBack, navigateTo }: {
    lotName: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}) {
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, updateAnimal, addServiceRecord, startDryingProcess, setLactationAsDry} = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    type ModalType = | 'parturition' | 'abortion' | 'decommission' | 'milkWeighingAction' | 'bodyWeighingAction' | 'logSimpleMilk' | 'logSimpleBody' | 'newMilkSession' | 'newBodySession' | 'bulkWeighing' | 'service';
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]);
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal');

    // Memoizar animales en el lote actual, enriquecidos con datos calculados
    const animalsInLot = useMemo(() => {
        return animals
            .filter((animal: Animal) => (animal.location || 'Sin Asignar') === lotName && !animal.isReference)
            .sort((a: Animal, b: Animal) => a.id.localeCompare(b.id))
            .map((animal: Animal) => ({
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                // Pass parturitions here as it's needed by the function
                statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
            }));
    }, [animals, lotName, parturitions, serviceRecords, sireLots, breedingSeasons]); // Added parturitions dependency

    // Setup para virtualización de la lista
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: animalsInLot.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 104, // Height including padding/gap
        overscan: 5
    });

    // --- Handlers para acciones de edición ---
    const handleToggleAnimalSelection = (animalId: string) => {
        setSelectedAnimals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) newSet.delete(animalId); else newSet.add(animalId);
            return newSet;
        });
    };
    const handleRemoveFromLot = async () => {
        const updatePromises = Array.from(selectedAnimals).map(animalId => updateAnimal(animalId, { location: '' }));
        try { await Promise.all(updatePromises); setIsEditing(false); setSelectedAnimals(new Set()); }
        catch (error) { console.error("Error al quitar animales:", error); }
    };
    const handleAssignAnimals = async (selectedIds: string[]) => {
        if (!lotName) return;
        const updatePromises = selectedIds.map(animalId => updateAnimal(animalId, { location: lotName }));
        await Promise.all(updatePromises);
        setSelectorOpen(false);
    };

    // --- Handlers para acciones individuales (ActionSheet y Modales) ---
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        if (animal.sex === 'Hembra') {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
            if (animal.sireLotId) { actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' }); }
        }
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommission'); }, color: 'text-brand-red' });
        return actions;
    };
    const handleOpenActions = (animal: Animal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };
    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); setSessionDate(null); setBulkAnimals([]); };
    const handleDecommissionConfirm = async (details: DecommissionDetails) => { if (!actionSheetAnimal) return; const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date }; if (details.reason === 'Venta') Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); if (details.reason === 'Muerte') dataToUpdate.deathReason = details.deathReason; if (details.reason === 'Descarte') Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); await updateAnimal(actionSheetAnimal.id, dataToUpdate); closeModal(); };
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };
    const handleDeclareService = async (date: Date) => { if (!actionSheetAnimal || !actionSheetAnimal.sireLotId) { console.error("Missing animal or sireLotId."); closeModal(); return; } await addServiceRecord({ sireLotId: actionSheetAnimal.sireLotId, femaleId: actionSheetAnimal.id, serviceDate: date.toISOString().split('T')[0] }); closeModal(); };

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            {/* Contenedor principal con scroll */}
            <div
                ref={parentRef}
                className="w-full max-w-2xl mx-auto space-y-4 pb-4 animate-fade-in"
                style={{ height: `calc(100vh - 64px - 65px - ${isEditing && selectedAnimals.size > 0 ? '80px' : '0px'})`, overflowY: 'auto' }}
            >
                {/* Cabecera */}
                <header className="flex items-center justify-between pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-lg z-10 border-b border-brand-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{lotName}</h1>
                        <p className="text-lg text-zinc-400">{animalsInLot.length} {animalsInLot.length === 1 ? 'animal' : 'animales'}</p>
                    </div>
                    {isEditing ? (<button onClick={() => { setIsEditing(false); setSelectedAnimals(new Set()); }} className="text-brand-orange font-semibold px-2 py-1">Listo</button>)
                    : (<button onClick={() => setIsEditing(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white"><Edit size={20} /></button>)}
                </header>

                {/* Botón Añadir Animales */}
                {!isEditing && (
                    <div className="px-4 pt-4">
                        <button onClick={() => setSelectorOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"><Plus size={20} /> Añadir Animales</button>
                    </div>
                )}

                 {/* Lista virtualizada de animales */}
                 <div className="pt-4" style={{ height: 'auto', position: 'relative' }}>
                    {animalsInLot.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = animalsInLot[virtualItem.index];
                                return (
                                    <div key={virtualItem.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, padding: '0 1rem 0.5rem 1rem' }}>
                                        {isEditing ? (<SelectableAnimalRow animal={animal} isSelected={selectedAnimals.has(animal.id)} onSelect={handleToggleAnimalSelection} />)
                                        : (<SwipeableAnimalCard animal={animal} onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })} onOpenActions={handleOpenActions} />)}
                                    </div>
                                );
                            })}
                        </div>
                    ) : ( <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4"><p className="text-zinc-500">Este lote está vacío.</p></div> )}
                </div>
            </div> {/* Fin contenedor principal con scroll */}

            {/* Barra de edición */}
            {isEditing && selectedAnimals.size > 0 && (
                <div className="fixed bottom-16 left-0 right-0 bg-ios-modal-bg p-4 border-t border-brand-border animate-slide-up z-20">
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button onClick={handleRemoveFromLot} className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-xl"><Trash2 size={18} /> Quitar del Lote</button>
                        <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-xl"><MoveRight size={18} /> Transferir</button>
                    </div>
                </div>
            )}

            {/* Modales */}
            <AdvancedAnimalSelector isOpen={isSelectorOpen} onClose={() => setSelectorOpen(false)} onSelect={handleAssignAnimals} animals={animals} parturitions={parturitions} serviceRecords={serviceRecords} breedingSeasons={breedingSeasons} sireLots={sireLots} title={`Añadir animales a: ${lotName}`} />
            {/* --- CORRECCIÓN AQUÍ: Prop renombrada a 'fromLot' --- */}
            <TransferAnimalsModal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setIsEditing(false); setSelectedAnimals(new Set()); }} animalsToTransfer={Array.from(selectedAnimals)} fromLot={lotName} />
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)} title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`} actions={getActionsForAnimal(actionSheetAnimal)} />
            {actionSheetAnimal && (
                <>
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'decommission' && <DecommissionAnimalModal animal={actionSheetAnimal} onCancel={closeModal} onConfirm={handleDecommissionConfirm} />}
                     {/* --- CORRECCIÓN AQUÍ: Pasar 'animal' completo --- */}
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
                    {activeModal === 'milkWeighingAction' && <MilkWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date: string) => handleLogToSession(date, 'leche')} onStartNewSession={()=> handleStartNewSession('leche')} onStartDrying={startDryingProcess} onSetDry={setLactationAsDry}/>}
                    {activeModal === 'bodyWeighingAction' && <BodyWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date: string) => handleLogToSession(date, 'corporal')} onStartNewSession={()=> handleStartNewSession('corporal')} onSetReadyForMating={handleSetReadyForMating}/>}
                    {activeModal === 'logSimpleMilk' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Pesaje Leche: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="leche" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    {activeModal === 'logSimpleBody' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Peso Corporal: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="corporal" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    {(activeModal === 'newMilkSession' || activeModal === 'newBodySession') && (<NewWeighingSessionFlow weightType={bulkWeightType} onBack={closeModal} onAnimalsSelected={handleAnimalsSelectedForBulk} />)}
                    {activeModal === 'bulkWeighing' && (<Modal isOpen={true} onClose={closeModal} title={`Carga Masiva - ${bulkWeightType === 'leche' ? 'Leche' : 'Corporal'}`} size="fullscreen"><BatchWeighingForm weightType={bulkWeightType} animalsToWeigh={bulkAnimals} onSaveSuccess={handleBulkSaveSuccess} onCancel={closeModal} /></Modal>)}
                </>
            )}
        </>
    );
}
// src/pages/LotDetailPage.tsx (CORREGIDO - Solapamiento Y Error TS2741)

import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
// --- INICIO CORRECCIÓN: Imports 'Square' y 'CheckSquare' eliminados ---
import { ArrowLeft, Plus, Edit, Trash2, MoveRight, CheckSquare, Square, Baby, Droplets, Scale, Archive, HeartCrack, Heart, DollarSign, Ban } from 'lucide-react';
// --- FIN CORRECCIÓN ---
import { Animal } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { TransferAnimalsModal } from '../components/ui/TransferAnimalsModal';
import { formatAge, getAnimalStatusObjects } from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SwipeableAnimalCard } from '../components/ui/SwipeableAnimalCard';
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
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { STATUS_DEFINITIONS, AnimalStatusKey, getStatusDisplayFlags } from '../hooks/useAnimalStatus';


// --- SUB-COMPONENTES (Sin cambios) ---

const SelectableAnimalRow = ({ animal, isSelected, onSelect }: {
    animal: Animal & { formattedAge: string, statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] },
    isSelected: boolean,
    onSelect: (id: string) => void
}) => {
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        <div
            onClick={() => onSelect(animal.id)}
            className={`w-full text-left bg-c-surface backdrop-blur-xl rounded-2xl p-3 border flex justify-between items-center transition-all cursor-pointer min-h-[80px] ${
                isSelected ? 'border-c-accent ring-2 ring-c-accent/50' : 'border-c-border'
            }`}
        >
            <div className="flex items-center gap-3">
                {isSelected ? <CheckSquare className="text-c-accent flex-shrink-0" size={20} /> : <Square className="text-c-text-faint flex-shrink-0" size={20} />}
                <div className="min-w-0">
                    <p className="font-mono font-semibold text-base text-c-text truncate">{animal.id.toUpperCase()}</p>
                    {formattedName && (
                      <p className="text-sm font-normal text-c-text-strong truncate">{formattedName}</p>
                    )}
                    <div className="text-xs text-c-text-faint mt-1 min-h-[1rem] truncate">
                        <span>{animal.sex} | {animal.formattedAge}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

interface LotDetailPageProps {
    lotName: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export default function LotDetailPage({ 
    lotName, 
    onBack, 
    navigateTo,
    scrollContainerRef
}: LotDetailPageProps) {

    // (CORREGIDO) Extraer 'appConfig' del hook useData
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, updateAnimal, addServiceRecord, startDryingProcess, setLactationAsDry, fathers, appConfig } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    type ModalType = | 'parturition' | 'abortion' | 'decommission' | 'milkWeighingAction' | 'bodyWeighingAction' | 'logSimpleMilk' | 'logSimpleBody' | 'newMilkSession' | 'newBodySession' | 'bulkWeighing' | 'service' | 'decommissionSheet';
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]);
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal');

    // Memoizar animales en el lote actual (Sin cambios)
    const animalsInLot = useMemo(() => {
        const sireLotMap = new Map(sireLots.map(lot => [lot.id, lot]));
        const fatherMap = new Map(fathers.map(father => [father.id, father]));

        return animals
            .filter((animal: Animal) => (animal.location || 'Sin Asignar') === lotName && !animal.isReference)
            .sort((a: Animal, b: Animal) => a.id.localeCompare(b.id))
            .map((animal: Animal) => {
                let sireName: string | undefined = undefined;
                if (animal.sireLotId) {
                    const lot = sireLotMap.get(animal.sireLotId);
                    if (lot) {
                        const father = fatherMap.get(lot.sireId) || animals.find(a => a.id === lot.sireId);
                        sireName = father ? formatAnimalDisplay(father) : undefined;
                    }
                }
                return {
                    ...animal,
                    formattedAge: formatAge(animal.birthDate),
                    // (NOTA: Esta función 'getAnimalStatusObjects' es la obsoleta de 'calculations.ts'.
                    // Pero no causa errores de compilación, así que la dejamos por ahora
                    // para no romper la lógica de 'SwipeableAnimalCard' en esta página)
                    statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
                    sireName
                };
            });
    }, [animals, lotName, parturitions, serviceRecords, sireLots, breedingSeasons, fathers]);

    
    // --- (CORRECCIÓN 1: SOLAPAMIENTO) ---
    const rowVirtualizer = useVirtualizer({
        count: animalsInLot.length,
        getScrollElement: () => scrollContainerRef.current,
        // (CORREGIDO) 96px de tarjeta + 16px (1rem) de padding-bottom = 112px
        estimateSize: () => 112, 
        overscan: 5
    });
    // --- (FIN CORRECCIÓN 1) ---

    // --- Handlers (Sin Cambios) ---
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

    // --- (SIN CAMBIOS) ---
    const handleCardClick = (animalId: string) => {
        if (isEditing) {
            handleToggleAnimalSelection(animalId);
        } else {
            navigateTo({ name: 'rebano-profile', animalId: animalId });
        }
    };
    // --- (SIN CAMBIOS) ---

    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        // Solo vientres aptos (ya parió o alcanza la edad mínima de Configuración)
        // pueden registrar parto/aborto/leche/servicio.
        const { showReproductive } = getStatusDisplayFlags(animal, parturitions, appConfig);
        if (animal.sex === 'Hembra' && showReproductive) {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
            if (animal.sireLotId) { actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' }); }
        }
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommissionSheet'); }, color: 'text-brand-red' });
        return actions;
    };

    const decommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => { setDecommissionReason('Venta'); setActiveModal('decommission'); } },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => { setDecommissionReason('Muerte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => { setDecommissionReason('Descarte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
    ];

    const handleOpenActions = (animal: Animal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };
    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); setSessionDate(null); setBulkAnimals([]); setDecommissionReason(null); setIsActionSheetOpen(false); };
    const handleDecommissionConfirm = async (details: DecommissionDetails) => { if (!actionSheetAnimal) return; const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date }; if (details.reason === 'Venta') Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); if (details.reason === 'Muerte') dataToUpdate.deathReason = details.deathReason; if (details.reason === 'Descarte') Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); await updateAnimal(actionSheetAnimal.id, dataToUpdate); closeModal(); };
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };
    const handleDeclareService = async (date: Date) => { if (!actionSheetAnimal || !actionSheetAnimal.sireLotId) { console.error("Missing animal or sireLotId."); closeModal(); return; } await addServiceRecord({ sireLotId: actionSheetAnimal.sireLotId, femaleId: actionSheetAnimal.id, serviceDate: date.toISOString().split('T')[0] }); closeModal(); };
    
    const handleStartDrying = (parturitionId: string) => { 
        startDryingProcess(parturitionId); 
        closeModal(); 
    };
    const handleSetDry = (parturitionId: string) => { 
        setLactationAsDry(parturitionId); 
        closeModal(); 
    };

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            <div
                className="w-full max-w-2xl mx-auto animate-fade-in"
                style={{ 
                    // 'height' y 'overflow' eliminados
                }}
            >
                <header className="flex items-center justify-between p-4 sticky top-0 bg-c-surface z-10 border-b border-c-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-c-text">{lotName}</h1>
                        <p className="text-lg text-c-text-muted">{animalsInLot.length} {animalsInLot.length === 1 ? 'animal' : 'animales'}</p>
                    </div>
                    {isEditing ? (<button onClick={() => { setIsEditing(false); setSelectedAnimals(new Set()); }} className="text-c-accent font-semibold px-2 py-1">Listo</button>)
                    : (<button onClick={() => setIsEditing(true)} className="p-2 -mr-2 text-c-text-muted hover:text-c-text"><Edit size={20} /></button>)}
                </header>

                {!isEditing && (
                    <div className="px-4 pt-4">
                        <button onClick={() => setSelectorOpen(true)} className="w-full flex items-center justify-center gap-2 bg-c-accent hover:bg-c-accent/90 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"><Plus size={20} /> Añadir Animales</button>
                    </div>
                )}

                 <div className="pt-4" style={{ height: 'auto', position: 'relative' }}>
                    {animalsInLot.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = animalsInLot[virtualItem.index];
                                return (
                                    <div
                                        key={virtualItem.key}
                                        data-index={virtualItem.index}
                                        ref={rowVirtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualItem.start}px)`,
                                            padding: '0 1rem 0.75rem 1rem',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {/* --- INICIO CORRECCIÓN (TS2739) --- */}
                                        {isEditing
                                            ? (<SelectableAnimalRow
                                                animal={animal}
                                                isSelected={selectedAnimals.has(animal.id)}
                                                onSelect={handleToggleAnimalSelection}
                                               />)
                                            : (<SwipeableAnimalCard
                                                animal={animal}
                                                onSelect={handleCardClick} // <-- Lógica de clic unificada
                                                onOpenActions={handleOpenActions}
                                                isSelectionMode={isEditing} // <-- Prop añadido
                                                isSelected={selectedAnimals.has(animal.id)} // <-- Prop añadido
                                               />)
                                        }
                                        {/* --- FIN CORRECCIÓN --- */}
                                    </div>
                                );
                            })}
                        </div>
                    ) : ( <div className="text-center py-10 bg-c-surface rounded-2xl mx-4"><p className="text-c-text-faint">Este lote está vacío.</p></div> )}
                </div>
            </div>

            {/* Barra de edición: se ancla justo encima de la barra de navegación (60px + safe-area) para no quedar cortada. */}
            {isEditing && selectedAnimals.size > 0 && (
                <div
                    className="fixed left-0 right-0 bg-c-surface p-4 border-t border-c-border animate-slide-up z-40"
                    style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button onClick={handleRemoveFromLot} className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-xl"><Trash2 size={18} /> Quitar del Lote</button>
                        <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-c-accent-sky text-white font-bold py-3 rounded-xl"><MoveRight size={18} /> Transferir</button>
                    </div>
                </div>
            )}

            {/* Modales (Sin cambios) */}
            
            {/* --- (CORRECCIÓN 2: TS2741) --- */}
            {/* Añadir la prop 'appConfig' que ahora es requerida */}
            <AdvancedAnimalSelector 
                isOpen={isSelectorOpen} 
                onClose={() => setSelectorOpen(false)} 
                onSelect={handleAssignAnimals} 
                animals={animals} 
                parturitions={parturitions} 
                serviceRecords={serviceRecords} 
                breedingSeasons={breedingSeasons} 
                sireLots={sireLots} 
                title={`Añadir animales a: ${lotName}`}
                appConfig={appConfig} // <-- PROP AÑADIDA
            />
            {/* --- (FIN CORRECCIÓN 2) --- */}

            <TransferAnimalsModal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setIsEditing(false); setSelectedAnimals(new Set()); }} animalsToTransfer={Array.from(selectedAnimals)} fromLot={lotName} />
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)} title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`} actions={getActionsForAnimal(actionSheetAnimal)} />
            
            <ActionSheetModal
                isOpen={activeModal === 'decommissionSheet'}
                onClose={closeModal}
                title="Causa de la Baja"
                actions={decommissionActions}
            />

            {actionSheetAnimal && (
                <>
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

                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
                    {activeModal === 'milkWeighingAction' && <MilkWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date: string) => handleLogToSession(date, 'leche')} onStartNewSession={()=> handleStartNewSession('leche')} onStartDrying={handleStartDrying} onSetDry={handleSetDry}/>}
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
// src/pages/LotDetailPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Edit, Trash2, MoveRight, CheckSquare, Square, Baby, Droplets, Scale, Archive, HeartCrack } from 'lucide-react';
import { Animal, Parturition, ServiceRecord, BreedingSeason, SireLot } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { TransferAnimalsModal } from '../components/ui/TransferAnimalsModal';
import { formatAge } from '../utils/calculations';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SwipeableAnimalCard } from '../components/ui/SwipeableAnimalCard';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { AddMilkWeighingModal } from '../components/modals/AddMilkWeighingModal';
import { AddBodyWeighingModal } from '../components/modals/AddBodyWeighingModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';

const getAnimalStatusObjects = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allSireLots: SireLot[], allBreedingSeasons: BreedingSeason[]): (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] => {
    const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
    if (!animal) return [];
    if (animal.sex === 'Hembra') {
        const lastParturition = allParturitions.filter(p => p.goatId === animal.id && p.status !== 'finalizada').sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
        if (lastParturition) {
            if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
            else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
            else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
        }
    }
    if (animal.reproductiveStatus === 'Preñada') activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
    else if (animal.reproductiveStatus === 'En Servicio') {
        const hasServiceRecord = allServiceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
        if (hasServiceRecord) activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
        else activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
    }
    else if (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') { activeStatuses.push(STATUS_DEFINITIONS.EMPTY); }
    if (animal.sex === 'Macho') {
        const activeSeasons = allBreedingSeasons.filter(bs => bs.status === 'Activo');
        const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
        const isActiveSire = allSireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
        if(isActiveSire) activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
    }
    return Array.from(new Set(activeStatuses));
};

const SelectableAnimalRow = ({ animal, isSelected, onSelect }: { animal: any, isSelected: boolean, onSelect: (id: string) => void }) => {
    return (
        <div 
            onClick={() => onSelect(animal.id)} 
            className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border flex justify-between items-center transition-all cursor-pointer ${isSelected ? 'border-brand-orange ring-2 ring-brand-orange/50' : 'border-brand-border'}`}
        >
            <div className="flex items-center gap-4">
                {isSelected ? <CheckSquare className="text-brand-orange flex-shrink-0" size={24} /> : <Square className="text-zinc-500 flex-shrink-0" size={24} />}
                <div>
                    <p className="font-bold text-lg text-white">{animal.id}</p>
                    <p className="text-sm text-zinc-400">
                        {animal.sex} | {animal.formattedAge}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function LotDetailPage({ lotName, onBack, navigateTo }: { lotName: string; onBack: () => void; navigateTo: (page: PageState) => void; }) {
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, updateAnimal } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'parturition' | 'milkWeighing' | 'bodyWeighing' | 'decommission' | 'abortion' | null>(null);

    const animalsInLot = useMemo(() => {
        return animals
            .filter(animal => (animal.location || 'Sin Asignar') === lotName)
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(animal => ({
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
            }));
    }, [animals, lotName, parturitions, serviceRecords, sireLots, breedingSeasons]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({ count: animalsInLot.length, getScrollElement: () => parentRef.current, estimateSize: () => 92, overscan: 5 });

    const handleToggleAnimalSelection = (animalId: string) => {
        setSelectedAnimals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) { newSet.delete(animalId); } else { newSet.add(animalId); }
            return newSet;
        });
    };

    const handleRemoveFromLot = async () => {
        const updatePromises = Array.from(selectedAnimals).map(animalId => updateAnimal(animalId, { location: '' }));
        try {
            await Promise.all(updatePromises);
            setIsEditing(false);
            setSelectedAnimals(new Set());
        } catch (error) { console.error("Error al quitar animales del lote:", error); }
    };

    const handleAssignAnimals = async (selectedIds: string[]) => {
        if (!lotName) return;
        const updatePromises = selectedIds.map(animalId => updateAnimal(animalId, { location: lotName }));
        await Promise.all(updatePromises);
        setSelectorOpen(false);
    };
    
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        if (animal.sex === 'Hembra') {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighing'); }});
        }
        actions.push({ label: 'Agregar Peso Corporal', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighing'); }});
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommission'); }, color: 'text-brand-red' });
        return actions;
    };
    
    const handleOpenActions = (animal: Animal) => {
        setActionSheetAnimal(animal);
        setIsActionSheetOpen(true);
    };

    const closeModal = () => {
        setActiveModal(null);
        setActionSheetAnimal(null);
    };

    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!actionSheetAnimal) return;
        const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date };
        if (details.reason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (details.reason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (details.reason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        await updateAnimal(actionSheetAnimal.id, dataToUpdate);
        closeModal();
    };
    
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-24 animate-fade-in">
                <header className="flex items-center justify-between pt-8 pb-4 px-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{lotName}</h1>
                        <p className="text-lg text-zinc-400">{animalsInLot.length} {animalsInLot.length === 1 ? 'animal' : 'animales'}</p>
                    </div>
                    {isEditing ? (
                        <button onClick={() => { setIsEditing(false); setSelectedAnimals(new Set()); }} className="text-brand-orange font-semibold px-2 py-1">Listo</button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white"><Edit size={20} /></button>
                    )}
                </header>

                {!isEditing && (
                    <div className="px-4">
                        <button onClick={() => setSelectorOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"><Plus size={20} /> Añadir Animales</button>
                    </div>
                )}
                
                <div ref={parentRef} className="pt-4" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    {animalsInLot.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = animalsInLot[virtualItem.index];
                                return (
                                    <div key={virtualItem.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, padding: '0 1rem 0.5rem 1rem' }}>
                                        {isEditing ? (
                                            <SelectableAnimalRow
                                                animal={animal}
                                                isSelected={selectedAnimals.has(animal.id)}
                                                onSelect={handleToggleAnimalSelection}
                                            />
                                        ) : (
                                            <SwipeableAnimalCard 
                                                animal={animal} 
                                                onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })}
                                                onOpenActions={handleOpenActions}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-500">Este lote está vacío.</p>
                        </div>
                    )}
                </div>
            </div>

            {isEditing && selectedAnimals.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md p-4 border-t border-brand-border animate-slide-up z-20">
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button onClick={handleRemoveFromLot} className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-xl"><Trash2 size={18} /> Quitar del Lote</button>
                        <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-xl"><MoveRight size={18} /> Transferir</button>
                    </div>
                </div>
            )}

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
            />
            <TransferAnimalsModal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setIsEditing(false); setSelectedAnimals(new Set()); }} animalsToTransfer={Array.from(selectedAnimals)} fromLot={lotName} />

            <ActionSheetModal 
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                title={`Acciones para ${actionSheetAnimal?.id || ''}`}
                actions={getActionsForAnimal(actionSheetAnimal)}
            />

            {actionSheetAnimal && (
                <>
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'milkWeighing' && <AddMilkWeighingModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'bodyWeighing' && <AddBodyWeighingModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'decommission' && <DecommissionAnimalModal animal={actionSheetAnimal} onCancel={closeModal} onConfirm={handleDecommissionConfirm} />}
                </>
            )}
        </>
    );
}
// src/pages/SireLotDetailPage.tsx

import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Search, Heart, Baby, Droplets, Scale, Archive, HeartCrack, DollarSign, Ban } from 'lucide-react';
import { Animal, ServiceRecord, Parturition, BreedingSeason, SireLot, Father } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { formatAge } from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
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
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';


// --- Lógica de cálculo de estado (REUTILIZADA) ---
const getAnimalStatusObjects = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allSireLots: SireLot[], allBreedingSeasons: BreedingSeason[]): (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] => {
    if (!animal || animal.status !== 'Activo' || animal.isReference) {
        return [];
    }
    const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
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
    const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
    return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean);
};


interface SireLotDetailPageProps {
    lotId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function SireLotDetailPage({ lotId, navigateTo, onBack }: SireLotDetailPageProps) {
    const { sireLots, fathers, animals, parturitions, serviceRecords, breedingSeasons, updateAnimal, addServiceRecord, startDryingProcess, setLactationAsDry } = useData();
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


    // Encontrar el lote y el semental
    const lot = useMemo(() => sireLots.find(l => l.id === lotId), [sireLots, lotId]);
    const sire = useMemo(() => {
        if (!lot) return undefined;
        const fatherRef = fathers.find((f: Father) => f.id === lot.sireId);
        if (fatherRef) return { ...fatherRef, isReference: true };
        return animals.find(a => a.id === lot.sireId);
    }, [fathers, animals, lot]);
    const sireName = useMemo(() => sire ? formatAnimalDisplay(sire) : 'Desconocido', [sire]);

    // Encontrar hembras asignadas
    const assignedFemales = useMemo(() => {
        if (!lot) return [];
        return animals
            .filter((animal: Animal) => animal.sireLotId === lot.id && !animal.isReference)
            .sort((a: Animal, b: Animal) => a.id.localeCompare(b.id))
            .map((animal: Animal) => {
                 return {
                    ...animal,
                    formattedAge: formatAge(animal.birthDate),
                    statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
                 };
            });
    }, [animals, lot, parturitions, serviceRecords, sireLots, breedingSeasons]);

    // Filtrar hembras por búsqueda
    const filteredFemales = useMemo(() => {
        if (!searchTerm) return assignedFemales;
        const term = searchTerm.toLowerCase();
        return assignedFemales.filter(animal =>
            formatAnimalDisplay(animal).toLowerCase().includes(term)
        );
    }, [assignedFemales, searchTerm]);

    // Asignar hembras al lote (sin cambios)
    const handleAssignFemales = async (selectedIds: string[]) => {
        if (!lot) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { sireLotId: lot.id, reproductiveStatus: 'En Servicio' });
        });
        await Promise.all(updatePromises);
        setSelectorOpen(false);
    };

    // Declarar servicio (sin cambios)
    const handleDeclareService = async (date: Date) => {
        if (!lot || !actionSheetAnimal) return;
        await addServiceRecord({
            sireLotId: lot.id,
            femaleId: actionSheetAnimal.id,
            serviceDate: date.toISOString().split('T')[0]
        });
        closeModal();
    };

    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' });
        actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
        actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
        actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommissionSheet'); }, color: 'text-brand-red' });
        return actions;
    };

    const decommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => { setDecommissionReason('Venta'); setActiveModal('decommission'); } },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => { setDecommissionReason('Muerte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => { setDecommissionReason('Descarte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
    ];

    const handleOpenActions = (animal: Animal) => {
        setActionSheetAnimal(animal);
        setIsActionSheetOpen(true);
    };

    const closeModal = () => {
        setActiveModal(null);
        setActionSheetAnimal(null);
        setSessionDate(null);
        setBulkAnimals([]);
        setDecommissionReason(null);
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
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };


    if (!lot) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Lote de Reproductor no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                {/* Cabecera */}
                <header className="flex items-center justify-between pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-lg z-10 border-b border-brand-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-white truncate">
                            Lote: <span className="font-mono">{sireName}</span>
                        </h1>
                        <p className="text-xs text-zinc-400 truncate">Reproductor: {sire ? formatAnimalDisplay(sire) : 'Desconocido'}</p>
                    </div>
                    <button onClick={() => setSelectorOpen(true)} className="p-2 -mr-2 bg-brand-orange hover:bg-orange-600 text-white rounded-full transition-colors">
                        <Plus size={24} />
                    </button>
                </header>

                {/* Contenido (lista de hembras) */}
                <div className="space-y-4 pt-4 px-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-zinc-300">Hembras Asignadas ({filteredFemales.length})</h3>
                        <div className="relative w-40">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar ID o Nombre..."
                                className="w-full bg-zinc-800/80 rounded-lg pl-8 pr-2 py-1 text-white border-transparent focus:border-brand-amber focus:ring-0 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {filteredFemales.length > 0 ? (
                            filteredFemales.map(animal => (
                                <SwipeableAnimalCard
                                    key={animal.id}
                                    animal={animal}
                                    onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })}
                                    onOpenActions={handleOpenActions}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 bg-brand-glass rounded-2xl">
                                <p className="text-zinc-500">{searchTerm ? 'No se encontraron coincidencias.' : 'Aún no has asignado hembras a este lote.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Modales --- */}
            {/* Modal para añadir hembras */}
            <AdvancedAnimalSelector
                isOpen={isSelectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleAssignFemales}
                animals={animals}
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                title={`Asignar Hembras al Lote de ${sireName}`}
                sireIdForInbreedingCheck={lot.sireId}
                // --- CAMBIO: filterReproductiveStatus eliminado ---
            />

            {/* ActionSheet para acciones individuales */}
            <ActionSheetModal
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`}
                actions={getActionsForAnimal(actionSheetAnimal)}
            />
            
            <ActionSheetModal
                isOpen={activeModal === 'decommissionSheet'}
                onClose={closeModal}
                title="Causa de la Baja"
                actions={decommissionActions}
            />

            {/* Modales de acciones */}
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

                    {activeModal === 'milkWeighingAction' && (<MilkWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date) => handleLogToSession(date, 'leche')} onStartNewSession={() => handleStartNewSession('leche')} onStartDrying={startDryingProcess} onSetDry={setLactationAsDry} />)}
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
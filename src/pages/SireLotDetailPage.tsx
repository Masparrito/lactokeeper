// src/pages/SireLotDetailPage.tsx

import { useState, useMemo } from 'react'; // React import needed
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Search, Heart, Baby, Droplets, Scale, Archive, HeartCrack } from 'lucide-react';
// Importamos todos los tipos necesarios
import { Animal, ServiceRecord, Parturition, BreedingSeason, SireLot } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { formatAge } from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { SwipeableAnimalCard } from '../components/ui/SwipeableAnimalCard';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
// Import all necessary modals
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { AddBodyWeighingModal } from '../components/modals/AddBodyWeighingModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal';
// Import status definitions
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';

// --- Lógica de cálculo de estado (ACTUALIZADA para priorizar STATUS) ---
// NOTA: Esta función YA prioriza el status de Venta/Muerte/Descarte/Referencia.
const getAnimalStatusObjects = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allSireLots: SireLot[], allBreedingSeasons: BreedingSeason[]): (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] => {
    const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
    if (!animal) return [];

    // --- CORRECCIÓN CRÍTICA (YA IMPLEMENTADA): Priorizar estatus de Referencia/Baja ---
    if (animal.status !== 'Activo') {
        // Intenta obtener el statusKey directamente ('Venta', 'Muerte', 'Descarte'). Si no existe, podría ser 'Referencia'.
        let statusKey = animal.status.toUpperCase() as AnimalStatusKey;
        // Si el animal es de referencia Y no tiene un status específico de baja, usa 'REFERENCE'
        if (animal.isReference && !['VENTA', 'MUERTE', 'DESCARTE'].includes(statusKey)) {
        }

        if (STATUS_DEFINITIONS[statusKey]) {
            activeStatuses.push(STATUS_DEFINITIONS[statusKey]);
        }
    }
    // Si el animal está dado de baja o es referencia, no seguir con el cálculo reproductivo/productivo
    if (activeStatuses.length > 0 && activeStatuses.some(s => ['VENTA', 'MUERTE', 'DESCARTE', 'REFERENCE'].includes(s.key))) {
        const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
        return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean); // Filtrar nulos si 'REFERENCE' no existe
    }

    // Lógica Reproductiva/Productiva (Solo si está Activo y no es Referencia)
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
    return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean); // Filtrar nulos
};


interface SireLotDetailPageProps {
    lotId: string;
    navigateTo: (page: PageState) => void;
    onBack: () => void;
}

export default function SireLotDetailPage({ lotId, navigateTo, onBack }: SireLotDetailPageProps) {
    const { sireLots, fathers, animals, parturitions, serviceRecords, breedingSeasons, updateAnimal, addServiceRecord } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'parturition' | 'milkWeighing' | 'bodyWeighing' | 'decommission' | 'service' | 'abortion' | null>(null);

    // Encontrar el lote y el semental
    const lot = useMemo(() => sireLots.find(l => l.id === lotId), [sireLots, lotId]);
    const sire = useMemo(() => fathers.find(f => f.id === lot?.sireId), [fathers, lot]);
    const sireName = useMemo(() => sire ? formatAnimalDisplay(sire) : 'Desconocido', [sire]);

    // Encontrar hembras asignadas
    const assignedFemales = useMemo(() => {
        if (!lot) return [];
        return animals
            .filter((animal: Animal) => animal.sireLotId === lot.id)
            .sort((a: Animal, b: Animal) => a.id.localeCompare(b.id))
            .map((animal: Animal) => ({
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons), // Usa la función corregida
            }));
    }, [animals, lot, parturitions, serviceRecords, sireLots, breedingSeasons]);

    // Filtrar hembras por búsqueda
    const filteredFemales = useMemo(() => {
        if (!searchTerm) return assignedFemales;
        return assignedFemales.filter(animal =>
            animal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [assignedFemales, searchTerm]);

    // Asignar hembras al lote
    const handleAssignFemales = async (selectedIds: string[]) => {
        if (!lot) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { sireLotId: lot.id, reproductiveStatus: 'En Servicio' });
        });
        await Promise.all(updatePromises);
        setSelectorOpen(false);
    };

    // Declarar servicio
    const handleDeclareService = async (date: Date) => {
        if (!lot || !actionSheetAnimal) return;
        await addServiceRecord({
            sireLotId: lot.id,
            femaleId: actionSheetAnimal.id,
            serviceDate: date.toISOString().split('T')[0]
        });
        closeModal();
    };

    // Obtener acciones para el ActionSheet
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' });
        actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
        actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
        actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighing'); }});
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

    // Confirmar baja
    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!actionSheetAnimal) return;
        const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date };
        if (details.reason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (details.reason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (details.reason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        await updateAnimal(actionSheetAnimal.id, dataToUpdate);
        closeModal();
    };

    // Si el lote no se encuentra
    if (!lot) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Lote de Reproductor no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            {/* Contenedor principal */}
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                {/* Cabecera */}
                <header className="flex items-center justify-between pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-lg z-10 border-b border-brand-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        {/* Título y Subtítulo usan formatAnimalDisplay */}
                        <h1 className="text-xl font-bold tracking-tight text-white truncate">Lote: {sireName}</h1>
                        <p className="text-xs text-zinc-400 truncate">Reproductor: {formatAnimalDisplay(sire)}</p>
                    </div>
                    {/* Botón Añadir Hembras */}
                    <button onClick={() => setSelectorOpen(true)} className="p-2 -mr-2 bg-brand-orange hover:bg-orange-600 text-white rounded-full transition-colors">
                        <Plus size={24} />
                    </button>
                </header>

                {/* Contenido (lista de hembras) */}
                <div className="space-y-4 pt-4 px-4">
                    {/* Cabecera de la lista con búsqueda */}
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
                    {/* Lista de hembras */}
                    <div className="space-y-2">
                        {filteredFemales.length > 0 ? (
                            filteredFemales.map(animal => (
                                <SwipeableAnimalCard
                                    key={animal.id}
                                    animal={animal} // Pasar el objeto animal completo
                                    onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })}
                                    onOpenActions={handleOpenActions}
                                />
                            ))
                        ) : (
                            // Mensaje si no hay hembras
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
            />

            {/* ActionSheet para acciones individuales */}
            <ActionSheetModal
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`}
                actions={getActionsForAnimal(actionSheetAnimal)}
            />

            {/* Modales de acciones (solo se renderizan si hay un animal seleccionado) */}
            {actionSheetAnimal && (
                <>
                    {/* CORRECCIÓN FINAL: Pasar 'animal' completo a DeclareServiceModal */}
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {/* USO DE formatAnimalDisplay en títulos de modales */}
                    {activeModal === 'bodyWeighing' && <AddBodyWeighingModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'decommission' && <DecommissionAnimalModal animal={actionSheetAnimal} onCancel={closeModal} onConfirm={handleDecommissionConfirm} />}
                </>
            )}
        </>
    );
}
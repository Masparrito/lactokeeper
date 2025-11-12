// src/pages/HerdPage.tsx (CORREGIDO - V3 - Discrepancia KPI)

import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { 
    Settings, History, FilterX, ChevronDown, Users, FileArchive, Baby, Scale, Move, Archive, 
    Droplets, HeartCrack, Heart, RefreshCw, Trash2, DollarSign, Ban, 
    ListChecks, X, Edit
} from 'lucide-react';
import type { PageState } from '../types/navigation';
// (CORREGIDO) Tipos no usados eliminados (Soluciona TS6133)
import { Animal, Lot } from '../db/local'; 
// (CORREGIDO) 'calculateAgeInMonths' eliminado de la importación (Soluciona TS2724)
import { formatAge, getAnimalZootecnicCategory, calculateAgeInDays } from '../utils/calculations'; 
import { formatAnimalDisplay } from '../utils/formatting';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { DeclareAbortionModal } from '../components/modals/DeclareAbortionModal';
import { MilkWeighingActionModal } from '../components/modals/MilkWeighingActionModal';
import { BodyWeighingActionModal } from '../components/modals/BodyWeighingActionModal';
import { LogWeightForm } from '../components/forms/LogWeightForm';
import { NewWeighingSessionFlow } from './modules/shared/NewWeighingSessionFlow';
import { BatchWeighingForm } from '../components/forms/BatchWeighingForm';
import { Modal } from '../components/ui/Modal';
import { DeclareServiceModal } from '../components/modals/DeclareServiceModal';
import { SwipeableAnimalCard } from '../components/ui/SwipeableAnimalCard';
import { DEFAULT_CONFIG } from '../types/config'; 


// (NUEVO) Helper local para 'calculateAgeInMonths' (Soluciona TS2724)
const calculateAgeInMonths = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 0;
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
};


// --- (CORREGIDO) ELIMINAR TODA LA FUNCIÓN LOCAL 'getAnimalStatusObjects' ---
// La función obsoleta que estaba aquí ha sido eliminada.


// --- Lógica de Filtro (SIN CAMBIOS) ---
const ZOOTECNIC_CATEGORIES = ['Cabrita', 'Cabritona', 'Cabra', 'Cabrito', 'Macho de Levante', 'Reproductor'];
// ... (El resto de 'FilterBar' y 'BatchMoveModal' no cambian) ...
type FilterItem = { key: string, label: string, Icon?: React.ElementType };

const FilterBar = ({ title, filters, activeFilter, onFilterChange }: {
    title?: string, filters: FilterItem[], activeFilter: string, onFilterChange: (key: string) => void
}) => (
    <div>
        {title && <label className="block text-sm font-semibold text-zinc-400 mb-2">{title}</label>}
        <div className="flex flex-wrap gap-2">
            <button onClick={() => onFilterChange('ALL')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === 'all' || activeFilter === 'ALL' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Todos</button>
            {filters.map(f => {
                const Icon = f.Icon || null;
                return ( <button key={f.key} onClick={() => onFilterChange(f.key)} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === f.key ? 'bg-brand-green text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>{Icon && <Icon size={14} />}{f.label}</button> );
            })}
        </div>
    </div>
);
const BatchMoveModal = ({ isOpen, onClose, onConfirm, lots }: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (destinationLot: string) => void,
    lots: Lot[]
}) => {
    const [selectedLot, setSelectedLot] = useState('');
    const handleConfirmClick = () => { onConfirm(selectedLot); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mover Animales en Lote">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar lote de destino</label>
                    <div className="flex items-center gap-2">
                        <select 
                            value={selectedLot} 
                            onChange={(e) => setSelectedLot(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-orange"
                        >
                            <option value="">Sin Asignar</option>
                            {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                    <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                    <button 
                        onClick={handleConfirmClick} 
                        disabled={!selectedLot}
                        className="px-5 py-2 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
                    >
                        Mover
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL ---
interface HerdPageProps {
    navigateTo: (page: PageState) => void;
    onBack: () => void;
    locationFilter?: string;
    kpiFilter?: 'all' | 'females' | 'vientres' | 'Cabra' | 'Cabritona' | 'Crias' | 'Reproductor';
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    
    filterStates: {
        viewMode: 'Activos' | 'Referencia';
        categoryFilter: string;
        productiveFilter: string;
        reproductiveFilter: string;
        decommissionFilter: 'all' | 'Venta' | 'Muerte' | 'Descarte';
    };
    filterSetters: {
        setViewMode: React.Dispatch<React.SetStateAction<'Activos' | 'Referencia'>>;
        setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
        setProductiveFilter: React.Dispatch<React.SetStateAction<string>>;
        setReproductiveFilter: React.Dispatch<React.SetStateAction<string>>;
        setDecommissionFilter: React.Dispatch<React.SetStateAction<'all' | 'Venta' | 'Muerte' | 'Descarte'>>;
    };
}

export default function HerdPage({ 
    navigateTo, 
    locationFilter, 
    kpiFilter, 
    scrollContainerRef,
    filterStates,
    filterSetters
}: HerdPageProps) {
    const { animals, lots, parturitions, serviceRecords, breedingSeasons, sireLots, isLoading, updateAnimal, startDryingProcess, setLactationAsDry, addServiceRecord, fathers, deleteAnimalPermanently, appConfig, bodyWeighings } = useData();
    
    // ... (Estados de Modales, Flujo, Filtro, UI y Selección Múltiple SIN CAMBIOS) ...
    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    type ModalType = | 'parturition' | 'abortion' | 'decommission' | 'milkWeighingAction' | 'bodyWeighingAction' | 'logSimpleMilk' | 'logSimpleBody' | 'newMilkSession' | 'newBodySession' | 'bulkWeighing' | 'service' | 'decommissionSheet';
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]);
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal');
    const { 
        viewMode, 
        categoryFilter, 
        productiveFilter, 
        reproductiveFilter, 
        decommissionFilter 
    } = filterStates;
    const {
        setViewMode,
        setCategoryFilter,
        setProductiveFilter,
        setReproductiveFilter,
        setDecommissionFilter
    } = filterSetters;
    const [isLatestFilterActive, setIsLatestFilterActive] = useState(false);
    const [productiveFiltersVisible, setProductiveFiltersVisible] = useState(false);
    const [reproductiveFiltersVisible, setReproductiveFiltersVisible] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isBatchActionSheetOpen, setIsBatchActionSheetOpen] = useState(false);
    const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
    const [batchDecommissionReason, setBatchDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
    
    const isKpiView = useMemo(() => !!kpiFilter && kpiFilter !== 'all', [kpiFilter]);
    
    const pageContentRef = useRef<HTMLDivElement>(null);

    // --- (SIN CAMBIOS) ---
    // Este 'useMemo' ahora calcula TANTO la categoría zootécnica COMO
    // los objetos de estado, usando la lógica centralizada y el 'appConfig'.
    // Esto soluciona todos los bugs de filtros e íconos.
    const animalsWithAllData = useMemo(() => {
        const sireLotMap = new Map(sireLots.map(lot => [lot.id, lot]));
        const fatherMap = new Map(fathers.map(father => [father.id, father]));
        
        // Configuración para la lógica de estado
        const config = appConfig || DEFAULT_CONFIG;
        let minVientreAge = config.edadMinimaVientreMeses;
        if (!minVientreAge || minVientreAge < 6) {
            minVientreAge = DEFAULT_CONFIG.edadMinimaVientreMeses; // 10
        }
        const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');
        const activeSeasonIds = new Set(activeSeasons.map(s => s.id));

        return animals.map(animal => {
            let sireName: string | undefined = undefined;
            if (animal.sireLotId) {
                const lot = sireLotMap.get(animal.sireLotId);
                if (lot) {
                    const father = fatherMap.get(lot.sireId) || animals.find(a => a.id === lot.sireId);
                    sireName = father ? formatAnimalDisplay(father) : undefined;
                }
            }
            
            // --- Lógica de StatusObjects (copiada de useAnimalStatus) ---
            const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
            if (animal.sex === 'Macho') {
                const isActiveSire = sireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
                if (isActiveSire) activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
            } 
            else if (animal.sex === 'Hembra') {
                const animalParturitions = parturitions
                    .filter(p => p.goatId === animal.id)
                    .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
                const lastParturition = animalParturitions[0];
                const hasCalved = animalParturitions.length > 0;

                // 1. Estado Lactancia
                if (lastParturition) {
                    if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
                    else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
                    else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
                }

                // 2. Lógica de "Vientre"
                // (CORREGIDO) 'calculateAgeInMonths' ahora usa la función local
                const ageInMonths = calculateAgeInMonths(animal.birthDate);
                const isVientre = hasCalved || (ageInMonths >= minVientreAge);

                // 3. Estado Reproductivo
                let isPregnantOrConfirmed = false;
                let isJustInService = false;

                if (animal.reproductiveStatus === 'Preñada') {
                    activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
                    isPregnantOrConfirmed = true;
                } else if (animal.reproductiveStatus === 'En Servicio') {
                    const hasServiceRecord = serviceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
                    if (hasServiceRecord) {
                        activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
                        isPregnantOrConfirmed = true;
                    } else {
                        activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
                        isJustInService = true;
                    }
                }
                
                // 4. Lógica de "Vacía"
                if (isVientre && !isPregnantOrConfirmed && !isJustInService) {
                    activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
                }
            }
            // --- Fin Lógica de StatusObjects ---

            return {
                ...animal,
                // 'statusObjects' ahora se calcula con la lógica correcta
                statusObjects: Array.from(new Set(activeStatuses.map(s => s.key)))
                                  .map(key => STATUS_DEFINITIONS[key as AnimalStatusKey])
                                  .filter(Boolean),
                
                formattedAge: formatAge(animal.birthDate),
                
                // 'zootecnicCategory' ahora usa appConfig (Soluciona bug de filtro)
                zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions, appConfig),
                
                sireName
            };
        });
    // (SIN CAMBIOS) Dependencias
    }, [animals, parturitions, sireLots, breedingSeasons, fathers, appConfig, serviceRecords]);


    // --- (INICIO CORRECCIÓN DISCREPANCIA KPI) ---
    const filteredByUI = useMemo(() => {
        // (CORREGIDO) La 'baseList' para 'Activos' ahora también filtra por 'status === "Activo"',
        // igualando la lógica del KPI en 'useHerdAnalytics.ts'.
        let baseList = viewMode === 'Activos'
            ? animalsWithAllData.filter(a => !a.isReference && a.status === 'Activo') 
            : animalsWithAllData.filter(a => a.isReference);
    // --- (FIN CORRECCIÓN DISCREPANCIA KPI) ---
        
        if (kpiFilter) {
            // Cuando 'kpiFilter' está activo, 'viewMode' es 'Activos' por defecto.
            // 'baseList' ya está filtrada por 'status === "Activo"',
            // por lo que los siguientes filtros darán el conteo correcto.
            if (kpiFilter === 'females') {
                baseList = baseList.filter(a => a.sex === 'Hembra');
            
            } else if (kpiFilter === 'vientres') {
                const edadVientreMeses = appConfig.edadPrimerServicioMeses > 0 ? appConfig.edadPrimerServicioMeses : 11;
                const pesoVientreKg = appConfig.pesoPrimerServicioKg > 0 ? appConfig.pesoPrimerServicioKg : 30;
                const edadVientreDias = edadVientreMeses * 30.44;

                baseList = baseList.filter(hembra => {
                    if (hembra.sex !== 'Hembra') return false;
                    const category = hembra.zootecnicCategory; 
                    if (category === 'Cabra') return true;
                    if (category === 'Cabrita') return false;
                    if (category === 'Cabritona') {
                        const ageInDays = calculateAgeInDays(hembra.birthDate);
                        if (ageInDays < edadVientreDias) return false;
                        if (pesoVientreKg > 0) {
                            const lastWeight = bodyWeighings
                                .filter(bw => bw.animalId === hembra.id)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            if (!lastWeight || lastWeight.kg < pesoVientreKg) return false;
                        }
                        return true;
                    }
                    return false;
                });

            } else if (kpiFilter === 'Cabra') {
                baseList = baseList.filter(a => a.zootecnicCategory === 'Cabra');
            } else if (kpiFilter === 'Cabritona') {
                baseList = baseList.filter(a => a.zootecnicCategory === 'Cabritona');
            } else if (kpiFilter === 'Crias') {
                baseList = baseList.filter(a => a.zootecnicCategory === 'Cabrita' || a.zootecnicCategory === 'Cabrito');
            } else if (kpiFilter === 'Reproductor') {
                baseList = baseList.filter(a => a.zootecnicCategory === 'Reproductor');
            }
        }

        if (!isKpiView) {
            if (locationFilter) { baseList = baseList.filter(animal => (animal.location || 'Sin Asignar') === locationFilter); }
            if (isLatestFilterActive) { return baseList.sort((a, b) => (b.endDate ? new Date(b.endDate).getTime() : b.createdAt || 0) - (a.endDate ? new Date(a.endDate).getTime() : a.createdAt || 0)).slice(0, 25); }
            
            if (viewMode === 'Activos') {
                if (productiveFilter !== 'ALL') { baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === productiveFilter)); }
                if (reproductiveFilter !== 'ALL') { baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === reproductiveFilter)); }
            } else { 
                if (decommissionFilter !== 'all') { baseList = baseList.filter(animal => animal.status === decommissionFilter); } 
            }
            if (categoryFilter !== 'Todos') { 
                baseList = baseList.filter(animal => animal.zootecnicCategory === categoryFilter); 
            }
        }
        return baseList;
    }, [
        animalsWithAllData, viewMode, isLatestFilterActive, locationFilter, categoryFilter, 
        productiveFilter, reproductiveFilter, decommissionFilter, 
        kpiFilter, appConfig, bodyWeighings, parturitions, isKpiView
    ]);

    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id', 'name']);
    
    // ... (El resto del componente, 'resetAllFilters', 'getActionsForAnimal',
    // 'handleOpenActions', 'closeModal', 'handleDecommissionConfirm', etc.
    // y TODO EL JSX no necesita cambios) ...
    
    const resetAllFilters = () => { 
        setCategoryFilter('Todos'); 
        setIsLatestFilterActive(false); 
        setProductiveFilter('ALL'); 
        setReproductiveFilter('ALL'); 
        setDecommissionFilter('all'); 
        setSearchTerm(''); 
        setProductiveFiltersVisible(false); 
        setReproductiveFiltersVisible(false); 
    };

    // --- (Lógica de Acciones Individuales - SIN CAMBIOS) ---
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        if (animal.isReference) {
            return [
                { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate },
                { 
                    label: "Eliminar Permanentemente", 
                    icon: Trash2, 
                    onClick: () => { 
                        setIsActionSheetOpen(false);
                        setIsDeleteConfirmationOpen(true);
                    }, 
                    color: 'text-brand-red' 
                },
            ];
        }
        const actions: ActionSheetAction[] = [];
        if (animal.sex === 'Hembra') {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
            if (animal.sireLotId) { actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' }); }
        }
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        actions.push({ label: 'Mover a Lote', icon: Move, onClick: () => navigateTo({ name: 'rebano-profile', animalId: animal.id, openAction: 'move' }) });
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommissionSheet'); }, color: 'text-brand-red' });
        return actions;
    };
    const decommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => { setDecommissionReason('Venta'); setActiveModal('decommission'); } },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => { setDecommissionReason('Muerte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => { setDecommissionReason('Descarte'); setActiveModal('decommission'); }, color: 'text-brand-red' },
    ];
    const handleOpenActions = (animal: Animal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };
    const closeModal = () => { 
        setActiveModal(null); 
        setActionSheetAnimal(null); 
        setSessionDate(null); 
        setBulkAnimals([]); 
        setDecommissionReason(null); 
        setIsActionSheetOpen(false); 
        setIsBatchActionSheetOpen(false);
        setIsBatchConfirmOpen(false);
        setBatchDecommissionReason(null);
        setIsBatchMoveModalOpen(false);
    };
    const handleDecommissionConfirm = async (details: DecommissionDetails) => { 
        if (!actionSheetAnimal) return; 
        const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date }; 
        if (details.reason === 'Venta') Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); 
        if (details.reason === 'Muerte') dataToUpdate.deathReason = details.deathReason; 
        if (details.reason === 'Descarte') Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); 
        try { await updateAnimal(actionSheetAnimal.id, dataToUpdate); closeModal(); navigateTo({name: 'lots-dashboard'}); } 
        catch (error) { console.error("Error al dar de baja:", error); closeModal(); }
    };
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };
    const handleStartDrying = (parturitionId: string) => { startDryingProcess(parturitionId); closeModal(); };
    const handleSetDry = (parturitionId: string) => { setLactationAsDry(parturitionId); closeModal(); };
    const handleDeclareService = async (date: Date) => { if (!actionSheetAnimal || !actionSheetAnimal.sireLotId) { console.error("Missing animal or sireLotId."); closeModal(); return; } await addServiceRecord({ sireLotId: actionSheetAnimal.sireLotId, femaleId: actionSheetAnimal.id, serviceDate: date.toISOString().split('T')[0] }); closeModal(); };
    const handleReintegrate = async () => { if (!actionSheetAnimal || !actionSheetAnimal.isReference) return; await updateAnimal(actionSheetAnimal.id, { isReference: false, status: 'Activo', endDate: undefined, reproductiveStatus: 'Vacía' }); setIsActionSheetOpen(false); setActionSheetAnimal(null); };
    const handlePermanentDelete = async () => { if (!actionSheetAnimal || !actionSheetAnimal.isReference) return; await deleteAnimalPermanently(actionSheetAnimal.id); setIsDeleteConfirmationOpen(false); setIsActionSheetOpen(false); setActionSheetAnimal(null); };


    // --- (Lógica de Selección Múltiple - SIN CAMBIOS) ---
    const handleCardClick = (animalId: string) => {
        if (isSelectionMode) {
            handleToggleSelect(animalId);
        } else {
            navigateTo({ name: 'rebano-profile', animalId: animalId });
        }
    };
    const handleToggleSelect = (animalId: string) => {
        setSelectedAnimals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) {
                newSet.delete(animalId);
            } else {
                newSet.add(animalId);
            }
            return newSet;
        });
    };
    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedAnimals(new Set());
    };
    const animalsInSelection = useMemo(() => {
        return animalsWithAllData.filter(a => selectedAnimals.has(a.id));
    }, [selectedAnimals, animalsWithAllData]);
    const availableBatchActions = useMemo((): ActionSheetAction[] => {
        const actions: ActionSheetAction[] = [];
        if (animalsInSelection.length === 0) return actions;
        actions.push({ label: 'Mover a Lote', icon: Move, onClick: () => {
            setIsBatchActionSheetOpen(false);
            setIsBatchMoveModalOpen(true);
        }});
        actions.push({ 
            label: 'Dar de Baja', 
            icon: Archive, 
            onClick: () => {
                setIsBatchActionSheetOpen(false);
                setActiveModal('decommissionSheet');
            }, 
            color: 'text-brand-red' 
        });
        return actions;
    }, [animalsInSelection]);
    const handleBatchDecommissionConfirm = async () => { 
        if (selectedAnimals.size === 0 || !batchDecommissionReason) return;
        const date = new Date().toISOString().split('T')[0];
        const dataToUpdate: Partial<Animal> = { 
            status: batchDecommissionReason, 
            isReference: true, 
            endDate: date 
        };
        try {
            const updatePromises = Array.from(selectedAnimals).map(animalId => {
                return updateAnimal(animalId, dataToUpdate);
            });
            await Promise.all(updatePromises);
            closeModal();
            handleCancelSelection();
        } catch (error) {
            console.error("Error al dar de baja en lote:", error);
            closeModal();
        }
    };
    const handleBatchMoveConfirm = async (destinationLot: string) => {
        if (selectedAnimals.size === 0) return;
        try {
            const updatePromises = Array.from(selectedAnimals).map(animalId => {
                return updateAnimal(animalId, { location: destinationLot });
            });
            await Promise.all(updatePromises);
            closeModal();
            handleCancelSelection();
        } catch (error) {
            console.error("Error al mover en lote:", error);
            closeModal();
        }
    };
    const batchDecommissionActions: ActionSheetAction[] = [
        { label: "Por Venta", icon: DollarSign, onClick: () => { setBatchDecommissionReason('Venta'); setActiveModal(null); setIsBatchConfirmOpen(true); } },
        { label: "Por Muerte", icon: HeartCrack, onClick: () => { setBatchDecommissionReason('Muerte'); setActiveModal(null); setIsBatchConfirmOpen(true); }, color: 'text-brand-red' },
        { label: "Por Descarte", icon: Ban, onClick: () => { setBatchDecommissionReason('Descarte'); setActiveModal(null); setIsBatchConfirmOpen(true); }, color: 'text-brand-red' },
    ];

    // --- (Lógica de Virtualización - SIN CAMBIOS) ---
    const rowVirtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => 112, // 96px de tarjeta + 16px (1rem) de padding-bottom
        overscan: 5
    });

    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>; }

    // --- (TODO EL JSX - SIN CAMBIOS) ---
    return (
        <>
            <div 
                ref={pageContentRef} 
                className="w-full max-w-2xl mx-auto"
            >
                <SearchHeader 
                    title={locationFilter || (kpiFilter ? `Filtro: ${kpiFilter.charAt(0).toUpperCase() + kpiFilter.slice(1)}` : "Mi Rebaño")}
                    subtitle={isSelectionMode ? `${selectedAnimals.size} seleccionados` : `${filteredItems.length} animales en la vista`} 
                    searchTerm={searchTerm} 
                    setSearchTerm={setSearchTerm} 
                    isSticky={true} 
                />
                
                {!isKpiView ? (
                    <div className="space-y-4 px-4 pt-4"> 
                        <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
                            <button onClick={() => { setViewMode('Activos'); resetAllFilters(); setCategoryFilter('Todos'); }} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Activos' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><Users size={16} /> Activos</button>
                            <button onClick={() => { setViewMode('Referencia'); resetAllFilters(); }} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><FileArchive size={16} /> Referencia</button>
                        </div>
                        
                        {viewMode === 'Activos' && !isSelectionMode && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                                    <div className="space-y-3"><button onClick={() => setProductiveFiltersVisible(!productiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Productivos</span><ChevronDown className={`transition-transform ${productiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>{productiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['MILKING', 'DRYING_OFF', 'DRY'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} /></div> )}</div>
                                    <div className="space-y-3"><button onClick={() => setReproductiveFiltersVisible(!reproductiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Reproductivos</span><ChevronDown className={`transition-transform ${reproductiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>{reproductiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} /></div> )}</div>
                                </div>
                            </div>
                        )}
                        
                        {viewMode === 'Referencia' && !isSelectionMode && (
                            <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                                <FilterBar title="Filtrar por Causa de Baja" filters={[{key: 'Venta', label: 'Venta'}, {key: 'Muerte', label: 'Muerte'}, {key: 'Descarte', label: 'Descarte'}]} activeFilter={decommissionFilter} onFilterChange={setDecommissionFilter as any} />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-y-2">
                            
                            {isSelectionMode ? (
                                <button onClick={handleCancelSelection} className="flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg text-brand-red hover:bg-brand-red/10">
                                    <X size={16} /> Cancelar
                                </button>
                            ) : (
                                <button onClick={() => setIsSelectionMode(true)} className="flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg text-brand-orange hover:bg-brand-orange/10">
                                    <ListChecks size={16} /> Seleccionar
                                </button>
                            )}

                            {isSelectionMode ? (
                                <button 
                                    onClick={() => setIsBatchActionSheetOpen(true)}
                                    disabled={selectedAnimals.size === 0}
                                    className="flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg text-brand-orange hover:bg-brand-orange/10 disabled:opacity-50 disabled:hover:bg-transparent disabled:text-zinc-500"
                                >
                                    <Edit size={16} /> Acciones ({selectedAnimals.size})
                                </button>
                            ) : (
                                <button onClick={resetAllFilters} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3">
                                    <FilterX size={14} /> Limpiar
                                </button>
                            )}
                        </div>

                        {!isSelectionMode && (
                            <div className="flex items-center justify-between text-sm">
                                <button onClick={() => setIsLatestFilterActive(!isLatestFilterActive)} title={isLatestFilterActive ? "Mostrar todos" : "Mostrar última carga"} className={`flex items-center gap-2 py-1 px-3 font-semibold rounded-lg transition-colors ${isLatestFilterActive ? 'text-brand-orange' : 'text-zinc-400 hover:text-brand-orange'}`}>
                                    <History size={16} /> {isLatestFilterActive ? 'Viendo Última Carga' : 'Última Carga'}
                                </button>
                                <button onClick={() => navigateTo({ name: 'manage-lots' })} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange font-semibold py-1 px-3">
                                    <Settings size={14} /> Gestionar Lotes
                                </button>
                            </div>
                        )}

                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-brand-glass p-3 rounded-xl text-white border border-brand-border focus:border-brand-orange focus:ring-0 appearance-none">
                            <option value="Todos">Todas las Categorías Zootécnicas</option>
                            {ZOOTECNIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="pt-2"></div>
                )}


                {/* Lista virtualizada */}
                <div className="pt-4" style={{ height: 'auto', position: 'relative' }}>
                    {filteredItems.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = filteredItems[virtualItem.index];
                                return (
                                    <div
                                        key={virtualItem.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                            padding: '0 1rem 1rem 1rem', 
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <SwipeableAnimalCard
                                            animal={animal}
                                            onSelect={handleCardClick}
                                            onOpenActions={handleOpenActions}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedAnimals.has(animal.id)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay animales que coincidan con los filtros."}</p>

                        </div>
                    )}
                </div>
            </div>

            {/* --- Modales de Acción Individual (SIN CAMBIOS) --- */}
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={closeModal} title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`} actions={getActionsForAnimal(actionSheetAnimal)} />
            <ActionSheetModal
                isOpen={activeModal === 'decommissionSheet' && !isSelectionMode} 
                onClose={closeModal}
                title="Causa de la Baja"
                actions={decommissionActions}
            />
            {actionSheetAnimal && (
                <>
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'decommission' && decommissionReason && !isSelectionMode && (
                        <DecommissionAnimalModal
                            isOpen={activeModal === 'decommission'}
                            animal={actionSheetAnimal} 
                            onCancel={closeModal}
                            onConfirm={handleDecommissionConfirm}
                            reason={decommissionReason}
                        />
                    )}
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
                    {activeModal === 'milkWeighingAction' && (<MilkWeighingActionModal 
                        isOpen={true} 
                        animal={actionSheetAnimal} 
                        onClose={closeModal} 
                        onLogToSession={(date: string) => handleLogToSession(date, 'leche')} 
                        onStartNewSession={()=> handleStartNewSession('leche')} 
                        onStartDrying={handleStartDrying} 
                        onSetDry={handleSetDry}
                    />)}
                    {activeModal === 'bodyWeighingAction' && (<BodyWeighingActionModal isOpen={true} animal={actionSheetAnimal} onClose={closeModal} onLogToSession={(date: string) => handleLogToSession(date, 'corporal')} onStartNewSession={()=> handleStartNewSession('corporal')} onSetReadyForMating={handleSetReadyForMating}/>)}
                    {activeModal === 'logSimpleMilk' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Pesaje Leche: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="leche" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    {activeModal === 'logSimpleBody' && sessionDate && (<Modal isOpen={true} onClose={closeModal} title={`Añadir Peso Corporal: ${formatAnimalDisplay(actionSheetAnimal)}`}><LogWeightForm animalId={actionSheetAnimal.id} weightType="corporal" onSaveSuccess={closeModal} onCancel={closeModal} sessionDate={sessionDate} /></Modal>)}
                    
                    {(activeModal === 'newMilkSession' || activeModal === 'newBodySession') && (
                        <NewWeighingSessionFlow 
                            weightType={bulkWeightType} 
                            onBack={closeModal} 
                            onAnimalsSelected={handleAnimalsSelectedForBulk} 
                        />
                    )}
                    {activeModal === 'bulkWeighing' && (<Modal isOpen={true} onClose={closeModal} title={`Carga Masiva - ${bulkWeightType === 'leche' ? 'Leche' : 'Corporal'}`} size="fullscreen"><BatchWeighingForm weightType={bulkWeightType} animalsToWeigh={bulkAnimals} onSaveSuccess={handleBulkSaveSuccess} onCancel={closeModal} /></Modal>)}
                    
                    <ConfirmationModal
                        isOpen={isDeleteConfirmationOpen}
                        onClose={() => setIsDeleteConfirmationOpen(false)}
                        onConfirm={handlePermanentDelete}
                        title={`Eliminar ${formatAnimalDisplay(actionSheetAnimal)} Permanentemente`} 
                        message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer. ¿Continuar?"
                    />
                </>
            )}

            {/* --- Modales de Lote (SIN CAMBIOS) --- */}
            <ActionSheetModal 
                isOpen={isBatchActionSheetOpen} 
                onClose={() => setIsBatchActionSheetOpen(false)} 
                title={`Acciones para ${selectedAnimals.size} animales`} 
                actions={availableBatchActions} 
            />
            <ActionSheetModal
                isOpen={activeModal === 'decommissionSheet' && isSelectionMode}
                onClose={closeModal}
                title="Causa de la Baja (Lote)"
                actions={batchDecommissionActions}
            />
            <ConfirmationModal
                isOpen={isBatchConfirmOpen}
                onClose={closeModal}
                onConfirm={handleBatchDecommissionConfirm}
                title={`Dar de Baja a ${selectedAnimals.size} animales`}
                message={`¿Estás seguro de que quieres dar de baja a ${selectedAnimals.size} animales seleccionados por motivo de "${batchDecommissionReason}"? Esta acción los moverá a Referencia.`}
            />
            <BatchMoveModal
                isOpen={isBatchMoveModalOpen}
                onClose={closeModal}
                onConfirm={handleBatchMoveConfirm}
                lots={lots.filter(l => l.name !== 'Sin Asignar')}
            />
        </>
    );
}
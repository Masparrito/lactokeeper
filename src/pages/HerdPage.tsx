// src/pages/HerdPage.tsx

import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { Plus, ChevronRight, Settings, History, FilterX, ChevronDown, Users, FileArchive, Baby, Scale, Move, Archive, Droplets, HeartCrack, Heart } from 'lucide-react';
import type { PageState } from '../types/navigation';
import { Animal, Parturition, ServiceRecord, BreedingSeason, SireLot } from '../db/local'; // Import all types
import { formatAge, getAnimalZootecnicCategory } from '../utils/calculations';
import { formatAnimalDisplay } from '../utils/formatting';
import { StatusIcons } from '../components/icons/StatusIcons';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';

// Modals for the action flow
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


// --- Lógica de cálculo de estado (Actualizada para priorizar Referencia/Baja) ---
const getAnimalStatusObjects = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allSireLots: SireLot[], allBreedingSeasons: BreedingSeason[]): (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] => {
    const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
    if (!animal) return [];

    // --- PUNTO 1: Priorizar estatus de Referencia/Baja ---
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
        // Asegúrate de filtrar los posibles resultados nulos si 'REFERENCE' no está definido
        return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean);
    }


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
    // Devolver objetos únicos basados en 'key'
    const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
    // Asegúrate de filtrar los posibles resultados nulos
    return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean);
};


// Componente para mostrar una fila de animal deslizable
const SwipeableAnimalRow = ({ animal, onSelect, onOpenActions }: {
    animal: Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[], sireName?: string },
    onSelect: (id: string) => void,
    onOpenActions: (animal: Animal) => void
}) => {
    const swipeControls = useAnimation(); // Controla la animación de la tarjeta
    const dragStarted = useRef(false); // Ref para evitar clic durante arrastre
    const buttonsWidth = 80; // Ancho del botón de acciones oculto

    // Se ejecuta al finalizar el arrastre
    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x; // Desplazamiento horizontal
        const velocity = info.velocity.x; // Velocidad del arrastre
        // Si se desliza lo suficiente o rápido a la izquierda, abre acciones
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }
        swipeControls.start({ x: 0 }); // Animar de vuelta a la posición original
        setTimeout(() => { dragStarted.current = false; }, 100); // Resetear estado de arrastre
    };

    return (
        // Contenedor principal de la fila
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border min-h-[96px]">
            {/* Botón de acciones oculto */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Plus size={22} /><span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>
            {/* Contenido visible y deslizable */}
            <motion.div
                drag="x" dragConstraints={{ left: -buttonsWidth, right: 0 }} dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }} onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }}
                animate={swipeControls} transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4 flex items-center min-h-[96px]"
            >
                 <div className="flex justify-between items-center w-full">
                    {/* Información Izquierda */}
                    <div>
                        {/* --- CORRECCIÓN DE ESTILO: Reducir tamaño de text-lg a text-base --- */}
                        <p className="font-bold text-base text-white">{formatAnimalDisplay(animal)}</p>
                        <div className="text-sm text-zinc-400 mt-1 min-h-[1.25rem]">
                            <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'Sin Asignar'}</span>
                            {animal.sireName && <span className="block sm:inline sm:ml-2">(Reproductor: {animal.sireName})</span>}
                        </div>
                    </div>
                    {/* Información Derecha */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusIcons statuses={animal.statusObjects} />
                        <ChevronRight className="text-zinc-600" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Categorías zootécnicas para el filtro
const ZOOTECNIC_CATEGORIES = ['Cabrita', 'Cabritona', 'Cabra', 'Cabrito', 'Macho de Levante', 'Macho Cabrío'];
// Tipo para los elementos de la barra de filtros
type FilterItem = { key: string, label: string, Icon?: React.ElementType };

// Componente para la barra de filtros
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


// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE REBAÑO ---
interface HerdPageProps {
    navigateTo: (page: PageState) => void;
    locationFilter?: string; // Filtro opcional por lote
}

export default function HerdPage({ navigateTo, locationFilter }: HerdPageProps) {
    // Hooks de datos y estado
    // ----- CORRECCIÓN AQUÍ: Cambiado setLationAsDry por setLactationAsDry -----
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, isLoading, updateAnimal, startDryingProcess, setLactationAsDry, addServiceRecord, fathers } = useData();

    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

    type ModalType = | 'parturition' | 'abortion' | 'decommission' | 'milkWeighingAction' | 'bodyWeighingAction' | 'logSimpleMilk' | 'logSimpleBody' | 'newMilkSession' | 'newBodySession' | 'bulkWeighing' | 'service';
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null); // Fecha para pesajes individuales
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]); // Animales para pesaje masivo
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal'); // Tipo de pesaje masivo

    // Estados de filtros de la UI
    const [viewMode, setViewMode] = useState<'Activos' | 'Referencia'>('Activos'); // Vista principal
    const [decommissionFilter, setDecommissionFilter] = useState<'all' | 'Venta' | 'Muerte' | 'Descarte'>('all'); // Filtro para Referencia
    const [categoryFilter, setCategoryFilter] = useState<string>(locationFilter ? 'Todos' : 'Todos'); // Filtro por categoría zootécnica
    const [isLatestFilterActive, setIsLatestFilterActive] = useState(false); // Filtro "Última Carga"
    const [productiveFilter, setProductiveFilter] = useState('ALL'); // Filtro estado productivo
    const [reproductiveFilter, setReproductiveFilter] = useState('ALL'); // Filtro estado reproductivo
    const [productiveFiltersVisible, setProductiveFiltersVisible] = useState(false); // Visibilidad filtros prod.
    const [reproductiveFiltersVisible, setReproductiveFiltersVisible] = useState(false); // Visibilidad filtros reprod.

    // Memoizar datos de animales enriquecidos
    const animalsWithAllData = useMemo(() => {
        const sireLotMap = new Map(sireLots.map(lot => [lot.id, lot]));
        const fatherMap = new Map(fathers.map(father => [father.id, father]));
        return animals.map(animal => {
            let sireName: string | undefined = undefined;
            if (animal.sireLotId) {
                const lot = sireLotMap.get(animal.sireLotId);
                if (lot) { const father = fatherMap.get(lot.sireId); sireName = father?.name; }
            }
            return {
                ...animal,
                statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
                formattedAge: formatAge(animal.birthDate),
                zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions),
                sireName
            };
        });
    }, [animals, parturitions, serviceRecords, sireLots, breedingSeasons, fathers]);

    // Memoizar la lista de animales filtrada por la UI
    const filteredByUI = useMemo(() => {
        // Empezar con Activos o Referencia según viewMode
        let baseList = viewMode === 'Activos'
            ? animalsWithAllData.filter(a => !a.isReference)
            : animalsWithAllData.filter(a => a.isReference);

        // Aplicar filtro de lote si viene de la página de detalle de lote
        if (locationFilter) {
            baseList = baseList.filter(animal => (animal.location || 'Sin Asignar') === locationFilter);
        }

        // Aplicar filtro "Última Carga" (más recientes primero, limitado a 25)
        if (isLatestFilterActive) {
            return baseList
                .sort((a, b) => (b.endDate ? new Date(b.endDate).getTime() : b.createdAt || 0) - (a.endDate ? new Date(a.endDate).getTime() : a.createdAt || 0)) // Ordenar por fecha de fin o creación
                .slice(0, 25); // Limitar a los 25 más recientes
        }

        // Aplicar filtros específicos si estamos en modo "Activos"
        if (viewMode === 'Activos') {
            if (productiveFilter !== 'ALL') { // Filtrar por estado productivo
                baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === productiveFilter));
            }
            if (reproductiveFilter !== 'ALL') { // Filtrar por estado reproductivo
                baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === reproductiveFilter));
            }
        } else { // Aplicar filtros específicos si estamos en modo "Referencia"
            if (decommissionFilter !== 'all') { // Filtrar por causa de baja
                baseList = baseList.filter(animal => animal.status === decommissionFilter);
            }
        }

        // Aplicar filtro por categoría zootécnica (si no es "Todos")
        if (categoryFilter !== 'Todos') {
            baseList = baseList.filter(animal => animal.zootecnicCategory === categoryFilter);
        }

        return baseList; // Devolver lista filtrada
    }, [animalsWithAllData, viewMode, isLatestFilterActive, locationFilter, categoryFilter, productiveFilter, reproductiveFilter, decommissionFilter]); // Recalcular si cambian filtros o datos

    // Hook para búsqueda textual
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id', 'name']); // Buscar por ID y Nombre

    // Resetear todos los filtros a sus valores por defecto
    const resetAllFilters = () => {
        setCategoryFilter('Todos'); setIsLatestFilterActive(false); setProductiveFilter('ALL');
        setReproductiveFilter('ALL'); setDecommissionFilter('all'); setSearchTerm('');
        setProductiveFiltersVisible(false); setReproductiveFiltersVisible(false);
    };

    // Obtener acciones disponibles para un animal (para el ActionSheet)
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return []; // Si no hay animal, no hay acciones
        const actions: ActionSheetAction[] = [];
        // Acciones específicas para hembras
        if (animal.sex === 'Hembra') {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
            // Acción de Registrar Servicio solo si está en un lote de monta
            if (animal.sireLotId) {
                actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' });
            }
        }
        // Acciones comunes para ambos sexos
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        // Navegar a perfil para Mover a Lote
        actions.push({ label: 'Mover a Lote', icon: Move, onClick: () => navigateTo({ name: 'rebano-profile', animalId: animal.id, openAction: 'move' }) });
        // Acción de Dar de Baja (color rojo)
        actions.push({ label: 'Dar de Baja', icon: Archive, onClick: () => { setIsActionSheetOpen(false); setActiveModal('decommission'); }, color: 'text-brand-red' });
        return actions;
    };

    // Handlers para modales y acciones
    const handleOpenActions = (animal: Animal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };
    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); setSessionDate(null); setBulkAnimals([]); };
    const handleDecommissionConfirm = async (details: DecommissionDetails) => { if (!actionSheetAnimal) return; const dataToUpdate: Partial<Animal> = { status: details.reason, isReference: true, endDate: details.date }; if (details.reason === 'Venta') Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); if (details.reason === 'Muerte') dataToUpdate.deathReason = details.deathReason; if (details.reason === 'Descarte') Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); await updateAnimal(actionSheetAnimal.id, dataToUpdate); closeModal(); };
    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => { setSessionDate(date); setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody'); };
    const handleStartNewSession = (type: 'leche' | 'corporal') => { setBulkWeightType(type); setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession'); };
    const handleSetReadyForMating = async () => { if (actionSheetAnimal) { await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' }); closeModal(); } };
    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => { setBulkAnimals(selectedAnimals); setActiveModal('bulkWeighing'); };
    const handleBulkSaveSuccess = () => { closeModal(); };
    const handleStartDrying = (parturitionId: string) => { startDryingProcess(parturitionId); closeModal(); };
    // ----- CORRECCIÓN AQUÍ: Cambiado setLationAsDry por setLactationAsDry -----
    const handleSetDry = (parturitionId: string) => { setLactationAsDry(parturitionId); closeModal(); };
    const handleDeclareService = async (date: Date) => { if (!actionSheetAnimal || !actionSheetAnimal.sireLotId) { console.error("Missing animal or sireLotId."); closeModal(); return; } await addServiceRecord({ sireLotId: actionSheetAnimal.sireLotId, femaleId: actionSheetAnimal.id, serviceDate: date.toISOString().split('T')[0] }); closeModal(); };

    // Setup para virtualización de la lista
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredItems.length, // Número total de items filtrados
        getScrollElement: () => parentRef.current, // Elemento contenedor del scroll
        estimateSize: () => 104, // Altura estimada de cada fila
        overscan: 5 // Renderizar 5 items extra
    });

    // Mostrar estado de carga si los datos aún no están listos
    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>; }

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            {/* Contenedor principal con scroll */}
            <div ref={parentRef} className="w-full max-w-2xl mx-auto space-y-4 pb-12" style={{ height: 'calc(100vh - 64px - 65px)', overflowY: 'auto' }}>
                {/* Cabecera con búsqueda */}
                <SearchHeader title={locationFilter || "Mi Rebaño"} subtitle={`${filteredItems.length} animales en la vista`} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

                {/* Controles de filtros */}
                <div className="space-y-4 px-4">
                    {/* Selector Activos/Referencia */}
                    <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
                        <button onClick={() => { setViewMode('Activos'); resetAllFilters(); setCategoryFilter('Todos'); }} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Activos' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><Users size={16} /> Activos</button>
                        <button onClick={() => { setViewMode('Referencia'); resetAllFilters(); }} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><FileArchive size={16} /> Referencia</button>
                    </div>

                    {/* Filtros condicionales según el modo de vista */}
                    {viewMode === 'Activos' ? (
                        <div className="space-y-4 animate-fade-in">
                            {/* Botón para añadir nuevo animal */}
                            <button onClick={() => navigateTo({ name: 'add-animal' })} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base"><Plus size={18} /> Ingresar Nuevo Animal</button>
                            {/* Sección de filtros productivos y reproductivos (colapsables) */}
                            <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                                <div className="space-y-3"><button onClick={() => setProductiveFiltersVisible(!productiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Productivos</span><ChevronDown className={`transition-transform ${productiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>{productiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['MILKING', 'DRYING_OFF', 'DRY'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} /></div> )}</div>
                                <div className="space-y-3"><button onClick={() => setReproductiveFiltersVisible(!reproductiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Reproductivos</span><ChevronDown className={`transition-transform ${reproductiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>{reproductiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} /></div> )}</div>
                            </div>
                        </div>
                    ) : ( // Filtros para modo Referencia
                        <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                            <FilterBar title="Filtrar por Causa de Baja" filters={[{key: 'Venta', label: 'Venta'}, {key: 'Muerte', label: 'Muerte'}, {key: 'Descarte', label: 'Descarte'}]} activeFilter={decommissionFilter} onFilterChange={setDecommissionFilter as any} />
                        </div>
                    )}

                    {/* Botones de acción y filtros */}
                    <div className="flex items-center justify-between">
                        <button onClick={() => setIsLatestFilterActive(!isLatestFilterActive)} title={isLatestFilterActive ? "Mostrar todos" : "Mostrar última carga"} className={`flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg transition-colors ${isLatestFilterActive ? 'text-brand-orange' : 'text-zinc-400 hover:text-brand-orange'}`}><History size={16} /> {isLatestFilterActive ? 'Viendo Última Carga' : 'Última Carga'}</button>
                        <div className='flex items-center gap-4'>
                            <button onClick={() => navigateTo({ name: 'manage-lots' })} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><Settings size={14} /> Gestionar Lotes</button>
                            <button onClick={resetAllFilters} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><FilterX size={14} /> Limpiar</button>
                        </div>
                    </div>

                    {/* Selector de Categoría Zootécnica */}
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-brand-glass p-3 rounded-xl text-white border border-brand-border focus:border-brand-orange focus:ring-0 appearance-none">
                        <option value="Todos">Todas las Categorías Zootécnicas</option>
                        {ZOOTECNIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Lista virtualizada de animales */}
                <div className="pt-4" style={{ height: 'auto', position: 'relative' }}> {/* Contenedor para la virtualización */}
                    {filteredItems.length > 0 ? (
                        // Contenedor con altura dinámica basado en el número de items
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {/* Mapear items virtuales */}
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = filteredItems[virtualItem.index]; // Obtener datos del animal
                                return (
                                    // Div para posicionar cada fila virtual
                                    <div key={virtualItem.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, padding: '0 1rem 0.5rem 1rem' }}> {/* Padding para espacio entre filas */}
                                        <SwipeableAnimalRow
                                            animal={animal}
                                            onSelect={() => navigateTo({ name: 'rebano-profile', animalId: animal.id })} // Navegar al perfil al seleccionar
                                            onOpenActions={handleOpenActions} // Abrir acciones al deslizar
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : ( // Mensaje si no hay animales que mostrar
                        <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay animales que coincidan con los filtros."}</p>
                        </div>
                    )}
                </div>
            </div> {/* Fin del contenedor principal con scroll */}

            {/* Modales de acciones (instanciados fuera del scroll) */}
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)} title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`} actions={getActionsForAnimal(actionSheetAnimal)} />
            {actionSheetAnimal && ( // Renderizar modales específicos solo si hay un animal seleccionado
                <>
                    {activeModal === 'parturition' && <ParturitionModal isOpen={true} onClose={closeModal} motherId={actionSheetAnimal.id} />}
                    {activeModal === 'abortion' && <DeclareAbortionModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal} />}
                    {activeModal === 'decommission' && <DecommissionAnimalModal animal={actionSheetAnimal} onCancel={closeModal} onConfirm={handleDecommissionConfirm} />}
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animal={actionSheetAnimal} />}
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
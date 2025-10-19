// src/pages/HerdPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { Plus, ChevronRight, Settings, History, FilterX, ChevronDown, Users, FileArchive, Baby, Scale, Move, Archive, Droplets, HeartCrack, Heart } from 'lucide-react';
import type { PageState } from '../types/navigation';
import { Animal } from '../db/local';
import { formatAge, getAnimalZootecnicCategory, getAnimalStatusObjects } from '../utils/calculations';
import { StatusIcons } from '../components/icons/StatusIcons';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';

// --- Modales para el flujo de acciones ---
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


// --- Componente de Tarjeta Deslizable (Sin cambios) ---
const SwipeableAnimalRow = ({ animal, onSelect, onOpenActions }: { animal: any, onSelect: (id: string) => void, onOpenActions: (animal: any) => void }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }
        swipeControls.start({ x: 0 });
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Plus size={22} /><span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4"
            >
                 <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg text-white">{animal.id}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                            {animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusIcons statuses={animal.statusObjects} />
                        <ChevronRight className="text-zinc-600" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const ZOOTECNIC_CATEGORIES = ['Cabrita', 'Cabritona', 'Cabra', 'Cabrito', 'Macho de Levante', 'Macho Cabrío'];

type FilterItem = { key: string, label: string, Icon?: React.ElementType };

const FilterBar = ({ title, filters, activeFilter, onFilterChange }: { 
    title: string, 
    filters: FilterItem[], 
    activeFilter: string, 
    onFilterChange: (key: string) => void 
}) => (
    <div>
        {title && <label className="block text-sm font-semibold text-zinc-400 mb-2">{title}</label>}
        <div className="flex flex-wrap gap-2">
            <button onClick={() => onFilterChange('all')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === 'all' || activeFilter === 'ALL' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Todos</button>
            {filters.map(f => {
                const Icon = f.Icon || null;
                return ( <button key={f.key} onClick={() => onFilterChange(f.key)} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === f.key ? 'bg-brand-green text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>{Icon && <Icon size={14} />}{f.label}</button> );
            })}
        </div>
    </div>
);

interface HerdPageProps {
    navigateTo: (page: PageState) => void;
    locationFilter?: string;
}

export default function HerdPage({ navigateTo, locationFilter }: HerdPageProps) {
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, isLoading, updateAnimal, startDryingProcess, setLactationAsDry, addServiceRecord } = useData();
    
    const [actionSheetAnimal, setActionSheetAnimal] = useState<Animal | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    
    type ModalType = 
      | 'parturition' | 'abortion' | 'decommission'
      | 'milkWeighingAction' | 'bodyWeighingAction'
      | 'logSimpleMilk' | 'logSimpleBody'
      | 'newMilkSession' | 'newBodySession'
      | 'bulkWeighing'
      | 'service';
    
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [sessionDate, setSessionDate] = useState<string | null>(null);
    const [bulkAnimals, setBulkAnimals] = useState<Animal[]>([]);
    const [bulkWeightType, setBulkWeightType] = useState<'leche' | 'corporal'>('corporal');
    
    const [viewMode, setViewMode] = useState<'Activos' | 'Referencia'>('Activos');
    const [decommissionFilter, setDecommissionFilter] = useState<'all' | 'Venta' | 'Muerte' | 'Descarte'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
    const [isLatestFilterActive, setIsLatestFilterActive] = useState(false);
    const [productiveFilter, setProductiveFilter] = useState('ALL');
    const [reproductiveFilter, setReproductiveFilter] = useState('ALL');
    const [productiveFiltersVisible, setProductiveFiltersVisible] = useState(false);
    const [reproductiveFiltersVisible, setReproductiveFiltersVisible] = useState(false);

    const animalsWithAllData = useMemo(() => {
        return animals.map(animal => ({ 
            ...animal, 
            statusObjects: getAnimalStatusObjects(animal, parturitions, serviceRecords, sireLots, breedingSeasons), 
            formattedAge: formatAge(animal.birthDate), 
            zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions), 
        }));
    }, [animals, parturitions, serviceRecords, sireLots, breedingSeasons]);

    const filteredByUI = useMemo(() => {
        let baseList = viewMode === 'Activos' ? animalsWithAllData.filter(a => !a.isReference) : animalsWithAllData.filter(a => a.isReference);
        if (isLatestFilterActive) { return baseList.sort((a, b) => (b.endDate ? new Date(b.endDate).getTime() : b.createdAt || 0) - (a.endDate ? new Date(a.endDate).getTime() : a.createdAt || 0)).slice(0, 25); }
        if (locationFilter) { baseList = baseList.filter(animal => (animal.location || 'Sin Asignar') === locationFilter); }
        if (viewMode === 'Activos') {
            if (productiveFilter !== 'ALL') { baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === productiveFilter)); }
            if (reproductiveFilter !== 'ALL') { baseList = baseList.filter(animal => animal.statusObjects.some(s => s.key === reproductiveFilter)); }
        } else {
            if (decommissionFilter !== 'all') { baseList = baseList.filter(animal => animal.status === decommissionFilter); }
        }
        if (categoryFilter !== 'Todos') { baseList = baseList.filter(animal => animal.zootecnicCategory === categoryFilter); }
        return baseList;
    }, [animalsWithAllData, viewMode, isLatestFilterActive, locationFilter, categoryFilter, productiveFilter, reproductiveFilter, decommissionFilter]);

    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id']);
    
    const resetAllFilters = () => {
        setCategoryFilter('Todos');
        setIsLatestFilterActive(false);
        setProductiveFilter('ALL');
        setReproductiveFilter('ALL');
        setDecommissionFilter('all');
        setSearchTerm('');
    };
    
    const getActionsForAnimal = (animal: Animal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        if (animal.sex === 'Hembra') {
            actions.push({ label: 'Declarar Parto', icon: Baby, onClick: () => { setIsActionSheetOpen(false); setActiveModal('parturition'); }});
            actions.push({ label: 'Declarar Aborto', icon: HeartCrack, onClick: () => { setIsActionSheetOpen(false); setActiveModal('abortion'); }, color: 'text-yellow-400'});
            actions.push({ label: 'Acciones de Leche', icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighingAction'); }});
            if (animal.sireLotId) {
                actions.push({ label: 'Registrar Servicio', icon: Heart, onClick: () => { setIsActionSheetOpen(false); setActiveModal('service'); }, color: 'text-pink-400' });
            }
        }
        actions.push({ label: 'Acciones de Peso', icon: Scale, onClick: () => { setIsActionSheetOpen(false); setActiveModal('bodyWeighingAction'); }});
        actions.push({ label: 'Mover a Lote', icon: Move, onClick: () => navigateTo({ name: 'rebano-profile', animalId: animal.id, openAction: 'move' }) });
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
        setSessionDate(null);
        setBulkAnimals([]);
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

    const handleLogToSession = (date: string, type: 'leche' | 'corporal') => {
        setSessionDate(date);
        setActiveModal(type === 'leche' ? 'logSimpleMilk' : 'logSimpleBody');
    };

    const handleStartNewSession = (type: 'leche' | 'corporal') => {
        setBulkWeightType(type);
        setActiveModal(type === 'leche' ? 'newMilkSession' : 'newBodySession');
    };
    
    const handleSetReadyForMating = async () => {
        if (actionSheetAnimal) {
            await updateAnimal(actionSheetAnimal.id, { reproductiveStatus: 'En Servicio' });
            closeModal();
        }
    };

    const handleAnimalsSelectedForBulk = (_selectedIds: string[], selectedAnimals: Animal[]) => {
        setBulkAnimals(selectedAnimals);
        setActiveModal('bulkWeighing');
    };

    const handleBulkSaveSuccess = () => {
        closeModal();
    };

    const handleStartDrying = (parturitionId: string) => {
        startDryingProcess(parturitionId);
        closeModal();
    };

    const handleSetDry = (parturitionId: string) => {
        setLactationAsDry(parturitionId);
        closeModal();
    };
    
    const handleDeclareService = async (date: Date) => {
        if (!actionSheetAnimal || !actionSheetAnimal.sireLotId) {
             console.error("No se puede declarar servicio: animal o sireLotId faltante.");
             closeModal();
             return;
        }
        await addServiceRecord({    
            sireLotId: actionSheetAnimal.sireLotId,    
            femaleId: actionSheetAnimal.id,    
            serviceDate: date.toISOString().split('T')[0]    
        });
        closeModal();
    };

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({ count: filteredItems.length, getScrollElement: () => parentRef.current, estimateSize: () => 104, overscan: 5 });

    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>; }
    
    return (
        <>
            <div ref={parentRef} className="w-full max-w-2xl mx-auto space-y-4 pb-12" style={{ height: '100vh', overflowY: 'auto' }}>
                <SearchHeader title={locationFilter || "Mi Rebaño"} subtitle={`${filteredItems.length} animales en la vista`} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                <div className="space-y-4 px-4">
                    <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
                        <button onClick={() => setViewMode('Activos')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Activos' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><Users size={16} /> Activos</button>
                        <button onClick={() => setViewMode('Referencia')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${viewMode === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><FileArchive size={16} /> Referencia</button>
                    </div>
                    {viewMode === 'Activos' ? (
                        <div className="space-y-4 animate-fade-in">
                            <button onClick={() => navigateTo({ name: 'add-animal' })} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base"><Plus size={18} /> Ingresar Nuevo Animal</button>
                            <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                                <div className="space-y-3">
                                    <button onClick={() => setProductiveFiltersVisible(!productiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Productivos</span><ChevronDown className={`transition-transform ${productiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>
                                    {productiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['MILKING', 'DRYING_OFF', 'DRY'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey])} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} /></div> )}
                                </div>
                                <div className="space-y-3">
                                    <button onClick={() => setReproductiveFiltersVisible(!reproductiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors"><span>Filtros Reproductivos</span><ChevronDown className={`transition-transform ${reproductiveFiltersVisible ? 'rotate-180' : ''}`} size={18} /></button>
                                    {reproductiveFiltersVisible && ( <div className="animate-fade-in"><FilterBar title="" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey])} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} /></div> )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                            <FilterBar title="Filtrar por Causa de Baja" filters={[{key: 'Venta', label: 'Venta'}, {key: 'Muerte', label: 'Muerte'}, {key: 'Descarte', label: 'Descarte'}]} activeFilter={decommissionFilter} onFilterChange={setDecommissionFilter as any} />
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <button onClick={() => setIsLatestFilterActive(true)} title="Última Carga" className={`flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg transition-colors ${isLatestFilterActive ? 'text-brand-orange' : 'text-zinc-400 hover:text-brand-orange'}`}><History size={16} /> Última Carga</button>
                        <div className='flex items-center gap-4'>
                            <button onClick={() => navigateTo({ name: 'manage-lots' })} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><Settings size={14} /> Gestionar Lotes</button>
                            <button onClick={resetAllFilters} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><FilterX size={14} /> Limpiar</button>
                        </div>
                    </div>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-brand-glass p-3 rounded-xl text-white border border-brand-border focus:border-brand-orange focus:ring-0">
                        <option value="Todos">Todas las Categorías Zootécnicas</option>
                        {ZOOTECNIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                
                <div className="pt-4">
                    {filteredItems.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = filteredItems[virtualItem.index];
                                return (
                                    <div key={virtualItem.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)`, padding: '0 1rem 0.5rem 1rem' }}>
                                        <SwipeableAnimalRow 
                                            animal={animal} 
                                            onSelect={() => navigateTo({ name: 'rebano-profile', animalId: animal.id })}
                                            onOpenActions={handleOpenActions}
                                        />
                                    </div>
                                );
                           })}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
m                        <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay animales que coincidan con los filtros."}</p>
                        </div>
                    )}
                </div>
ci          </div> 

            {/* --- RENDERIZADO CONDICIONAL DE MODALES --- */}

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
                    {activeModal === 'decommission' && <DecommissionAnimalModal animal={actionSheetAnimal} onCancel={closeModal} onConfirm={handleDecommissionConfirm} />}
                    {activeModal === 'service' && <DeclareServiceModal isOpen={true} onClose={closeModal} onSave={handleDeclareService} animalId={actionSheetAnimal.id} />}

                    {activeModal === 'milkWeighingAction' && (
                        <MilkWeighingActionModal
                            isOpen={true}
                            animal={actionSheetAnimal}
                            onClose={closeModal}
                            onLogToSession={(date) => handleLogToSession(date, 'leche')}
                            onStartNewSession={() => handleStartNewSession('leche')}
                            onStartDrying={handleStartDrying}
                            onSetDry={handleSetDry}
                   />
                    )}
                    
                    {/* --- BLOQUE CORREGIDO --- */}
                    {activeModal === 'bodyWeighingAction' && (
                        <BodyWeighingActionModal
                            isOpen={true}
                            animal={actionSheetAnimal}
                            onClose={closeModal}
                            onLogToSession={(date) => handleLogToSession(date, 'corporal')}
                            onStartNewSession={() => handleStartNewSession('corporal')}
                            onSetReadyForMating={handleSetReadyForMating}
                        />
                    )}

                    {activeModal === 'logSimpleMilk' && sessionDate && (
                        <Modal isOpen={true} onClose={closeModal} title={`Añadir Pesaje Leche: ${actionSheetAnimal.id}`}>
                            <LogWeightForm
                                animalId={actionSheetAnimal.id}
                                weightType="leche"
                                onSaveSuccess={closeModal}
                                onCancel={closeModal}
                                // date={sessionDate} // Se añadirá en el siguiente paso
                            />
                        </Modal>
                    )}
                    
                    {activeModal === 'logSimpleBody' && sessionDate && (
                        <Modal isOpen={true} onClose={closeModal} title={`Añadir Peso Corporal: ${actionSheetAnimal.id}`}>
                            <LogWeightForm
                                animalId={actionSheetAnimal.id}
                                weightType="corporal"
                                onSaveSuccess={closeModal}
                                onCancel={closeModal}
                                // date={sessionDate} // Se añadirá en el siguiente paso
                            />
                        </Modal>
                    )}

                    {(activeModal === 'newMilkSession' || activeModal === 'newBodySession') && (
                        <NewWeighingSessionFlow
                            weightType={bulkWeightType}
                            onBack={closeModal}
                            onAnimalsSelected={handleAnimalsSelectedForBulk}
                        />
                    )}

                    {activeModal === 'bulkWeighing' && (
                        <Modal isOpen={true} onClose={closeModal} title={`Carga Masiva - ${bulkWeightType}`} size="fullscreen">
                            <BatchWeighingForm
                                weightType={bulkWeightType}
                                animalsToWeigh={bulkAnimals}
                                onSaveSuccess={handleBulkSaveSuccess}
                                onCancel={closeModal}
                            />
                        </Modal>
                    )}
                </>
            )}
        </>
    );
}
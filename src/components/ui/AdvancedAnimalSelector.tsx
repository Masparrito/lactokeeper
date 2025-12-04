import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Animal, Parturition, ServiceRecord, BreedingSeason, SireLot } from '../../db/local';
import { AppConfig } from '../../types/config';
import { Search, Filter, CheckCircle2, CheckSquare, MinusSquare, FileArchive, Users, FilterX } from 'lucide-react';
import { useInbreedingCheck } from '../../hooks/useInbreedingCheck';
import { formatAge, getAnimalZootecnicCategory } from '../../utils/calculations';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../../hooks/useAnimalStatus';
import { useVirtualizer } from '@tanstack/react-virtual';

// --- LÓGICA AUXILIAR DE STATUS (Mantenida intacta) ---
const getAnimalStatuses = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allSireLots: SireLot[], allBreedingSeasons: BreedingSeason[]): AnimalStatusKey[] => {
    const s: AnimalStatusKey[] = []; if (!animal) return [];
    if (animal.sex === 'Hembra') { const lp = allParturitions.filter(p=>p.goatId===animal.id&&p.status!=='finalizada').sort((a,b)=>new Date(b.parturitionDate).getTime()-new Date(a.parturitionDate).getTime())[0]; if (lp) { if (lp.status==='activa') s.push('MILKING'); else if (lp.status==='en-secado') s.push('DRYING_OFF'); else s.push('DRY'); } }
    if (animal.reproductiveStatus==='Preñada') s.push('PREGNANT'); else if (animal.reproductiveStatus==='En Servicio') { 
        const hasServiceRecord = allServiceRecords.some(sr=>sr.femaleId===animal.id&&sr.sireLotId===animal.sireLotId);
        if (hasServiceRecord) s.push('IN_SERVICE_CONFIRMED'); else s.push('IN_SERVICE'); 
    } else if (animal.reproductiveStatus==='Vacía'||animal.reproductiveStatus==='Post-Parto') s.push('EMPTY');
    if (animal.sex === 'Macho') { 
        const activeSeasons = allBreedingSeasons.filter(bs => bs.status === 'Activo');
        const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
        const isActiveSire = allSireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
        if(isActiveSire) s.push('SIRE_IN_SERVICE'); 
    }
    return Array.from(new Set(s));
};

const CATEGORIES = ['Cabrita', 'Cabritona', 'Cabra', 'Cabrito', 'Macho de Levante', 'Macho Cabrío'];

// --- COMPONENTES DE FILTRO ---
const FilterBar = ({ title, filters, activeFilter, onFilterChange }: { title: string, filters: any[], activeFilter: string, onFilterChange: (key: string) => void }) => (
    <div className="mb-3">
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{title}</label>
        <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onFilterChange('ALL')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${activeFilter==='ALL'?'bg-zinc-700 text-white border-zinc-600':'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>Todos</button>
            {filters.map(f => {
                const Icon = f.Icon || null;
                const isActive = activeFilter === f.key;
                return ( 
                    <button 
                        type="button" 
                        key={f.key} 
                        onClick={() => onFilterChange(f.key)} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${isActive ? 'bg-brand-blue/20 text-brand-blue border-brand-blue/30' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                    >
                        {Icon && <Icon size={14}/>}
                        {f.label}
                    </button> 
                );
            })}
        </div>
    </div>
);

const ModeToggle = ({ activeMode, setActiveMode }: { activeMode: 'Activo' | 'Referencia', setActiveMode: (mode: 'Activo' | 'Referencia') => void }) => (
    <div className="flex bg-black rounded-xl p-1 w-full border border-zinc-800 mb-4">
        <button 
            onClick={() => setActiveMode('Activo')} 
            className={`w-1/2 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${activeMode === 'Activo' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            <Users size={14} /> Activos
        </button>
        <button 
            onClick={() => setActiveMode('Referencia')} 
            className={`w-1/2 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${activeMode === 'Referencia' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            <FileArchive size={14} /> Referencia
        </button>
    </div>
);

// --- ITEM DE LISTA (Rediseñado) ---
const AnimalSelectionRow = ({ animal, isSelected, onToggle, inbreedingRisk }: {
    animal: Animal & { formattedAge: string, statuses: AnimalStatusKey[], zootecnicCategory: string },
    isSelected: boolean,
    onToggle: (id: string) => void,
    inbreedingRisk: boolean
}) => {
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        <div 
            onClick={() => onToggle(animal.id)}
            className={`
                relative w-full text-left p-3.5 mb-2 rounded-xl cursor-pointer transition-all border flex items-center justify-between group
                ${isSelected 
                    ? 'bg-brand-blue/10 border-brand-blue/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                    : inbreedingRisk 
                        ? 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20'
                        : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                }
            `}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-brand-blue border-brand-blue' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                    {isSelected && <CheckSquare size={14} className="text-white" />}
                </div>
                
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className={`font-mono font-bold text-base tracking-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                            {animal.id}
                        </span>
                        {formattedName && (
                            <span className="text-xs text-zinc-500 truncate max-w-[140px] font-medium">
                                {formattedName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 bg-black/50 px-1.5 py-0.5 rounded border border-zinc-800">
                            {animal.zootecnicCategory}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                             {animal.location || 'Sin Lote'}
                        </span>
                    </div>
                </div>
            </div>

            {inbreedingRisk && (
                <span className="text-[9px] font-bold text-red-400 uppercase bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                    Riesgo
                </span>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
interface AdvancedAnimalSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    animals: Animal[];
    parturitions: Parturition[];
    serviceRecords: ServiceRecord[];
    breedingSeasons: BreedingSeason[];
    sireLots: SireLot[];
    appConfig: AppConfig;
    title: string;
    sireIdForInbreedingCheck?: string;
    sessionType?: 'leche' | 'corporal';
}

export const AdvancedAnimalSelector: React.FC<AdvancedAnimalSelectorProps> = ({ 
    isOpen, onClose, onSelect, animals, parturitions, serviceRecords, 
    breedingSeasons, sireLots, title, sireIdForInbreedingCheck, 
    sessionType, appConfig 
}) => {
    const { isRelated } = useInbreedingCheck();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMode, setActiveMode] = useState<'Activo' | 'Referencia'>('Activo');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    const [isFiltersVisible, setIsFiltersVisible] = useState(false); 
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [productiveFilter, setProductiveFilter] = useState('ALL');
    const [reproductiveFilter, setReproductiveFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'Venta' | 'Muerte' | 'Descarte'>('ALL');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    const resetFilters = () => { 
        setCategoryFilter('ALL'); 
        setProductiveFilter('ALL'); 
        setReproductiveFilter('ALL'); 
        setStatusFilter('ALL');
    };

    // 1. Datos base
    const animalsWithAllData = useMemo(() => animals.map(animal => ({ 
        ...animal, 
        statuses: getAnimalStatuses(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
        formattedAge: formatAge(animal.birthDate),
        zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions, appConfig), 
    })), [animals, parturitions, serviceRecords, sireLots, breedingSeasons, appConfig]);

    // 2. Inicialización para sesiones
    useEffect(() => {
        if (isOpen && sessionType) {
            resetFilters(); 
            if (sessionType === 'leche') {
                 setProductiveFilter('MILKING');
            }
        }
    }, [isOpen, sessionType]);

    // 3. Filtrado
    const filteredAnimals = useMemo(() => {
        let filtered = animalsWithAllData;

        // Modo Activo/Referencia
        filtered = filtered.filter((animal: Animal) => {
            if (activeMode === 'Activo') {
                 return animal.status === 'Activo' && !animal.isReference; 
            } else {
                 return animal.isReference;
            }
        });

        // Filtros avanzados
        if (categoryFilter !== 'ALL') { filtered = filtered.filter((animal: any) => animal.zootecnicCategory === categoryFilter); }
        
        if (activeMode === 'Activo') {
            if (productiveFilter !== 'ALL') { filtered = filtered.filter((animal: any) => animal.statuses.includes(productiveFilter as AnimalStatusKey)); }
            if (reproductiveFilter !== 'ALL') { filtered = filtered.filter((animal: any) => animal.statuses.includes(reproductiveFilter as AnimalStatusKey)); }
        } else {
            if (statusFilter !== 'ALL') { filtered = filtered.filter((animal: any) => animal.status === statusFilter); }
        }

        if (sessionType === 'leche') {
            filtered = filtered.filter(animal => animal.statuses.includes('MILKING'));
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((animal: any) => 
                animal.id.toLowerCase().includes(term) ||
                (animal.name && animal.name.toLowerCase().includes(term))
            );
        }

        // Ordenar por ID
        return filtered.sort((a: any, b: any) => a.id.localeCompare(b.id));

    }, [animalsWithAllData, categoryFilter, productiveFilter, reproductiveFilter, statusFilter, activeMode, searchTerm, sessionType]);
    
    // Virtualización
    const rowVirtualizer = useVirtualizer({
        count: filteredAnimals.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 82, // Ajustado a la altura de la nueva tarjeta
        overscan: 5
    });

    // Selección
    const isAllSelected = useMemo(() => 
        filteredAnimals.length > 0 && filteredAnimals.every((a: any) => selectedIds.has(a.id)),
    [filteredAnimals, selectedIds]);

    const isSomeSelected = useMemo(() => 
        selectedIds.size > 0 && !isAllSelected,
    [selectedIds, isAllSelected]);

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAnimals.map((a: any) => a.id))); 
        }
    };

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleFinalSelect = () => {
        onSelect(Array.from(selectedIds));
        handleClose();
    };

    const handleClose = () => {
        setSelectedIds(new Set());
        setSearchTerm('');
        setIsFiltersVisible(false);
        onClose();
    };
    
    const formattedTitle = title.replace('Añadir animales a:', 'Lote:');

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={handleClose} 
                title={formattedTitle} 
                size="fullscreen"
            >
                <div className="flex flex-col h-full bg-black">
                    
                    {/* 1. Header Fijo (Búsqueda y Resumen) */}
                    <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-black/80 backdrop-blur-md border-b border-zinc-800 z-10">
                        
                        {/* Barra de Búsqueda Mejorada */}
                        <div className="relative mb-3">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                            <input
                                type="search"
                                placeholder="Buscar por ID o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-900/80 border border-zinc-700 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder-zinc-600 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all text-base shadow-inner"
                            />
                            
                            {/* Botón Filtros (Dentro de la barra) */}
                            <button 
                                onClick={() => setIsFiltersVisible(true)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${isFiltersVisible || categoryFilter !== 'ALL' ? 'text-brand-blue bg-brand-blue/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Filter size={20} />
                            </button>
                        </div>

                        {/* Barra de Selección Global */}
                        <div className="flex justify-between items-center py-2">
                            <button 
                                onClick={handleSelectAll} 
                                className="flex items-center gap-3 px-1 py-1 rounded-lg hover:bg-zinc-900/50 transition-colors group"
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isAllSelected ? 'bg-brand-blue border-brand-blue' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                    {isAllSelected ? <CheckSquare size={14} className="text-white" /> : isSomeSelected ? <MinusSquare size={14} className="text-zinc-400" /> : null}
                                </div>
                                <span className="text-sm font-semibold text-zinc-300 group-hover:text-white">
                                    {isAllSelected ? 'Deseleccionar' : 'Seleccionar Todo'}
                                </span>
                            </button>
                            <span className="text-xs font-mono text-zinc-500">
                                {filteredAnimals.length} resultados
                            </span>
                        </div>
                    </div>

                    {/* 2. Lista de Animales Virtualizada */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-2 pb-32 custom-scrollbar">
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const animal = filteredAnimals[virtualRow.index];
                                const isSelected = selectedIds.has(animal.id);
                                const hasInbreedingRisk = sireIdForInbreedingCheck ? isRelated(animal.id, sireIdForInbreedingCheck, animals) : false;
                                
                                return (
                                    <div
                                        key={virtualRow.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <AnimalSelectionRow 
                                            animal={animal} 
                                            isSelected={isSelected} 
                                            onToggle={handleToggleSelection}
                                            inbreedingRisk={hasInbreedingRisk}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        {filteredAnimals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                <Search size={48} className="opacity-20 mb-4" />
                                <p className="text-sm">No se encontraron animales.</p>
                            </div>
                        )}
                    </div>

                    {/* 3. Footer Flotante de Acción */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black via-black to-transparent z-20">
                        <div className="flex gap-3 max-w-md mx-auto">
                            <button 
                                onClick={handleClose}
                                className="px-6 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleFinalSelect}
                                disabled={selectedIds.size === 0}
                                className="flex-1 bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Asignar ({selectedIds.size})
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* 4. Modal de Filtros Avanzados */}
            <Modal
                isOpen={isFiltersVisible} 
                onClose={() => setIsFiltersVisible(false)}
                title="Filtrar Animales"
            >
                <div className="space-y-6 px-1 pb-2">
                    <ModeToggle activeMode={activeMode} setActiveMode={setActiveMode} />

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Categoría</label>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setCategoryFilter('ALL')} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${categoryFilter === 'ALL' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>Todas</button>
                            {CATEGORIES.map(key => (
                                <button key={key} onClick={() => setCategoryFilter(key)} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${categoryFilter === key ? 'bg-brand-blue text-white border-brand-blue' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {activeMode === 'Activo' && (
                        <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                            <FilterBar title="Estado Productivo" filters={['MILKING', 'DRYING_OFF', 'DRY'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} />
                            <FilterBar title="Estado Reproductivo" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} />
                        </div>
                    )}

                    {activeMode === 'Referencia' && (
                        <div className="pt-2 border-t border-zinc-800/50">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Causa de Baja</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${statusFilter === 'ALL' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>Todas</button>
                                <button onClick={() => setStatusFilter('Venta')} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${statusFilter === 'Venta' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>Venta</button>
                                <button onClick={() => setStatusFilter('Muerte')} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${statusFilter === 'Muerte' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>Muerte</button>
                                <button onClick={() => setStatusFilter('Descarte')} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${statusFilter === 'Descarte' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>Descarte</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-6 mt-4 border-t border-zinc-800">
                        <button onClick={resetFilters} className="text-zinc-400 text-xs font-bold hover:text-white flex items-center gap-2 px-2"><FilterX size={16}/> Limpiar Todo</button>
                        <button onClick={() => setIsFiltersVisible(false)} className="px-6 py-3 bg-white text-black font-bold rounded-xl shadow-lg hover:bg-gray-200 transition-colors">Ver Resultados</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
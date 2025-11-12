// src/components/ui/AdvancedAnimalSelector.tsx (CORREGIDO Y LIMPIO)

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
// (useData no se importa directamente aquí)
import { Animal, Parturition, ServiceRecord, BreedingSeason, SireLot } from '../../db/local';
// (NUEVO) Importar AppConfig
import { AppConfig } from '../../types/config';
// --- CAMBIO: Se eliminan imports no usados (ChevronDown, X, ActionSheetModal) ---
import { Search, FilterX, Users, FileArchive, CheckSquare, Square, Filter, MinusSquare } from 'lucide-react';
import { useInbreedingCheck } from '../../hooks/useInbreedingCheck';
import { formatAge, getAnimalZootecnicCategory } from '../../utils/calculations';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../../hooks/useAnimalStatus';
// --- CAMBIO: ActionSheetModal eliminado (no se usaba) ---
// import { ActionSheetModal } from './ActionSheetModal';


// --- LÓGICA AUXILIAR DE STATUS (Mantenida) ---
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

const FilterBar = ({ title, filters, activeFilter, onFilterChange }: { title: string, filters: any[], activeFilter: string, onFilterChange: (key: string) => void }) => (
     <div>
         <label className="block text-xs font-semibold text-zinc-400 mb-2">{title}</label>
         <div className="flex flex-wrap gap-2">
             <button type="button" onClick={() => onFilterChange('ALL')} className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter==='ALL'?'bg-zinc-600 text-white':'bg-zinc-800/80 text-zinc-300'}`}>Todos</button>
             {filters.map(f => {
                     const Icon = f.Icon || null;
                     return ( <button type="button" key={f.key} onClick={() => onFilterChange(f.key)} className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter===f.key?'bg-brand-blue text-white':'bg-zinc-800/80 text-zinc-300'}`}>{Icon && <Icon size={14}/>}{f.label}</button> );
             })}
         </div>
     </div>
);

const ModeToggle = ({ activeMode, setActiveMode }: { 
     activeMode: 'Activo' | 'Referencia', 
     setActiveMode: (mode: 'Activo' | 'Referencia') => void,
}) => (
     <div className="flex bg-zinc-900 rounded-xl p-1 w-full flex-shrink-0">
         <button 
             onClick={() => setActiveMode('Activo')} 
             className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeMode === 'Activo' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
         >
             <Users size={16} /> Activos
         </button>
         <button 
             onClick={() => setActiveMode('Referencia')} 
             className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeMode === 'Referencia' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
         >
             <FileArchive size={16} /> Referencia
             </button>
     </div>
);

// --- DEFINICIONES DE TIPOS ---
interface AdvancedAnimalSelectorProps {
     isOpen: boolean;
     onClose: () => void;
     onSelect: (selectedIds: string[]) => void;
     animals: Animal[];
     parturitions: Parturition[];
     serviceRecords: ServiceRecord[];
     breedingSeasons: BreedingSeason[];
     sireLots: SireLot[];
     // (NUEVO) Añadir 'appConfig'
     appConfig: AppConfig;
     title: string;
     sireIdForInbreedingCheck?: string;
     sessionType?: 'leche' | 'corporal';
}

// 2. Fila de Animal con Estilo Estándar
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
             className={`w-full text-left p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between min-h-[70px] 
                 ${inbreedingRisk ? 'bg-yellow-900/50 border border-yellow-500/60 hover:bg-yellow-800/50' : 'bg-zinc-800/50 hover:bg-zinc-700'}`}
         >
             <div className="flex items-center gap-3">
                 <span className='flex-shrink-0'>
                {/* --- CORRECCIÓN: La 'T' y otros artefactos han sido eliminados. --- */}
                         {isSelected ? <CheckSquare className="text-brand-green" size={20} /> : <Square className="text-zinc-500" size={20} />}
                     </span>
                     
                 <div className="min-w-0">
                     <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                     {formattedName && (
                         <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                     )}
                     <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                         <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                     </div>
                     </div>
                 </div>
                 {/* Indicador de Riesgo (Opcional) */}
         </div>
     );
};


// --- COMPONENTE PRINCIPAL DEL SELECTOR ---
export const AdvancedAnimalSelector: React.FC<AdvancedAnimalSelectorProps> = ({ 
    isOpen, onClose, onSelect, animals, parturitions, serviceRecords, 
    breedingSeasons, sireLots, title, sireIdForInbreedingCheck, 
    sessionType, 
    appConfig // (NUEVO) Recibir 'appConfig'
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
     
     const resetFilters = () => { 
         setCategoryFilter('ALL'); 
         setProductiveFilter('ALL'); 
         setReproductiveFilter('ALL'); 
         setStatusFilter('ALL');
     };

     // 1. Datos base con estados calculados
     const animalsWithAllData = useMemo(() => animals.map(animal => ({ 
         ...animal, 
         statuses: getAnimalStatuses(animal, parturitions, serviceRecords, sireLots, breedingSeasons),
         formattedAge: formatAge(animal.birthDate),
        // (CORREGIDO) Pasar 'appConfig'
         zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions, appConfig), 
     })), [animals, parturitions, serviceRecords, sireLots, breedingSeasons, appConfig]); // (NUEVO) 'appConfig' en dependencias

     // 2. Aplicar lógica de filtrado inicial (Kilos)
     useEffect(() => {
          if (isOpen && sessionType) {
             resetFilters(); 
             if (sessionType === 'leche') {
                     setProductiveFilter('MILKING');
             }
         }
     }, [isOpen, sessionType]);

     // 3. Lógica de Filtrado Principal
     const filteredAnimals = useMemo(() => {
         let filtered = animalsWithAllData;

         // --- FILTRO CRÍTICO 1: MODO ACTIVO vs. REFERENCIA (Lógica de Kilos) ---
         filtered = filtered.filter((animal: Animal) => {
             if (activeMode === 'Activo') {
                     return animal.status === 'Activo' && !animal.isReference && !animal.sireLotId; 
             } else {
                     return animal.isReference;
             }
         });

         // 4. Aplicar filtros avanzados
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

         return filtered.sort((a: any, b: any) => a.id.localeCompare(b.id));

     }, [animalsWithAllData, categoryFilter, productiveFilter, reproductiveFilter, statusFilter, activeMode, searchTerm, sessionType]);
     
     // 6. Pre-seleccionar todos los animales (Solo si es flujo de sesión)
     useEffect(() => {
         if(isOpen && sessionType) {
             setSelectedIds(new Set(filteredAnimals.map((a: any) => a.id)));
         }
     }, [filteredAnimals, isOpen, sessionType]);

     // --- Lógica para "Seleccionar Todos" ---
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
    
    // --- CAMBIO (Goal 3): Formatear el título ---
    const formattedTitle = title.replace('Añadir animales a:', 'Lote:');

     return (
         <>
             <Modal 
                isOpen={isOpen} 
                onClose={handleClose} 
                title={formattedTitle} 
                size="fullscreen"
            >
                {/* --- CAMBIO (Goal 4): Se eliminó `space-y-4` para controlar el espacio manualmente --- */}
                     <div className="flex flex-col h-full">
                         
                         {/* 1. Área Superior (Fija) */}
                    {/* --- CAMBIO (Goals 4, 5): `px-2` para más ancho, `pb-2` para menos espacio vertical --- */}
                         <div className="flex-shrink-0 space-y-3 px-2 pt-4 pb-2">
                                 {/* --- CAMBIO: Encabezado interno eliminado --- */}
                                 
                                 <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                     <input
                                             type="search"
                                             placeholder="Buscar ID o Nombre..."
                                             value={searchTerm}
                                             onChange={(e) => setSearchTerm(e.target.value)}
                                         className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                     />
                                 </div>
                         </div>

                         {/* 2. Área de Lista (Scrollable) */}
                    {/* --- CAMBIO (Goals 4, 5): `px-2` para más ancho, se eliminó `pt-4` --- */}
                         <div className="flex-grow overflow-y-auto space-y-2 px-2 min-h-[10rem]">
                                 
                                 <div className="flex justify-between items-center mb-2 px-2">
                                     <div 
                                             onClick={handleSelectAll} 
                                         className="flex items-center gap-3 cursor-pointer p-1"
                                     >
                                             {isAllSelected ? <CheckSquare className="text-brand-green" size={20} /> : 
                                             isSomeSelected ? <MinusSquare className="text-zinc-500" size={20} /> :
                                         <Square className="text-zinc-500" size={20} />}
                                             <span className="text-sm font-semibold text-zinc-300">
                                                 {isAllSelected ? 'Deseleccionar Todos' : 'Seleccionar Todos'} ({filteredAnimals.length})
                                             </span>
                                     </div>
                                     
                                     <button 
                                             onClick={() => setIsFiltersVisible(true)} 
                                             className="flex items-center gap-1.5 text-brand-blue font-semibold p-2 rounded-lg hover:bg-zinc-800"
                                 >
                                             <Filter size={16} />
                                             Filtros
                                     </button>
                                 </div>

                                 {filteredAnimals.length > 0 ? (
                                     filteredAnimals.map(animal => {
                                         const hasInbreedingRisk = sireIdForInbreedingCheck ? isRelated(animal.id, sireIdForInbreedingCheck, animals) : false;
                                         return (
                                         <AnimalSelectionRow 
                                                 key={animal.id}
                                             animal={animal} 
                                             isSelected={selectedIds.has(animal.id)}
                                             onToggle={handleToggleSelection}
                                             inbreedingRisk={hasInbreedingRisk}
                                         />
                                     );
                                     })
                             ) : (
                                 <p className="text-zinc-500 text-center py-8">
                                         {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : 'No hay animales con estos filtros.'}
                                     </p>
                             )}
                         </div>

                         {/* 3. Footer con Acciones */}
                    {/* --- CAMBIO (Goal 5): `px-2 py-4` para más ancho --- */}
                         <div className="flex-shrink-0 px-2 py-4 border-t border-zinc-700/50 bg-ios-modal-bg">
                             <div className="flex justify-between items-center">
                                     <button 
                                         onClick={handleClose} 
                                         className="text-zinc-400 hover:text-white px-4 py-2"
                                 >
                                         <span className='font-semibold'>Cancelar</span>
                                     </button>
                                     <button 
                                         onClick={handleFinalSelect}
                                         disabled={selectedIds.size === 0}
                                         className="bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50 transition-colors"
                                     >
                                         Seleccionar ({selectedIds.size})
                                     </button>
                             </div>
                         </div>
                         </div>
             </Modal>

             {/* --- 4. Panel de Filtros (Limpio y Corregido) --- */}
             <Modal
                 isOpen={isFiltersVisible} 
                 onClose={() => setIsFiltersVisible(false)}
                 title="Filtros"
                 size="default"
             >
                 <div className="space-y-4 px-4 pb-4">
                     <ModeToggle activeMode={activeMode} setActiveMode={setActiveMode} />

                     {/* Filtro de Categoría Zootécnica */}
                     <div>
                         <label className="block text-sm font-medium text-zinc-400 mb-2">Categoría Zootécnica</label>
                         <div className="flex flex-wrap gap-2">
                             <button onClick={() => setCategoryFilter('ALL')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${categoryFilter === 'ALL' ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>Todos</button>
                             {CATEGORIES.map(key => (
                                     <button key={key} onClick={() => setCategoryFilter(key)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${categoryFilter === key ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>
section-end                                          {key}
                                     </button>
                                 ))}
                         </div>
                         </div>
                         
                         {activeMode === 'Activo' && (
                                  <>
                                     <FilterBar title="Filtros Productivos" filters={['MILKING', 'DRYING_OFF', 'DRY'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} />
                                     <FilterBar title="Filtros Reproductivos" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'].map(k => STATUS_DEFINITIONS[k as AnimalStatusKey]).filter(Boolean)} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} />
                                 </>
                         )}

                         {activeMode === 'Referencia' && (
                             <div>
                                     <label className="block text-sm font-medium text-zinc-400 mb-2">Causa de Baja</label>
                                     <div className="flex flex-wrap gap-2">
                                         <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${statusFilter === 'ALL' ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>Todas</button>
                                         <button onClick={() => setStatusFilter('Venta')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${statusFilter === 'Venta' ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>Venta</button>
                                         <button onClick={() => setStatusFilter('Muerte')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${statusFilter === 'Muerte' ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>Muerte</button>
                                         <button onClick={() => setStatusFilter('Descarte')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${statusFilter === 'Descarte' ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>Descarte</button>
                                     </div>
                             </div>
                         )}
                         
                         <div className="flex justify-between items-center pt-4 border-t border-zinc-700/50">
section-end                                  <button onClick={resetFilters} className="flex-shrink-0 p-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"><FilterX size={16}/> <span className='ml-1 text-sm'>Limpiar Filtros</span></button>
                                 <button onClick={() => setIsFiltersVisible(false)} className="px-5 py-2 bg-brand-blue text-white font-bold rounded-lg">Ver Resultados</button>
                         </div>

                 </div>
             </Modal>
         </>
     );
};
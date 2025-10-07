import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal, Parturition, ServiceRecord, BreedingGroup } from '../../db/local';
import { CheckSquare, Square, AlertTriangle, Search, ChevronDown, History, FilterX, Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Droplets, Waypoints } from 'lucide-react';
import { useInbreedingCheck } from '../../hooks/useInbreedingCheck';
import { formatAge, getAnimalZootecnicCategory } from '../../utils/calculations';

// --- DEFINICIONES DE ESTADO Y FILTROS ---
const STATUS_DEFINITIONS = { PREGNANT: { key: 'PREGNANT', Icon: Baby, color: 'text-pink-400', label: 'Preñada' }, IN_SERVICE_CONFIRMED: { key: 'IN_SERVICE_CONFIRMED', Icon: HeartHandshake, color: 'text-pink-500', label: 'Servicio Visto' }, IN_SERVICE: { key: 'IN_SERVICE', Icon: Heart, color: 'text-red-400', label: 'En Monta' }, EMPTY: { key: 'EMPTY', Icon: CircleOff, color: 'text-zinc-500', label: 'Vacía' }, SIRE_IN_SERVICE: { key: 'SIRE_IN_SERVICE', Icon: Waypoints, color: 'text-blue-400', label: 'Reproductor Activo' }, MILKING: { key: 'MILKING', Icon: Droplets, color: 'text-blue-300', label: 'En Ordeño' }, DRYING_OFF: { key: 'DRYING_OFF', Icon: Wind, color: 'text-yellow-400', label: 'Secando' }, DRY: { key: 'DRY', Icon: Archive, color: 'text-zinc-400', label: 'Seca' }};
type AnimalStatusKey = keyof typeof STATUS_DEFINITIONS;

// --- LÓGICA DE CÁLCULO Y FILTRADO (UNIFICADA) ---
const getAnimalStatuses = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allBreedingGroups: BreedingGroup[]): AnimalStatusKey[] => {
    const s: AnimalStatusKey[] = []; if (!animal) return [];
    if (animal.sex === 'Hembra') { const lp = allParturitions.filter(p=>p.goatId===animal.id&&p.status!=='finalizada').sort((a,b)=>new Date(b.parturitionDate).getTime()-new Date(a.parturitionDate).getTime())[0]; if (lp) { if (lp.status==='activa') s.push('MILKING'); else if (lp.status==='en-secado') s.push('DRYING_OFF'); else if (lp.status==='seca') s.push('DRY'); } }
    if (animal.reproductiveStatus==='Preñada') s.push('PREGNANT'); else if (animal.reproductiveStatus==='En Servicio') { if (allServiceRecords.some(sr=>sr.femaleId===animal.id&&sr.breedingGroupId===animal.breedingGroupId)) s.push('IN_SERVICE_CONFIRMED'); else s.push('IN_SERVICE'); } else if (animal.reproductiveStatus==='Vacía'||animal.reproductiveStatus==='Post-Parto') s.push('EMPTY');
    if (animal.sex === 'Macho') { if (allBreedingGroups.some(bg=>bg.sireId===animal.id&&bg.status==='Activo')) s.push('SIRE_IN_SERVICE'); }
    return Array.from(new Set(s));
};

const CATEGORIES = ['Cabrita', 'Cabritona', 'Cabra', 'Cabrito', 'Macho de Levante', 'Macho Cabrío'];

const FilterBar = ({ title, filters, activeFilter, onFilterChange }: { title: string, filters: AnimalStatusKey[], activeFilter: string, onFilterChange: (key: string) => void }) => (
    <div>
        <label className="block text-xs font-semibold text-zinc-400 mb-2">{title}</label>
        <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onFilterChange('ALL')} className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter==='ALL'?'bg-zinc-600 text-white':'bg-zinc-800/80 text-zinc-300'}`}>Todos</button>
            {filters.map(key => { const {Icon,label}=STATUS_DEFINITIONS[key]; return ( <button type="button" key={key} onClick={() => onFilterChange(key)} className={`flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter===key?'bg-brand-blue text-white':'bg-zinc-800/80 text-zinc-300'}`}><Icon size={14}/>{label}</button> ); })}
        </div>
    </div>
);

interface AdvancedAnimalSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    animals: Animal[];
    parturitions: Parturition[];
    serviceRecords: ServiceRecord[];
    breedingGroups: BreedingGroup[];
    title: string;
    sireIdForInbreedingCheck?: string;
}

export const AdvancedAnimalSelector: React.FC<AdvancedAnimalSelectorProps> = ({ isOpen, onClose, onSelect, animals, parturitions, serviceRecords, breedingGroups, title, sireIdForInbreedingCheck }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { isRelated } = useInbreedingCheck();
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
    const [isLatestFilterActive, setIsLatestFilterActive] = useState(false);
    const [productiveFilter, setProductiveFilter] = useState('ALL');
    const [reproductiveFilter, setReproductiveFilter] = useState('ALL');

    const animalsWithAllData = useMemo(() => animals.map(animal => ({ 
        ...animal, 
        statuses: getAnimalStatuses(animal, parturitions, serviceRecords, breedingGroups),
        formattedAge: formatAge(animal.birthDate),
        zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions),
    })), [animals, parturitions, serviceRecords, breedingGroups]);

    const filteredAnimals = useMemo(() => {
        let filtered = animalsWithAllData;
        if (isLatestFilterActive) { return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 25); }
        if (categoryFilter !== 'Todos') { filtered = filtered.filter(animal => animal.zootecnicCategory === categoryFilter); }
        if (productiveFilter !== 'ALL') { filtered = filtered.filter(animal => animal.statuses.includes(productiveFilter as AnimalStatusKey)); }
        if (reproductiveFilter !== 'ALL') { filtered = filtered.filter(animal => animal.statuses.includes(reproductiveFilter as AnimalStatusKey)); }
        if (searchTerm) { filtered = filtered.filter(animal => animal.id.toLowerCase().includes(searchTerm.toLowerCase())); }
        return filtered;
    }, [animalsWithAllData, categoryFilter, isLatestFilterActive, productiveFilter, reproductiveFilter, searchTerm]);

    const handleSelectAll = () => { if (filteredAnimals.every(a => selectedIds.has(a.id))) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filteredAnimals.map(a => a.id))); } };
    const handleConfirmSelection = () => { onSelect(Array.from(selectedIds)); onClose(); };
    const resetFilters = () => { setCategoryFilter('Todos'); setIsLatestFilterActive(false); setProductiveFilter('ALL'); setReproductiveFilter('ALL'); setSearchTerm(''); };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="fullscreen">
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0 space-y-4">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" /><input type="search" placeholder="Buscar por ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-brand-orange" /></div>
                    <button onClick={() => setFiltersVisible(!filtersVisible)} className="w-full flex justify-between items-center text-zinc-400 hover:text-white"><span className="text-sm font-semibold">Filtros Avanzados</span><ChevronDown className={`transition-transform ${filtersVisible ? 'rotate-180' : ''}`} /></button>
                    {filtersVisible && (
                        <div className="space-y-4 p-4 bg-black/20 rounded-2xl animate-fade-in">
                            <FilterBar title="Filtros Productivos" filters={['MILKING', 'DRYING_OFF', 'DRY']} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} />
                            <FilterBar title="Filtros Reproductivos" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE']} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} />
                            <div className="flex gap-2 pt-2 border-t border-brand-border">
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-zinc-800 p-2 rounded-xl text-white border border-zinc-700 text-sm">
                                    <option value="Todos">Categoría Zootécnica...</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={() => setIsLatestFilterActive(!isLatestFilterActive)} className={`flex-shrink-0 flex items-center gap-2 p-2 rounded-xl border text-sm transition-colors ${isLatestFilterActive ? 'bg-brand-orange border-brand-orange text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-300'}`}><History size={16} /> Última Carga</button>
                                <button onClick={resetFilters} className="flex-shrink-0 p-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300"><FilterX size={16}/></button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 py-4 min-h-[10rem]">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => {
                            const hasInbreedingRisk = sireIdForInbreedingCheck ? isRelated(animal.id, sireIdForInbreedingCheck, animals) : false;
                            return (
                                <div key={animal.id} onClick={() => setSelectedIds(prev => { const s = new Set(prev); s.has(animal.id)?s.delete(animal.id):s.add(animal.id); return s; })} className={`w-full text-left p-3 flex items-center gap-4 rounded-lg cursor-pointer transition-colors ${hasInbreedingRisk ? 'bg-yellow-900/50 border border-yellow-500/60 hover:bg-yellow-800/50' : 'bg-zinc-800/50 hover:bg-zinc-700'}`}>
                                    {selectedIds.has(animal.id) ? <CheckSquare className="text-brand-orange flex-shrink-0" /> : <Square className="text-zinc-500 flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <p className="font-bold text-white flex items-center gap-2">{animal.id} {hasInbreedingRisk && <AlertTriangle className="text-yellow-400" size={16} />}</p>
                                        <p className="text-xs text-zinc-400">{animal.sex} | {animal.formattedAge} | {animal.zootecnicCategory} {animal.location && `| Lote: ${animal.location}`}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : ( <div className="flex-grow flex items-center justify-center"><p className="text-zinc-500 text-center">No se encontraron animales.</p></div> )}
                </div>
                <div className="flex-shrink-0 grid grid-cols-3 items-center pt-4 border-t border-brand-border gap-2">
                    <button type="button" onClick={handleSelectAll} disabled={filteredAnimals.length === 0} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-2 rounded-lg disabled:opacity-50 text-sm">{filteredAnimals.every(a => selectedIds.has(a.id)) ? 'Deseleccionar' : 'Sel. Todos'}</button>
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 px-2 rounded-lg text-sm">Cancelar</button>
                    <button onClick={handleConfirmSelection} className="bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-2 rounded-lg disabled:opacity-50 text-sm">Seleccionar ({selectedIds.size})</button>
                </div>
            </div>
        </Modal>
    );
};
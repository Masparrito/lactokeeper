import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { Plus, ChevronRight, Settings, History, FilterX, Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Droplets, Waypoints, ChevronDown } from 'lucide-react'; 
import { PageState } from './RebanoShell';
import { Animal, Parturition, ServiceRecord, BreedingGroup } from '../db/local';
// --- CORRECCIÓN: Se elimina 'calculateAgeInDays' que ya no se usa directamente ---
import { formatAge, getAnimalZootecnicCategory } from '../utils/calculations';
import { StatusIcons } from '../components/icons/StatusIcons';

// --- CORRECCIÓN: Se restauran las propiedades 'key' y 'label' que faltaban ---
const STATUS_DEFINITIONS = {
    PREGNANT: { key: 'PREGNANT', Icon: Baby, color: 'text-pink-400', label: 'Preñada' },
    IN_SERVICE_CONFIRMED: { key: 'IN_SERVICE_CONFIRMED', Icon: HeartHandshake, color: 'text-pink-500', label: 'Servicio Visto' },
    IN_SERVICE: { key: 'IN_SERVICE', Icon: Heart, color: 'text-red-400', label: 'En Monta' },
    EMPTY: { key: 'EMPTY', Icon: CircleOff, color: 'text-zinc-500', label: 'Vacía' },
    SIRE_IN_SERVICE: { key: 'SIRE_IN_SERVICE', Icon: Waypoints, color: 'text-blue-400', label: 'Reproductor Activo' },
    MILKING: { key: 'MILKING', Icon: Droplets, color: 'text-blue-300', label: 'En Ordeño' },
    DRYING_OFF: { key: 'DRYING_OFF', Icon: Wind, color: 'text-yellow-400', label: 'Secando' },
    DRY: { key: 'DRY', Icon: Archive, color: 'text-zinc-400', label: 'Seca' },
};
type AnimalStatusKey = keyof typeof STATUS_DEFINITIONS;

// --- (El resto de funciones y componentes internos no necesitan cambios) ---
const getAnimalStatuses = (animal: Animal, allParturitions: Parturition[], allServiceRecords: ServiceRecord[], allBreedingGroups: BreedingGroup[]): AnimalStatusKey[] => {
    const activeStatuses: AnimalStatusKey[] = []; if (!animal) return [];
    if (animal.sex === 'Hembra') {
        const lastParturition = allParturitions.filter(p => p.goatId === animal.id && p.status !== 'finalizada').sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
        if (lastParturition) {
            if (lastParturition.status === 'activa') activeStatuses.push('MILKING');
            else if (lastParturition.status === 'en-secado') activeStatuses.push('DRYING_OFF');
            else if (lastParturition.status === 'seca') activeStatuses.push('DRY');
        }
    }
    if (animal.reproductiveStatus === 'Preñada') activeStatuses.push('PREGNANT');
    else if (animal.reproductiveStatus === 'En Servicio') {
        const hasServiceRecord = allServiceRecords.some(sr => sr.femaleId === animal.id && sr.breedingGroupId === animal.breedingGroupId);
        if (hasServiceRecord) activeStatuses.push('IN_SERVICE_CONFIRMED'); else activeStatuses.push('IN_SERVICE');
    }
    else if (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') { activeStatuses.push('EMPTY'); }
    if (animal.sex === 'Macho') {
        const isActiveSire = allBreedingGroups.some(bg => bg.sireId === animal.id && bg.status === 'Activo');
        if (isActiveSire) activeStatuses.push('SIRE_IN_SERVICE');
    }
    return Array.from(new Set(activeStatuses));
};
const PRIMARY_FILTERS = {
    'Cabras': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Cabra',
    'Cabritonas': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Cabritona',
    'Cabritas': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Cabrita',
    'Machos Cabríos': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Macho Cabrío',
    'Machos de Levante': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Macho de Levante',
    'Cabritos': (animal: Animal, parturitions: Parturition[]) => getAnimalZootecnicCategory(animal, parturitions) === 'Cabrito',
};
const AnimalRow = ({ animal, onSelect }: { animal: any, onSelect: (id: string) => void }) => {
    const statusObjects = animal.statuses.map((key: AnimalStatusKey) => STATUS_DEFINITIONS[key]);
    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-orange transition-colors">
            <div>
                <p className="font-bold text-lg text-white">{animal.id}</p>
                <p className="text-sm text-zinc-400 mt-1">{animal.sex} | {animal.formattedAge} | {animal.zootecnicCategory}</p>
            </div>
            <div className="flex items-center gap-3">
                <StatusIcons statuses={statusObjects} />
                <p className="hidden sm:block text-sm text-zinc-500 font-medium w-24 text-right">Lote: {animal.location || 'N/A'}</p>
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};
const FilterBar = ({ title, filters, activeFilter, onFilterChange }: { title: string, filters: AnimalStatusKey[], activeFilter: string, onFilterChange: (key: string) => void }) => (
    <div>
        <label className="block text-sm font-semibold text-zinc-400 mb-2">{title}</label>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => onFilterChange('ALL')} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === 'ALL' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/80 text-zinc-300'}`}>Todos</button>
            {filters.map(key => { const { Icon, label } = STATUS_DEFINITIONS[key]; return ( <button key={key} onClick={() => onFilterChange(key)} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === key ? 'bg-brand-blue text-white' : 'bg-zinc-800/80 text-zinc-300'}`}><Icon size={14} />{label}</button> ); })}
        </div>
    </div>
);

interface HerdPageProps {
    navigateTo: (page: PageState) => void;
    locationFilter?: string;
}

export default function HerdPage({ navigateTo, locationFilter }: HerdPageProps) {
    const { animals, parturitions, serviceRecords, breedingGroups, isLoading } = useData();
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
    const [isLatestFilterActive, setIsLatestFilterActive] = useState(false);
    const [productiveFilter, setProductiveFilter] = useState('ALL');
    const [reproductiveFilter, setReproductiveFilter] = useState('ALL');
    const [productiveFiltersVisible, setProductiveFiltersVisible] = useState(false);
    const [reproductiveFiltersVisible, setReproductiveFiltersVisible] = useState(false);

    const animalsWithAllData = useMemo(() => {
        return animals.map(animal => ({
            ...animal,
            statuses: getAnimalStatuses(animal, parturitions, serviceRecords, breedingGroups),
            formattedAge: formatAge(animal.birthDate),
            zootecnicCategory: getAnimalZootecnicCategory(animal, parturitions),
        }));
    }, [animals, parturitions, serviceRecords, breedingGroups]);

    const filteredByUI = useMemo(() => {
        let filtered = animalsWithAllData;
        if (isLatestFilterActive) { return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 25); }
        if (locationFilter) { filtered = filtered.filter(animal => (animal.location || 'Sin Asignar') === locationFilter); }
        if (categoryFilter !== 'Todos') { filtered = filtered.filter(animal => animal.zootecnicCategory === categoryFilter); }
        if (productiveFilter !== 'ALL') { filtered = filtered.filter(animal => animal.statuses.includes(productiveFilter as AnimalStatusKey)); }
        if (reproductiveFilter !== 'ALL') { filtered = filtered.filter(animal => animal.statuses.includes(reproductiveFilter as AnimalStatusKey)); }
        return filtered;
    }, [animalsWithAllData, categoryFilter, locationFilter, isLatestFilterActive, productiveFilter, reproductiveFilter]);

    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id']);
    
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setIsLatestFilterActive(false);
        setCategoryFilter(e.target.value);
    };
    
    const toggleLatestFilter = () => {
        const newFilterState = !isLatestFilterActive;
        setIsLatestFilterActive(newFilterState);
        if (newFilterState) { setCategoryFilter('Todos'); }
    };

    const resetAllFilters = () => {
        setCategoryFilter('Todos');
        setIsLatestFilterActive(false);
        setProductiveFilter('ALL');
        setReproductiveFilter('ALL');
        setSearchTerm('');
    };

    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>; }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <SearchHeader 
                title={locationFilter || "Mi Rebaño"}
                subtitle={isLatestFilterActive ? `Últimos ${filteredItems.length} animales cargados` : `${filteredItems.length} animales en la vista`}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            <div className="space-y-4 px-4">
                <button onClick={() => navigateTo({ name: 'add-animal' })} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base"><Plus size={18} /> Ingresar Nuevo Animal</button>
                <div className="space-y-4 bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <div className="space-y-3">
                        <button onClick={() => setProductiveFiltersVisible(!productiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                            <span>Filtros Productivos</span>
                            <ChevronDown className={`transition-transform ${productiveFiltersVisible ? 'rotate-180' : ''}`} size={18} />
                        </button>
                        {productiveFiltersVisible && (<div className="animate-fade-in"><FilterBar title="" filters={['MILKING', 'DRYING_OFF', 'DRY']} activeFilter={productiveFilter} onFilterChange={setProductiveFilter} /></div>)}
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => setReproductiveFiltersVisible(!reproductiveFiltersVisible)} className="w-full flex justify-between items-center text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                            <span>Filtros Reproductivos</span>
                            <ChevronDown className={`transition-transform ${reproductiveFiltersVisible ? 'rotate-180' : ''}`} size={18} />
                        </button>
                        {reproductiveFiltersVisible && (<div className="animate-fade-in"><FilterBar title="" filters={['PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE']} activeFilter={reproductiveFilter} onFilterChange={setReproductiveFilter} /></div>)}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <button onClick={toggleLatestFilter} title="Última Carga" className={`flex items-center gap-2 py-1 px-3 text-sm font-semibold rounded-lg transition-colors ${isLatestFilterActive ? 'text-brand-orange' : 'text-zinc-400 hover:text-brand-orange'}`}><History size={16} /> Última Carga</button>
                    <div className='flex items-center gap-4'>
                        <button onClick={() => navigateTo({ name: 'manage-lots' })} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><Settings size={14} /> Gestionar Lotes</button>
                        <button onClick={resetAllFilters} className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"><FilterX size={14} /> Limpiar</button>
                    </div>
                </div>
                <select value={categoryFilter} onChange={handleCategoryChange} className="w-full bg-brand-glass p-3 rounded-xl text-white border border-brand-border focus:border-brand-orange focus:ring-0">
                    <option value="Todos">Todas las Categorías Zootécnicas</option>
                    {Object.keys(PRIMARY_FILTERS).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>
            <div className="space-y-2 pt-4">
                {filteredItems.length > 0 ? (
                    filteredItems.map(animal => ( <AnimalRow key={animal.id} animal={animal} onSelect={() => navigateTo({ name: 'rebano-profile', animalId: animal.id })} /> ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4"><p className="text-zinc-400">{searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay animales que coincidan con los filtros actuales."}</p></div>
                )}
            </div>
        </div>
    );
}
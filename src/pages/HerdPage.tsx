import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { Plus, ChevronRight, Settings } from 'lucide-react';
import { PageState } from './RebanoShell';
import { Animal, Parturition } from '../db/local';
import { calculateAgeInDays } from '../utils/calculations';

// Lógica de filtros zootécnicos precisos
const PRIMARY_FILTERS = {
    'Cabras': (animal: Animal, parturitions: Parturition[]) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        const hasParturitions = parturitions.some(p => p.goatId === animal.id);
        return animal.sex === 'Hembra' && ageInDays > 365 && hasParturitions;
    },
    'Cabritonas': (animal: Animal, parturitions: Parturition[]) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        const hasParturitions = parturitions.some(p => p.goatId === animal.id);
        return animal.sex === 'Hembra' && ageInDays > 60 && !hasParturitions;
    },
    'Cabritas': (animal: Animal) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return animal.sex === 'Hembra' && ageInDays >= 0 && ageInDays <= 60;
    },
    'Machos Cabríos': (animal: Animal) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return animal.sex === 'Macho' && ageInDays > 365;
    },
    'Machos de Levante': (animal: Animal) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return animal.sex === 'Macho' && ageInDays > 60 && ageInDays <= 365;
    },
    'Cabritos': (animal: Animal) => {
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return animal.sex === 'Macho' && ageInDays >= 0 && ageInDays <= 60;
    },
};


const AnimalRow = ({ animal, onSelect }: { animal: Animal, onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-orange transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{animal.id}</p>
            <p className="text-sm text-zinc-400">
                {animal.sex} | {calculateAgeInDays(animal.birthDate)} días | Lote: {animal.location || 'N/A'}
            </p>
        </div>
        <ChevronRight className="text-zinc-600" />
    </button>
);

interface HerdPageProps {
    navigateTo: (page: PageState) => void;
    locationFilter?: string;
}

export default function HerdPage({ navigateTo, locationFilter }: HerdPageProps) {
    const { animals, parturitions, isLoading } = useData();
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

    const filteredByUI = useMemo(() => {
        return animals
            .filter(animal => {
                if (locationFilter) {
                    const animalLocation = animal.location || 'Sin Asignar';
                    return animalLocation === locationFilter;
                }
                return true;
            })
            .filter(animal => {
                if (categoryFilter === 'Todos') return true;
                const filterFn = (PRIMARY_FILTERS as any)[categoryFilter];
                return filterFn ? filterFn(animal, parturitions) : false;
            });
    }, [animals, parturitions, categoryFilter, locationFilter]);

    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id']);

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <SearchHeader 
                title={locationFilter || "Mi Rebaño"}
                subtitle={`${filteredItems.length} animales en la vista`}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            <div className="space-y-4">
                <button 
                    onClick={() => navigateTo({ name: 'add-animal' })}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"
                >
                    <Plus size={20} /> Ingresar Nuevo Animal
                </button>
                
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => navigateTo({ name: 'manage-lots' })}
                        className="flex items-center gap-2 text-zinc-400 hover:text-brand-orange text-sm font-semibold py-1 px-3"
                    >
                        <Settings size={14} /> Gestionar Lotes
                    </button>
                </div>
                
                <select 
                    value={categoryFilter} 
                    onChange={e => setCategoryFilter(e.target.value)} 
                    className="w-full bg-brand-glass p-3 rounded-xl text-white border border-brand-border focus:border-brand-orange focus:ring-0"
                >
                    <option value="Todos">Todas las Categorías</option>
                    {Object.keys(PRIMARY_FILTERS).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
            </div>

            <div className="space-y-2 pt-4">
                {filteredItems.length > 0 ? (
                    filteredItems.map(animal => (
                        <AnimalRow 
                            key={animal.id} 
                            animal={animal} 
                            onSelect={() => navigateTo({ name: 'rebano-profile', animalId: animal.id })} 
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-400">
                            {searchTerm 
                                ? `No se encontraron resultados para "${searchTerm}"` 
                                : "No hay animales que coincidan con los filtros."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
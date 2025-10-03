import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useSearch } from '../hooks/useSearch';
import { SearchHeader } from '../components/ui/SearchHeader';
import { Plus, ChevronRight, Settings } from 'lucide-react';
import { PageState } from './RebanoShell'; // RUTA DE IMPORTACIÓN CORREGIDA
import { Animal } from '../db/local';

// Componente para una fila de la lista de animales
const AnimalRow = ({ animal, onSelect }: { animal: Animal, onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-amber transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{animal.id}</p>
            <p className="text-sm text-zinc-400">
                {animal.sex} | {animal.lifecycleStage} | Lote: {animal.location}
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
    const { animals, isLoading } = useData();
    const [sexFilter, setSexFilter] = useState<'all' | 'Hembra' | 'Macho'>('all');

    // Primero, aplica los filtros de la UI
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
                if (sexFilter === 'all') return true;
                return animal.sex === sexFilter;
            });
    }, [animals, sexFilter, locationFilter]);

    // Luego, aplica la búsqueda sobre la lista ya filtrada
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(filteredByUI, ['id']);

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando rebaño...</h1></div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
            <SearchHeader 
                title={locationFilter || "Mi Rebaño"}
                subtitle={`${filteredItems.length} de ${animals.length} animales registrados`}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            <div className="space-y-4">
                <button 
                    onClick={() => navigateTo({ name: 'add-animal' })}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"
                >
                    <Plus size={20} /> Ingresar Nuevo Animal
                </button>
                
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => navigateTo({ name: 'manage-lots' })}
                        className="flex items-center gap-2 text-zinc-400 hover:text-brand-amber text-sm font-semibold py-1 px-3"
                    >
                        <Settings size={14} /> Gestionar Lotes
                    </button>
                </div>
                
                <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                    <button onClick={() => setSexFilter('all')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${sexFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Todos</button>
                    <button onClick={() => setSexFilter('Hembra')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${sexFilter === 'Hembra' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Hembras</button>
                    <button onClick={() => setSexFilter('Macho')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${sexFilter === 'Macho' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Machos</button>
                </div>
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
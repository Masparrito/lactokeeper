import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal } from '../../db/local';
import { Search } from 'lucide-react';

// --- SUB-COMPONENTE PARA EL INTERRUPTOR DE FILTRO ---
const FilterToggle = ({ activeFilter, setActiveFilter }: { activeFilter: 'Activo' | 'Referencia', setActiveFilter: (filter: 'Activo' | 'Referencia') => void }) => (
    <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
        <button 
            onClick={() => setActiveFilter('Activo')} 
            className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Activo' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
        >
            Animales Activos
        </button>
        <button 
            onClick={() => setActiveFilter('Referencia')} 
            className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}
        >
            De Referencia
        </button>
    </div>
);

interface AnimalSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (animalId: string) => void;
    animals: Animal[];
    title: string;
    filterSex?: 'Hembra' | 'Macho';
}

export const AnimalSelectorModal: React.FC<AnimalSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    animals,
    title,
    filterSex,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Activo' | 'Referencia'>('Activo');

    const filteredAnimals = useMemo(() => {
        return animals
            .filter(animal => {
                // Filtro por sexo, si se especifica
                if (filterSex && animal.sex !== filterSex) return false;
                
                // Filtro por categoría (Activo vs Referencia)
                const isRef = animal.isReference || false;
                if (activeFilter === 'Referencia') return isRef;
                return !isRef; // Por defecto, muestra los que no son de referencia
            })
            .filter(animal => {
                // Filtro por término de búsqueda
                if (!searchTerm) return true;
                return animal.id.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [animals, searchTerm, activeFilter, filterSex]);

    const handleSelect = (animalId: string) => {
        onSelect(animalId);
        setSearchTerm(''); // Limpia la búsqueda para la próxima vez
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="search"
                        placeholder="Buscar por ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                </div>

                <FilterToggle activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => (
                            <button 
                                key={animal.id} 
                                onClick={() => handleSelect(animal.id)}
                                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                <p className="font-bold text-white">{animal.id}</p>
                                <p className="text-xs text-zinc-400">
                                    {animal.race || animal.racialComposition || 'Mestizo'}
                                </p>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-zinc-500 py-8">No se encontraron animales con estos filtros.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};
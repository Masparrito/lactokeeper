import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal } from '../../db/local';
import { Search, PlusCircle } from 'lucide-react';

// --- NUEVA: Función para calcular la edad en meses ---
const calculateAgeInMonths = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    // Ajuste si aún no ha pasado el día del cumpleaños en el mes actual
    if (today.getDate() < birth.getDate()) {
        months--;
    }
    return months <= 0 ? 0 : months;
};

interface AnimalSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (animalId: string) => void;
    animals: Animal[];
    title: string;
    filterSex?: 'Hembra' | 'Macho';
    // --- NUEVAS PROPS PARA FILTRAR POR EDAD ---
    minAgeMonths?: number;
    maxAgeMonths?: number;
}

export const AnimalSelectorModal: React.FC<AnimalSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    animals,
    title,
    filterSex,
    minAgeMonths,
    maxAgeMonths,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Activo' | 'Referencia'>('Activo');

    const filteredAnimals = useMemo(() => {
        return animals
            .filter(animal => {
                if (filterSex && animal.sex !== filterSex) return false;
                return true;
            })
            .filter(animal => {
                const isRef = animal.isReference || false;
                if (activeFilter === 'Referencia') return isRef;
                return !isRef;
            })
            // --- NUEVO FILTRO POR EDAD ---
            .filter(animal => {
                const ageInMonths = calculateAgeInMonths(animal.birthDate);
                if (minAgeMonths && ageInMonths < minAgeMonths) return false;
                if (maxAgeMonths && ageInMonths > maxAgeMonths) return false;
                return true;
            })
            .filter(animal => {
                if (!searchTerm) return true;
                return animal.id.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [animals, searchTerm, activeFilter, filterSex, minAgeMonths, maxAgeMonths]);

    const handleSelect = (animalId: string) => {
        onSelect(animalId);
        setSearchTerm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="search"
                            placeholder="Buscar por ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-amber"
                        />
                    </div>
                    <button 
                        onClick={() => alert('Próximamente: Añadir nuevo animal de genealogía')} 
                        className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                        aria-label="Añadir nuevo animal"
                    >
                        <PlusCircle size={24} />
                    </button>
                </div>

                <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
                    <button onClick={() => setActiveFilter('Activo')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Activo' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>
                        Animales Activos
                    </button>
                    <button onClick={() => setActiveFilter('Referencia')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>
                        De Referencia
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => (
                            <button 
                                key={animal.id} 
                                onClick={() => handleSelect(animal.id)}
                                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg"
                            >
                                <p className="font-bold text-white">{animal.id}</p>
                                <p className="text-xs text-zinc-400">
                                    {/* Mostramos la edad para que el usuario verifique */}
                                    Edad: {calculateAgeInMonths(animal.birthDate)} meses
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
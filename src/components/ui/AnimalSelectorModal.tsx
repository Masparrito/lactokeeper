// src/components/ui/AnimalSelectorModal.tsx

import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal } from '../../db/local'; // Import Father if needed for typing formatAnimalDisplay
import { Search } from 'lucide-react';
import { formatAge } from '../../utils/calculations';
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// --- SUB-COMPONENTES PARA LOS INTERRUPTORES DE FILTRO ---
const MainFilterToggle = ({ activeFilter, setActiveFilter }: { activeFilter: 'Activo' | 'Referencia', setActiveFilter: (filter: 'Activo' | 'Referencia') => void }) => (
    <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
        <button onClick={() => setActiveFilter('Activo')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Activo' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Activos</button>
        <button onClick={() => setActiveFilter('Referencia')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>De Referencia</button>
    </div>
);

const ReferenceSubFilterToggle = ({ activeFilter, setFilter }: { activeFilter: string, setFilter: (filter: 'all' | 'Venta' | 'Muerte' | 'Descarte') => void }) => {
    const filters: { key: 'all' | 'Venta' | 'Muerte' | 'Descarte'; label: string }[] = [
        { key: 'all', label: 'Todos' }, { key: 'Venta', label: 'Vendidos' },
        { key: 'Muerte', label: 'Muertos' }, { key: 'Descarte', label: 'Descartados' }
    ];
    return (
        <div className="p-3 bg-black/20 rounded-lg">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Filtrar por estado:</label>
            <div className="flex flex-wrap gap-2">
                {filters.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === f.key ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- PROPIEDADES DEL MODAL ---
interface AnimalSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (animalId: string) => void;
    // Permitir 'Animal' o una estructura mínima para padres externos
    animals: (Animal | (Partial<Animal> & { id: string, name?: string }))[];
    title: string;
    filterSex?: 'Hembra' | 'Macho';
}

// --- COMPONENTE PRINCIPAL DEL MODAL ---
export const AnimalSelectorModal: React.FC<AnimalSelectorModalProps> = ({ isOpen, onClose, onSelect, animals, title, filterSex }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Activo' | 'Referencia'>('Activo');
    const [referenceSubFilter, setReferenceSubFilter] = useState<'all' | 'Venta' | 'Muerte' | 'Descarte'>('all');

    const handleMainFilterChange = (filter: 'Activo' | 'Referencia') => {
        setActiveFilter(filter);
        setReferenceSubFilter('all'); // Resetear subfiltro al cambiar filtro principal
    };

    // Filtrado de animales
    const filteredAnimals = useMemo(() => {
        return animals
            .filter(animal => {
                // Filtrar por sexo si se especifica
                if (filterSex && animal.sex && animal.sex !== filterSex) return false;

                // Determinar si es de referencia (usando 'isReference' o si falta 'status')
                const isRef = animal.isReference || typeof animal.status === 'undefined'; // Asumir Referencia si no tiene status completo

                // Aplicar filtro principal (Activo/Referencia)
                if (activeFilter === 'Referencia') {
                    if (!isRef) return false; // Si buscamos Referencia y no lo es, fuera
                    // Aplicar subfiltro de estado si no es 'todos'
                    if (referenceSubFilter !== 'all') {
                        return animal.status === referenceSubFilter;
                    }
                    return true; // Es de referencia y no hay subfiltro
                }
                return !isRef; // Si buscamos Activo, solo incluir los que NO son de referencia
            })
            .filter(animal => {
                // Aplicar filtro de búsqueda por ID o Nombre
                if (!searchTerm) return true; // Si no hay búsqueda, incluir todos
                const term = searchTerm.toLowerCase();
                // Buscar en ID y Nombre (si existe)
                return animal.id.toLowerCase().includes(term) ||
                       (animal.name && animal.name.toLowerCase().includes(term));
            });
    }, [animals, searchTerm, activeFilter, referenceSubFilter, filterSex]);

    // Manejar selección de animal
    const handleSelect = (animalId: string) => {
        onSelect(animalId); // Llama a la función onSelect pasada como prop
        setSearchTerm(''); // Limpia la búsqueda
        // onClose(); // Podrías cerrar el modal aquí si prefieres
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                {/* Barra de búsqueda */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="search"
                        placeholder="Buscar ID o Nombre..." // Actualizado placeholder
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    />
                </div>

                {/* Filtro principal Activo/Referencia */}
                <MainFilterToggle activeFilter={activeFilter} setActiveFilter={handleMainFilterChange} />

                {/* Subfiltro si 'Referencia' está activo */}
                {activeFilter === 'Referencia' && (
                    <div className="animate-fade-in">
                        <ReferenceSubFilterToggle activeFilter={referenceSubFilter} setFilter={setReferenceSubFilter} />
                    </div>
                )}

                {/* Lista de animales filtrados */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => (
                            <button
                                key={animal.id}
                                onClick={() => handleSelect(animal.id)}
                                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                {/* --- USO DE formatAnimalDisplay --- */}
                                <p className="font-bold text-white">{formatAnimalDisplay(animal)}</p>
                                {/* Mostrar detalles adicionales */}
                                <p className="text-xs text-zinc-400">
                                    {/* Mostrar sexo si existe, edad si hay fecha, lote si existe */}
                                    {animal.sex ? `${animal.sex} | ` : ''}
                                    {animal.birthDate && animal.birthDate !== 'N/A' ? `${formatAge(animal.birthDate)} | ` : ''}
                                    Lote: {animal.location || 'Sin Asignar'}
                                </p>
                            </button>
                        ))
                    ) : (
                        // Mensaje si no hay resultados
                        <p className="text-center text-zinc-500 py-8">No se encontraron animales con estos filtros.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};
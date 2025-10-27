// src/components/ui/AnimalSelectorModal.tsx

import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal } from '../../db/local'; // Import Animal type
import { Search } from 'lucide-react';
import { formatAge } from '../../utils/calculations';
// formatAnimalDisplay ya no se usa para la lista principal aquí

// --- SUB-COMPONENTES PARA LOS INTERRUPTORES DE FILTRO (sin cambios) ---
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
    // Aceptar Animal (completo o parcial)
    animals: (Partial<Animal> & { id: string, name?: string })[];
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
                if (filterSex && animal.sex && animal.sex !== filterSex) return false;
                const isRef = animal.isReference;

                if (activeFilter === 'Referencia') {
                    if (!isRef) return false;
                    if (referenceSubFilter !== 'all') {
                        return animal.status === referenceSubFilter;
                    }
                    return true;
                }
                return !isRef; // activeFilter === 'Activo'
            })
            .filter(animal => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                // --- CAMBIO: Buscar en ID y Nombre por separado ---
                const idMatch = animal.id.toLowerCase().includes(term);
                const nameMatch = animal.name && animal.name.toLowerCase().includes(term);
                return idMatch || nameMatch;
            })
            // --- CAMBIO: Ordenar por ID ---
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, searchTerm, activeFilter, referenceSubFilter, filterSex]);

    // Manejar selección de animal
    const handleSelect = (animalId: string) => {
        onSelect(animalId);
        setSearchTerm(''); // Limpiar búsqueda al seleccionar
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                {/* Barra de búsqueda */}
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
                        filteredAnimals.map(animal => {
                             // --- CAMBIO: Preparar nombre formateado ---
                             const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';
                             return (
                                <button
                                    key={animal.id}
                                    onClick={() => handleSelect(animal.id)}
                                    className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                                    <div className="min-w-0"> {/* Permitir que el texto se encoja y trunque */}
                                        {/* ID (Protagonista) - Fuente y tamaño aplicados */}
                                        <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>

                                        {/* Nombre (Secundario, si existe) */}
                                        {formattedName && (
                                          <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                                        )}

                                        {/* Detalles (Contexto) */}
                                        <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                                            {animal.sex ? `${animal.sex}` : ''}
                                            {animal.birthDate && animal.birthDate !== 'N/A' ? ` | ${formatAge(animal.birthDate)}` : ''}
                                            {` | Lote: ${animal.location || 'N/A'}`}
                                        </div>
                                    </div>
                                    {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                                </button>
                            )
                        })
                    ) : (
                        // Mensaje si no hay resultados
                        <p className="text-center text-zinc-500 py-8">No se encontraron animales con estos filtros.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};
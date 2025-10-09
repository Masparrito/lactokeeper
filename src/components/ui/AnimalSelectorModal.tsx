// src/components/ui/AnimalSelectorModal.tsx

import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal } from '../../db/local';
import { Search } from 'lucide-react';
// --- CAMBIO CLAVE 1: Importamos la función para formatear la edad ---
import { formatAge } from '../../utils/calculations';

// --- SUB-COMPONENTES PARA LOS INTERRUPTORES DE FILTRO ---
const MainFilterToggle = ({ activeFilter, setActiveFilter }: { activeFilter: 'Activo' | 'Referencia', setActiveFilter: (filter: 'Activo' | 'Referencia') => void }) => (
    <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
        <button onClick={() => setActiveFilter('Activo')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Activo' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Activos</button>
        <button onClick={() => setActiveFilter('Referencia')} className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${activeFilter === 'Referencia' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>De Referencia</button>
    </div>
);

const ReferenceSubFilterToggle = ({ activeFilter, setFilter }: { activeFilter: string, setFilter: (filter: 'all' | 'Venta' | 'Muerte' | 'Descarte') => void }) => {
    const filters: { key: 'all' | 'Venta' | 'Muerte' | 'Descarte'; label: string }[] = [
        { key: 'all', label: 'Todos' },
        { key: 'Venta', label: 'Vendidos' },
        { key: 'Muerte', label: 'Muertos' },
        { key: 'Descarte', label: 'Descartados' }
    ];

    return (
        <div className="p-3 bg-black/20 rounded-lg">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Filtrar por estado:</label>
            <div className="flex flex-wrap gap-2">
                {filters.map(f => (
                    <button 
                        key={f.key} 
                        onClick={() => setFilter(f.key)} 
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${activeFilter === f.key ? 'bg-brand-blue text-white' : 'bg-zinc-700 text-zinc-300'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    );
};


interface AnimalSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (animalId: string) => void;
    animals: Animal[];
    title: string;
    filterSex?: 'Hembra' | 'Macho';
}

export const AnimalSelectorModal: React.FC<AnimalSelectorModalProps> = ({ isOpen, onClose, onSelect, animals, title, filterSex }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'Activo' | 'Referencia'>('Activo');
    const [referenceSubFilter, setReferenceSubFilter] = useState<'all' | 'Venta' | 'Muerte' | 'Descarte'>('all');

    const handleMainFilterChange = (filter: 'Activo' | 'Referencia') => {
        setActiveFilter(filter);
        setReferenceSubFilter('all');
    };

    const filteredAnimals = useMemo(() => {
        return animals
            .filter(animal => {
                if (filterSex && animal.sex !== filterSex) return false;

                const isRef = animal.isReference || false;
                if (activeFilter === 'Referencia') {
                    if (!isRef) return false;
                    if (referenceSubFilter !== 'all') {
                        return animal.status === referenceSubFilter;
                    }
                    return true;
                }
                return !isRef;
            })
            .filter(animal => {
                if (!searchTerm) return true;
                return animal.id.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [animals, searchTerm, activeFilter, referenceSubFilter, filterSex]);

    const handleSelect = (animalId: string) => {
        onSelect(animalId);
        setSearchTerm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input type="search" placeholder="Buscar por ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"/>
                </div>

                <MainFilterToggle activeFilter={activeFilter} setActiveFilter={handleMainFilterChange} />

                {activeFilter === 'Referencia' && (
                    <div className="animate-fade-in">
                        <ReferenceSubFilterToggle activeFilter={referenceSubFilter} setFilter={setReferenceSubFilter} />
                    </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => (
                            <button 
                                key={animal.id} 
                                onClick={() => handleSelect(animal.id)}
                                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                                <p className="font-bold text-white">{animal.id}</p>
                                {/* --- CAMBIO CLAVE 2: Se aplica la nueva norma --- */}
                                <p className="text-xs text-zinc-400">
                                    {animal.sex} | {formatAge(animal.birthDate)} | Lote: {animal.location || 'Sin Asignar'}
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
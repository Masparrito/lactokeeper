import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal, Parturition } from '../../db/local';
import { CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { useInbreedingCheck } from '../../hooks/useInbreedingCheck';
import { calculateAgeInDays } from '../../utils/calculations';

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

const SUB_FILTERS = {
    'En Ordeño': (animal: Animal, milkingIds: Set<string>) => milkingIds.has(animal.id),
    'Gestantes': (animal: Animal) => animal.reproductiveStatus === 'Preñada',
    'Último Destete': (animal: Animal) => animal.reproductiveStatus === 'Post-Parto', 
    'Cabras Secas': (animal: Animal) => animal.reproductiveStatus === 'Vacía',
    'En Servicio': (animal: Animal) => animal.reproductiveStatus === 'En Servicio',
};

interface AdvancedAnimalSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedIds: string[]) => void;
    animals: Animal[];
    parturitions: Parturition[];
    title: string;
    sireIdForInbreedingCheck?: string;
}

export const AdvancedAnimalSelector: React.FC<AdvancedAnimalSelectorProps> = ({
    isOpen, onClose, onSelect, animals, parturitions, title, sireIdForInbreedingCheck,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [primaryFilter, setPrimaryFilter] = useState<string>(Object.keys(PRIMARY_FILTERS)[0]);
    const [activeSubFilters, setActiveSubFilters] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { isRelated } = useInbreedingCheck();

    const toggleSubFilter = (filter: string) => { setActiveSubFilters(prev => { const newSet = new Set(prev); if (newSet.has(filter)) newSet.delete(filter); else newSet.add(filter); return newSet; }); };
    const toggleSelection = (animalId: string) => { setSelectedIds(prev => { const newSet = new Set(prev); if (newSet.has(animalId)) newSet.delete(animalId); else newSet.add(animalId); return newSet; }); };

    const filteredAnimals = useMemo(() => {
        const milkingFemaleIds = new Set(parturitions.filter(p => p.status === 'activa').map(p => p.goatId));
        return animals
            .filter(animal => { 
                const filterFn = (PRIMARY_FILTERS as any)[primaryFilter];
                return filterFn ? filterFn(animal, parturitions) : true;
            })
            .filter(animal => { 
                if (activeSubFilters.size === 0) return true;
                return Array.from(activeSubFilters).some(filterKey => {
                    const subFilterFn = (SUB_FILTERS as any)[filterKey];
                    return subFilterFn ? subFilterFn(animal, milkingFemaleIds) : false;
                });
            })
            .filter(animal => { 
                if (!searchTerm) return true;
                return animal.id.toLowerCase().includes(searchTerm.toLowerCase());
            });
    }, [animals, parturitions, searchTerm, primaryFilter, activeSubFilters]);

    const areAllFilteredSelected = useMemo(() => { if (filteredAnimals.length === 0) return false; return filteredAnimals.every(animal => selectedIds.has(animal.id)); }, [filteredAnimals, selectedIds]);
    const handleSelectAll = () => { if (areAllFilteredSelected) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(filteredAnimals.map(a => a.id))); } };
    const handleConfirmSelection = () => { onSelect(Array.from(selectedIds)); handleClose(); };
    const handleClose = () => { setSearchTerm(''); setSelectedIds(new Set()); setActiveSubFilters(new Set()); setPrimaryFilter(Object.keys(PRIMARY_FILTERS)[0]); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} size="large">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Buscar por ID</label>
                        <input type="search" placeholder="Ej: 0015..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-4 pr-4 py-2.5 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría Principal</label>
                        <select value={primaryFilter} onChange={e => setPrimaryFilter(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-white border border-zinc-700">
                            {Object.keys(PRIMARY_FILTERS).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Sub-filtros (Opcional)</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(SUB_FILTERS).map(subFilter => (
                            <button key={subFilter} onClick={() => toggleSubFilter(subFilter)} 
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeSubFilters.has(subFilter) ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {subFilter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-h-64 min-h-[10rem] overflow-y-auto space-y-2 pr-2 border-t border-b border-zinc-700 py-4 flex flex-col">
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => {
                            const hasInbreedingRisk = sireIdForInbreedingCheck ? isRelated(animal.id, sireIdForInbreedingCheck, animals) : false;
                            return (
                                <div key={animal.id} onClick={() => toggleSelection(animal.id)} className={`w-full text-left p-3 flex items-center gap-4 rounded-lg cursor-pointer transition-colors ${hasInbreedingRisk ? 'bg-yellow-900/50 border border-yellow-500/60 hover:bg-yellow-800/50' : 'bg-zinc-800/50 hover:bg-zinc-700'}`}>
                                    {selectedIds.has(animal.id) ? <CheckSquare className="text-brand-amber flex-shrink-0" /> : <Square className="text-zinc-500 flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <p className="font-bold text-white flex items-center gap-2">
                                            {animal.id}
                                            {hasInbreedingRisk && <AlertTriangle className="text-yellow-400" size={16} />}
                                        </p>
                                        <p className="text-xs text-zinc-400">Edad: {calculateAgeInDays(animal.birthDate)} días | Lote: {animal.location}</p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        // --- MENSAJE DE LISTA VACÍA AÑADIDO ---
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-zinc-500 text-center">No se encontraron animales que coincidan con los filtros.</p>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={handleSelectAll} disabled={filteredAnimals.length === 0} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        {areAllFilteredSelected ? 'Deseleccionar' : 'Seleccionar Todos'}
                    </button>
                    <div className="flex items-center gap-4">
                        <button onClick={handleClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                        <button onClick={handleConfirmSelection} className="bg-brand-amber hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg">
                            Seleccionar ({selectedIds.size})
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
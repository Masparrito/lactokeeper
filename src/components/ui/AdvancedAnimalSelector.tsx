import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Animal, Parturition } from '../../db/local';
import { CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { useInbreedingCheck } from '../../hooks/useInbreedingCheck';

// --- Tipos y Constantes para los Filtros ---
const PRIMARY_FILTERS = {
    'Hembras Activas': (animal: Animal) => animal.sex === 'Hembra' && animal.status === 'Activo',
    'Machos Activos': (animal: Animal) => animal.sex === 'Macho' && animal.status === 'Activo',
    'Cabritas': (animal: Animal) => animal.lifecycleStage === 'Cabrita',
    'Cabritonas': (animal: Animal) => animal.lifecycleStage === 'Cabritona',
    'Macho Cabrío': (animal: Animal) => animal.lifecycleStage === 'Macho Cabrío',
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
    isOpen,
    onClose,
    onSelect,
    animals,
    parturitions,
    title,
    sireIdForInbreedingCheck,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [primaryFilter, setPrimaryFilter] = useState<string>(Object.keys(PRIMARY_FILTERS)[0]);
    const [activeSubFilters, setActiveSubFilters] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    const { isRelated } = useInbreedingCheck();

    const toggleSubFilter = (filter: string) => {
        setActiveSubFilters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(filter)) newSet.delete(filter);
            else newSet.add(filter);
            return newSet;
        });
    };

    const toggleSelection = (animalId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) newSet.delete(animalId);
            else newSet.add(animalId);
            return newSet;
        });
    };

    const filteredAnimals = useMemo(() => {
        const milkingFemaleIds = new Set(parturitions.filter(p => p.status === 'activa').map(p => p.goatId));

        return animals
            .filter(animal => { 
                const filterFn = (PRIMARY_FILTERS as any)[primaryFilter];
                return filterFn ? filterFn(animal) : true;
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

    const areAllFilteredSelected = useMemo(() => {
        if (filteredAnimals.length === 0) return false;
        return filteredAnimals.every(animal => selectedIds.has(animal.id));
    }, [filteredAnimals, selectedIds]);

    const handleSelectAll = () => {
        if (areAllFilteredSelected) {
            setSelectedIds(new Set());
        } else {
            const allFilteredIds = new Set(filteredAnimals.map(a => a.id));
            setSelectedIds(allFilteredIds);
        }
    };

    const handleConfirmSelection = () => {
        onSelect(Array.from(selectedIds));
        handleClose(); // Usamos handleClose para asegurar el reseteo del estado
    };

    const handleClose = () => {
        setSearchTerm('');
        setSelectedIds(new Set());
        setActiveSubFilters(new Set());
        setPrimaryFilter(Object.keys(PRIMARY_FILTERS)[0]); // Resetea también el filtro primario
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            <div className="space-y-4">
                <input type="search" placeholder="Buscar por ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-4 pr-4 py-3 text-white" />
                <select value={primaryFilter} onChange={e => setPrimaryFilter(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg">
                    {Object.keys(PRIMARY_FILTERS).map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <div className="flex flex-wrap gap-2">
                    {Object.keys(SUB_FILTERS).map(subFilter => (
                        <button key={subFilter} onClick={() => toggleSubFilter(subFilter)} 
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeSubFilters.has(subFilter) ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                            {subFilter}
                        </button>
                    ))}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border-t border-b border-zinc-700 py-2">
                    {filteredAnimals.map(animal => {
                        const hasInbreedingRisk = sireIdForInbreedingCheck 
                            ? isRelated(animal.id, sireIdForInbreedingCheck, animals) 
                            : false;
                        
                        return (
                            <div 
                                key={animal.id} 
                                onClick={() => toggleSelection(animal.id)} 
                                className={`w-full text-left p-3 flex items-center gap-4 rounded-lg cursor-pointer transition-colors ${hasInbreedingRisk ? 'bg-yellow-900/50 border border-yellow-500/60 hover:bg-yellow-800/50' : 'bg-zinc-800/50 hover:bg-zinc-700'}`}
                            >
                                {selectedIds.has(animal.id) ? <CheckSquare className="text-brand-amber flex-shrink-0" /> : <Square className="text-zinc-500 flex-shrink-0" />}
                                <div className="flex-grow">
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {animal.id}
                                        {hasInbreedingRisk && <AlertTriangle className="text-yellow-400" size={16} />}
                                    </p>
                                    <p className="text-xs text-zinc-400">{animal.lifecycleStage} | Lote: {animal.location}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    <button 
                        type="button" 
                        onClick={handleSelectAll}
                        disabled={filteredAnimals.length === 0}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
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
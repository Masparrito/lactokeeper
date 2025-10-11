// src/pages/LotDetailPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { PageState } from '../types/navigation';
import { ArrowLeft, Plus, Edit, Trash2, MoveRight, CheckSquare, Square } from 'lucide-react';
import { Animal } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { TransferAnimalsModal } from '../components/ui/TransferAnimalsModal';
import { formatAge } from '../utils/calculations';
import { useVirtualizer } from '@tanstack/react-virtual';

const AnimalRow = ({ animal, onSelect, isEditing, isSelected }: { animal: Animal, onSelect: (id: string) => void, isEditing: boolean, isSelected: boolean }) => {
    const formattedAge = formatAge(animal.birthDate);

    return (
        <div 
            onClick={() => onSelect(animal.id)} 
            className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border flex justify-between items-center transition-all ${isEditing ? 'cursor-pointer border-transparent' : 'hover:border-brand-orange'}`}
        >
            <div className="flex items-center gap-4">
                {isEditing && (
                    isSelected ? <CheckSquare className="text-brand-orange flex-shrink-0" size={24} /> : <Square className="text-zinc-500 flex-shrink-0" size={24} />
                )}
                <div>
                    <p className="font-bold text-lg text-white">{animal.id}</p>
                    <p className="text-sm text-zinc-400">
                        {animal.sex} | {formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                    </p>
                </div>
            </div>
        </div>
    );
};


export default function LotDetailPage({ lotName, onBack, navigateTo }: { lotName: string; onBack: () => void; navigateTo: (page: PageState) => void; }) {
    // --- CAMBIO CLAVE 1: Se obtienen las nuevas entidades del contexto ---
    const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, updateAnimal } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const animalsInLot = useMemo(() => {
        return animals.filter(animal => (animal.location || 'Sin Asignar') === lotName).sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, lotName]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: animalsInLot.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 92,
        overscan: 5,
    });

    const handleToggleAnimalSelection = (animalId: string) => {
        setSelectedAnimals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) { newSet.delete(animalId); } else { newSet.add(animalId); }
            return newSet;
        });
    };

    const handleRemoveFromLot = async () => {
        const updatePromises = Array.from(selectedAnimals).map(animalId => updateAnimal(animalId, { location: '' }));
        try {
            await Promise.all(updatePromises);
            setIsEditing(false);
            setSelectedAnimals(new Set());
        } catch (error) { console.error("Error al quitar animales del lote:", error); }
    };

    const handleAssignAnimals = async (selectedIds: string[]) => {
        const updatePromises = selectedIds.map(animalId => updateAnimal(animalId, { location: lotName }));
        await Promise.all(updatePromises);
    };
    
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-24 animate-fade-in">
                <header className="flex items-center justify-between pt-8 pb-4 px-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{lotName}</h1>
                        <p className="text-lg text-zinc-400">{animalsInLot.length} {animalsInLot.length === 1 ? 'animal' : 'animales'}</p>
                    </div>
                    {isEditing ? (
                        <button onClick={() => { setIsEditing(false); setSelectedAnimals(new Set()); }} className="text-brand-orange font-semibold px-2 py-1">Listo</button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 -mr-2 text-zinc-400 hover:text-white"><Edit size={20} /></button>
                    )}
                </header>

                {!isEditing && (
                    <div className="px-4">
                        <button onClick={() => setSelectorOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"><Plus size={20} /> Añadir Animales</button>
                    </div>
                )}
                
                <div ref={parentRef} className="pt-4" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    {animalsInLot.length > 0 ? (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const animal = animalsInLot[virtualItem.index];
                                return (
                                    <div
                                        key={virtualItem.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                            padding: '0 1rem 0.5rem 1rem'
                                        }}
                                    >
                                        <AnimalRow 
                                            animal={animal} 
                                            isEditing={isEditing}
                                            isSelected={selectedAnimals.has(animal.id)}
                                            onSelect={(id) => isEditing ? handleToggleAnimalSelection(id) : navigateTo({ name: 'rebano-profile', animalId: id })} 
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-500">Este lote está vacío.</p>
                        </div>
                    )}
                </div>
            </div>

            {isEditing && selectedAnimals.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md p-4 border-t border-brand-border animate-slide-up z-20">
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button onClick={handleRemoveFromLot} className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-xl"><Trash2 size={18} /> Quitar del Lote</button>
                        <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-xl"><MoveRight size={18} /> Transferir</button>
                    </div>
                </div>
            )}

            {/* --- CAMBIO CLAVE 2: Se pasan las nuevas props al selector --- */}
            <AdvancedAnimalSelector 
                isOpen={isSelectorOpen} 
                onClose={() => setSelectorOpen(false)} 
                onSelect={handleAssignAnimals} 
                animals={animals} 
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                title={`Añadir animales a: ${lotName}`} 
            />
            <TransferAnimalsModal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setIsEditing(false); setSelectedAnimals(new Set()); }} animalsToTransfer={Array.from(selectedAnimals)} fromLot={lotName} />
        </>
    );
}
import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell';
import { ArrowLeft, Plus, Edit, Trash2, MoveRight, CheckSquare, Square } from 'lucide-react';
import { Animal } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';
import { TransferAnimalsModal } from '../components/ui/TransferAnimalsModal';
import { getAnimalZootecnicCategory, formatAge } from '../utils/calculations';

// --- TARJETA DE ANIMAL MEJORADA ---
const AnimalRow = ({ animal, onSelect, isEditing, isSelected }: { animal: Animal, onSelect: (id: string) => void, isEditing: boolean, isSelected: boolean }) => {
    const { parturitions } = useData();
    const formattedAge = formatAge(animal.birthDate);
    const zootecnicCategory = getAnimalZootecnicCategory(animal, parturitions);

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
                    <p className="text-sm text-zinc-400">{animal.sex} | {formattedAge} | {zootecnicCategory}</p>
                </div>
            </div>
        </div>
    );
};


export default function LotDetailPage({ lotName, onBack, navigateTo }: { lotName: string; onBack: () => void; navigateTo: (page: PageState) => void; }) {
    const { animals, parturitions, serviceRecords, breedingGroups, updateAnimal } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    // --- ESTADOS PARA EL MODO EDICIÓN ---
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const animalsInLot = useMemo(() => {
        return animals.filter(animal => (animal.location || 'Sin Asignar') === lotName).sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, lotName]);

    const handleToggleAnimalSelection = (animalId: string) => {
        setSelectedAnimals(prev => {
            const newSet = new Set(prev);
            if (newSet.has(animalId)) {
                newSet.delete(animalId);
            } else {
                newSet.add(animalId);
            }
            return newSet;
        });
    };

    const handleRemoveFromLot = async () => {
        const updatePromises = Array.from(selectedAnimals).map(animalId => updateAnimal(animalId, { location: '' })); // Envia a "Sin Asignar"
        try {
            await Promise.all(updatePromises);
            setIsEditing(false);
            setSelectedAnimals(new Set());
        } catch (error) {
            console.error("Error al quitar animales del lote:", error);
        }
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

                <div className="space-y-2 pt-4 px-4">
                    {animalsInLot.map(animal => (
                        <AnimalRow 
                            key={animal.id} 
                            animal={animal} 
                            isEditing={isEditing}
                            isSelected={selectedAnimals.has(animal.id)}
                            onSelect={(id) => isEditing ? handleToggleAnimalSelection(id) : navigateTo({ name: 'rebano-profile', animalId: id })} 
                        />
                    ))}
                </div>
            </div>

            {/* --- PIE DE PÁGINA QUE APARECE EN MODO EDICIÓN --- */}
            {isEditing && selectedAnimals.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md p-4 border-t border-brand-border animate-slide-up z-20">
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button onClick={handleRemoveFromLot} className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-xl"><Trash2 size={18} /> Quitar del Lote</button>
                        <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-xl"><MoveRight size={18} /> Transferir</button>
                    </div>
                </div>
            )}

            <AdvancedAnimalSelector isOpen={isSelectorOpen} onClose={() => setSelectorOpen(false)} onSelect={handleAssignAnimals} animals={animals} parturitions={parturitions} serviceRecords={serviceRecords} breedingGroups={breedingGroups} title={`Añadir animales a: ${lotName}`} />
            <TransferAnimalsModal isOpen={isTransferModalOpen} onClose={() => { setIsTransferModalOpen(false); setIsEditing(false); setSelectedAnimals(new Set()); }} animalsToTransfer={Array.from(selectedAnimals)} fromLot={lotName} />
        </>
    );
}
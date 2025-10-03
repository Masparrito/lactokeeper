import { useState, useMemo } from 'react'; // Se elimina 'React'
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell'; // RUTA DE IMPORTACIÓN CORREGIDA
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { Animal } from '../db/local';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';

// --- Sub-componente para la Fila de Animal ---
const AnimalRow = ({ animal, onSelect }: { animal: Animal, onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-amber transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{animal.id}</p>
            <p className="text-sm text-zinc-400">
                {animal.sex} | {animal.lifecycleStage}
            </p>
        </div>
        <ChevronRight className="text-zinc-600" />
    </button>
);

interface LotDetailPageProps {
    lotName: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}

export default function LotDetailPage({ lotName, onBack, navigateTo }: LotDetailPageProps) {
    const { animals, parturitions, updateAnimal } = useData();
    const [isSelectorOpen, setSelectorOpen] = useState(false);

    const animalsInLot = useMemo(() => {
        return animals.filter(animal => (animal.location || 'Sin Asignar') === lotName)
                      .sort((a, b) => a.id.localeCompare(b.id));
    }, [animals, lotName]);

    const handleAssignAnimals = async (selectedIds: string[]) => {
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { location: lotName });
        });
        try {
            await Promise.all(updatePromises);
        } catch (error) {
            console.error(`Error al asignar animales al lote ${lotName}:`, error);
        }
    };
    
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="text-center flex-grow">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{lotName}</h1>
                        <p className="text-lg text-zinc-400">{animalsInLot.length} {animalsInLot.length === 1 ? 'animal' : 'animales'}</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <button 
                    onClick={() => setSelectorOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg"
                >
                    <Plus size={20} /> Añadir Animales a este Lote
                </button>

                <div className="space-y-2 pt-4">
                    {animalsInLot.length > 0 ? (
                        animalsInLot.map(animal => (
                            <AnimalRow 
                                key={animal.id} 
                                animal={animal} 
                                onSelect={(id) => navigateTo({ name: 'rebano-profile', animalId: id })} 
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">No hay animales en este lote.</p>
                        </div>
                    )}
                </div>
            </div>

            <AdvancedAnimalSelector
                isOpen={isSelectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleAssignAnimals}
                animals={animals}
                parturitions={parturitions}
                title={`Añadir animales a: ${lotName}`}
            />
        </>
    );
}
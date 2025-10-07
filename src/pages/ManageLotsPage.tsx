import { useState } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';

interface ManageLotsPageProps {
    onBack: () => void;
}

export default function ManageLotsPage({ onBack }: ManageLotsPageProps) {
    // --- CORRECCIÓN 1: Obtener todos los datos necesarios del contexto ---
    const { lots, animals, parturitions, serviceRecords, breedingGroups, addLot, deleteLot, updateAnimal } = useData();
    const [newLotName, setNewLotName] = useState('');
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<string | null>(null);

    const handleAddLot = async () => {
        if (newLotName.trim() === '') return;
        await addLot(newLotName);
        setNewLotName('');
    };

    const handleOpenSelector = (lotName: string) => {
        setSelectedLot(lotName);
        setSelectorOpen(true);
    };

    const handleAssignAnimals = async (selectedIds: string[]) => {
        if (!selectedLot) return;
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { location: selectedLot });
        });
        await Promise.all(updatePromises);
        setSelectorOpen(false);
        setSelectedLot(null);
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="flex items-center pt-8 pb-4 px-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Gestionar Lotes</h1>
                        <p className="text-md text-zinc-400">Crea ubicaciones y asigna animales</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <div className="px-4">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                        <h3 className="text-lg font-semibold text-white">Añadir Nuevo Lote</h3>
                        <div className="flex items-center gap-2">
                            <input type="text" value={newLotName} onChange={(e) => setNewLotName(e.target.value)} placeholder="Nombre del lote..." className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" />
                            <button onClick={handleAddLot} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><Plus size={24} /></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 pt-4 px-4">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Lotes Existentes</h3>
                    {lots.length > 0 ? (
                        lots.map(lot => (
                            <div key={lot.id} className="w-full text-left bg-brand-glass rounded-2xl p-4 flex justify-between items-center">
                                <p className="font-semibold text-white">{lot.name}</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenSelector(lot.name)} className="flex items-center gap-2 bg-zinc-700/80 text-white font-semibold py-2 px-3 rounded-lg hover:bg-zinc-600/80 transition-colors"><Users size={16} /> Asignar</button>
                                    <button onClick={() => deleteLot(lot.id)} className="p-2 text-zinc-500 hover:text-brand-red transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl"><p className="text-zinc-500">Aún no has creado ningún lote.</p></div>
                    )}
                </div>
            </div>

            {/* --- CORRECCIÓN 2: Pasar los props que faltan al selector --- */}
            <AdvancedAnimalSelector
                isOpen={isSelectorOpen}
                onClose={() => setSelectorOpen(false)}
                onSelect={handleAssignAnimals}
                animals={animals}
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingGroups={breedingGroups}
                title={`Asignar animales a: ${selectedLot}`}
            />
        </>
    );
}
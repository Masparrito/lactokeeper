import { useState } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';

interface ManageLotsPageProps {
    onBack: () => void;
}

export default function ManageLotsPage({ onBack }: ManageLotsPageProps) {
    // Obtenemos las listas de animales y partos, y la función updateAnimal del contexto
    const { lots, animals, parturitions, addLot, deleteLot, updateAnimal } = useData();
    const [newLotName, setNewLotName] = useState('');
    
    // Estados para controlar el modal selector
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<string | null>(null);

    const handleAddLot = async () => {
        if (newLotName.trim() === '') return;
        try {
            await addLot(newLotName);
            setNewLotName('');
        } catch (error) {
            console.error("Error al añadir el lote:", error);
        }
    };

    // Función que se activa al hacer clic en el botón de asignar animales de un lote
    const handleOpenSelector = (lotName: string) => {
        setSelectedLot(lotName);
        setSelectorOpen(true);
    };

    // Función que se ejecuta cuando el usuario confirma la selección en el modal
    const handleAssignAnimals = async (selectedIds: string[]) => {
        if (!selectedLot) return;

        // Creamos un array de promesas para actualizar cada animal seleccionado
        const updatePromises = selectedIds.map(animalId => {
            return updateAnimal(animalId, { location: selectedLot });
        });

        try {
            // Promise.all ejecuta todas las actualizaciones en paralelo
            await Promise.all(updatePromises);
            console.log(`${selectedIds.length} animales asignados al lote ${selectedLot}.`);
        } catch (error) {
            console.error("Error al asignar animales:", error);
        }
        
        // Cerramos el selector al finalizar
        setSelectorOpen(false);
        setSelectedLot(null);
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Gestionar Lotes</h1>
                        <p className="text-md text-zinc-400">Asigna animales a las ubicaciones de tu finca</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                    <h3 className="text-lg font-semibold text-white">Añadir Nuevo Lote</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newLotName}
                            onChange={(e) => setNewLotName(e.target.value)}
                            placeholder="Nombre del lote..."
                            className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"
                        />
                        <button onClick={handleAddLot} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                            <Plus size={24} />
                        </button>
                    </div>
                </div>

                <div className="space-y-2 pt-4">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Lotes Existentes</h3>
                    {lots.length > 0 ? (
                        lots.map(lot => (
                            <div key={lot.id} className="w-full text-left bg-brand-glass rounded-2xl p-4 flex justify-between items-center">
                                <p className="font-semibold text-white">{lot.name}</p>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleOpenSelector(lot.name)}
                                        className="flex items-center gap-2 bg-zinc-700/80 text-white font-semibold py-2 px-3 rounded-lg hover:bg-zinc-600/80 transition-colors"
                                    >
                                        <Users size={16} />
                                        Asignar
                                    </button>
                                    <button onClick={() => deleteLot(lot.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                             <p className="text-zinc-500">Aún no has creado ningún lote.</p>
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
                title={`Asignar animales a: ${selectedLot}`}
            />
        </>
    );
}
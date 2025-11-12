// src/pages/ManageLotsPage.tsx (CORREGIDO)

import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { AdvancedAnimalSelector } from '../components/ui/AdvancedAnimalSelector';

interface ManageLotsPageProps {
    onBack: () => void;
}

export default function ManageLotsPage({ onBack }: ManageLotsPageProps) {
    // --- Se obtienen todos los datos necesarios para AdvancedAnimalSelector ---
    const { 
      lots, 
      animals, 
      parturitions, 
      serviceRecords, 
      breedingSeasons, 
      sireLots, 
      addLot, 
      deleteLot, 
      updateAnimal,
      // (CORREGIDO) Añadir 'appConfig'
      appConfig
    } = useData();

    const [newLotName, setNewLotName] = useState('');
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<string | null>(null);
    const [error, setError] = useState(''); // Estado para mostrar errores

    // Memoiza los lotes con el conteo de animales
    const lotsWithCount = useMemo(() => {
        const counts = new Map<string, number>();
        animals.forEach(animal => {
            const loc = animal.location || 'Sin Asignar';
            counts.set(loc, (counts.get(loc) || 0) + 1);
        });
        return lots.map(lot => ({
            ...lot,
            animalCount: counts.get(lot.name) || 0
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [lots, animals]);


    const handleAddLot = async () => {
        if (newLotName.trim() === '') return;
        setError(''); // Limpia errores anteriores
        try {
            // --- CORRECCIÓN DE ERROR TS2345 ---
            // Se pasa un objeto, asumiendo que los lotes creados aquí son principales
            await addLot({ name: newLotName, parentLotId: undefined });
            setNewLotName('');
        } catch (err: any) {
            setError(err.message || 'No se pudo crear el lote.'); // Muestra error si el lote ya existe
        }
    };

    const handleDeleteLot = async (lotId: string, animalCount: number) => {
        if (animalCount > 0) {
            setError(`No se puede eliminar "${lots.find(l => l.id === lotId)?.name}". Reasigne los ${animalCount} animales primero.`);
            return;
        }
        setError('');
        if (window.confirm("¿Estás seguro de que quieres eliminar este lote? Esta acción no se puede deshacer.")) {
            try {
                await deleteLot(lotId);
            } catch (err: any) {
                setError(err.message || 'No se pudo eliminar el lote.');
            }
        }
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
                        <h1 className="text-2xl font-bold tracking-tight text-white">Gestionar Lotes Físicos</h1>
                        <p className="text-md text-zinc-400">Crea ubicaciones y asigna animales</p>
                    </div>
                    <div className="w-8"></div>
section-end                 </header>

                <div className="px-4">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-4">
                        <h3 className="text-lg font-semibold text-white">Añadir Nuevo Lote</h3>
                        <div className="flex items-center gap-2">
                            <input type="text" value={newLotName} onChange={(e) => setNewLotName(e.target.value)} placeholder="Nombre del lote..." className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" />
                            <button onClick={handleAddLot} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><Plus size={24} /></button>
                        </div>
                        {error && <p className="text-sm text-brand-red text-center">{error}</p>}
                    </div>
                </div>

                <div className="space-y-2 pt-4 px-4">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Lotes Existentes</h3>
                    {lotsWithCount.length > 0 ? (
                        lotsWithCount.map(lot => (
                            <div key={lot.id} className="w-full text-left bg-brand-glass rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                <p className="font-semibold text-white">{lot.name}</p>
                                <p className="text-sm text-zinc-400">{lot.animalCount} {lot.animalCount === 1 ? 'animal' : 'animales'}</p>
                            </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenSelector(lot.name)} className="flex items-center gap-2 bg-zinc-700/80 text-white font-semibold py-2 px-3 rounded-lg hover:bg-zinc-600/80 transition-colors"><Users size={16} /> Asignar</button>
                                    <button onClick={() => handleDeleteLot(lot.id, lot.animalCount)} className="p-2 text-zinc-500 hover:text-brand-red transition-colors"><Trash2 size={18} /></button>
section-end                                 </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl"><p className="text-zinc-500">Aún no has creado ningún lote.</p></div>
                    )}
                </div>
            </div>

            <AdvancedAnimalSelector
                isOpen={isSelectorOpen}
                onClose={() => setSelectorOpen(false)}
  section-end             onSelect={handleAssignAnimals}
                animals={animals}
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                // (CORREGIDO) Pasar 'appConfig'
                appConfig={appConfig}
                title={`Asignar animales a: ${selectedLot}`}
            />
        </>
    );
}
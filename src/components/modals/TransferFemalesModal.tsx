// src/components/modals/TransferFemalesModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local'; // Import Animal type
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';
// --- CAMBIO: Importar formatAnimalDisplay (aunque no lo usemos en la lista, puede ser útil para el título) ---

// Props definition for the component
interface TransferFemalesModalProps {
  isOpen: boolean; // Controls modal visibility
  onClose: () => void; // Function to close the modal
  femalesToTransfer: string[]; // Array of animal IDs to potentially transfer
  originSeasonId: string;
  onConfirmTransfer: (destinationSeasonId: string, femaleIds: string[]) => Promise<void>;
}

export const TransferFemalesModal: React.FC<TransferFemalesModalProps> = ({
  isOpen,
  onClose,
  femalesToTransfer,
  originSeasonId,
  onConfirmTransfer,
}) => {
  const { animals, breedingSeasons, sireLots } = useData();

  const [selectedFemaleIds, setSelectedFemaleIds] = useState<Set<string>>(new Set());
  const [destinationSeasonId, setDestinationSeasonId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFemaleIds(new Set(femalesToTransfer));
      setDestinationSeasonId('');
      setError('');
    }
  }, [isOpen, femalesToTransfer]);

  // OBTENER LA TEMPORADA DE ORIGEN PARA MOSTRAR SU NOMBRE
  const originSeason = useMemo(() =>
    breedingSeasons.find(s => s.id === originSeasonId),
  [breedingSeasons, originSeasonId]
  );

  // Memoize the list of possible destination seasons (excluding the origin season)
  const destinationSeasons = useMemo(() => {
    return breedingSeasons.filter(season =>
        season.id !== originSeasonId && season.status === 'Activo'
    );
  }, [breedingSeasons, originSeasonId]);

  // Memoize the full Animal objects for the females to transfer
  const femalesData = useMemo(() => {
      const animalMap = new Map(animals.map(a => [a.id, a]));
      return femalesToTransfer
          .map(id => animalMap.get(id))
          .filter((animal): animal is Animal => !!animal)
          .sort((a,b)=> a.id.localeCompare(b.id));
  }, [femalesToTransfer, animals]);


  // Handler to toggle selection of an animal (No cambia)
  const handleToggleSelection = (femaleId: string) => {
    setSelectedFemaleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(femaleId)) {
        newSet.delete(femaleId);
      } else {
        newSet.add(femaleId);
      }
      return newSet;
    });
  };

  // Handler to confirm the transfer
  const handleConfirm = async () => {
    if (!destinationSeasonId) {
      setError('Debes seleccionar una temporada de destino.');
      return;
    }
    
    const hasDestinationLot = sireLots.some(lot => lot.seasonId === destinationSeasonId);
    if (!hasDestinationLot) {
        setError("La temporada de destino no tiene lotes de reproductor. Crea uno primero.");
        return;
    }

    if (selectedFemaleIds.size === 0) {
      setError('Debes seleccionar al menos una hembra para transferir.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onConfirmTransfer(destinationSeasonId, Array.from(selectedFemaleIds));
      setIsLoading(false);
      onClose();
    } catch (err: any) {
        setError(err.message || 'Error al transferir los animales.');
        console.error("Error transferring animals:", err);
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- RENDERIZADO DEL MODAL ---
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div className="bg-ios-modal-bg w-full max-w-lg rounded-2xl flex flex-col animate-slide-up max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="flex-shrink-0 p-4 border-b border-brand-border">
          <h2 className="text-xl font-semibold text-white tracking-tight">Transferir Animales</h2>
          <p className="text-sm text-zinc-400">Desde la Temporada: {originSeason?.name || 'Cargando...'}</p>
        </header>

        {/* Main content area (scrollable) */}
        <main className="p-6 space-y-4 overflow-y-auto">
          {/* Section for selecting animals */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Animales a transferir ({selectedFemaleIds.size}/{femalesData.length})
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg border border-zinc-700">
              {femalesData.length > 0 ? (
                femalesData.map(female => {
                    // --- CAMBIO: Preparar nombre formateado ---
                    const formattedName = female.name ? String(female.name).toUpperCase().trim() : '';
                    return (
                        <div key={female.id} onClick={() => handleToggleSelection(female.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-700 cursor-pointer transition-colors">
                            {selectedFemaleIds.has(female.id) ? <CheckSquare className="text-brand-orange flex-shrink-0" /> : <Square className="text-zinc-500 flex-shrink-0" />}
                            
                            {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                            <div className="min-w-0">
                                <p className="font-mono font-semibold text-base text-white truncate">{female.id.toUpperCase()}</p>
                                {formattedName && (
                                    <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                                )}
                            </div>
                            {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                        </div>
                    );
                })
              ) : (
                <p className="text-sm text-zinc-500 text-center py-2">No hay animales para transferir.</p>
              )}
            </div>
          </div>
          {/* Section for selecting destination SEASON */}
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-zinc-400 mb-1">Transferir a la Temporada:</label>
            <select
              id="destination"
              value={destinationSeasonId}
              onChange={e => setDestinationSeasonId(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded-xl text-white appearance-none"
            >
              <option value="">Seleccionar temporada de destino...</option>
              {destinationSeasons.map(season =>
                <option key={season.id} value={season.id}>
                  {season.name} (Activa)
                </option>
              )}
            </select>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </main>

        {/* Footer with action buttons */}
        <footer className="flex-shrink-0 flex justify-end gap-4 p-4 border-t border-brand-border">
          <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || selectedFemaleIds.size === 0 || !destinationSeasonId}
            className="px-5 py-2 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Transfiriendo...' : `Transferir ${selectedFemaleIds.size} Animal(es)`}
          </button>
        </footer>
      </div>
    </div>
  );
};
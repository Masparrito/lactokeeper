// src/components/modals/TransferFemalesModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';

interface TransferFemalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  femalesToTransfer: Animal[];
  originSeasonId: string;
  onConfirmTransfer: (destinationSeasonId: string, femaleIds: string[]) => void;
}

export const TransferFemalesModal: React.FC<TransferFemalesModalProps> = ({ isOpen, onClose, femalesToTransfer, originSeasonId, onConfirmTransfer }) => {
  const { breedingSeasons } = useData();
  const [selectedFemaleIds, setSelectedFemaleIds] = useState<Set<string>>(new Set());
  const [destinationSeasonId, setDestinationSeasonId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Al abrir, pre-seleccionar todos los animales
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFemaleIds(new Set(femalesToTransfer.map(f => f.id)));
      setDestinationSeasonId('');
      setError('');
    }
  }, [isOpen, femalesToTransfer]);

  const destinationSeasons = useMemo(() => {
    return breedingSeasons.filter(s => s.status === 'Activo' && s.id !== originSeasonId);
  }, [breedingSeasons, originSeasonId]);

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

  const handleConfirm = async () => {
    if (!destinationSeasonId) {
      setError('Debes seleccionar una temporada de destino.');
      return;
    }
    if (selectedFemaleIds.size === 0) {
      setError('Debes seleccionar al menos una hembra para transferir.');
      return;
    }
    setIsLoading(true);
    await onConfirmTransfer(destinationSeasonId, Array.from(selectedFemaleIds));
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-ios-modal-bg w-full max-w-lg m-4 rounded-2xl flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <header className="flex-shrink-0 p-4 border-b border-brand-border">
          <h2 className="text-xl font-semibold text-white tracking-tight">Transferir Hembras sin Servicio</h2>
        </header>
        
        <main className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Hembras a transferir ({selectedFemaleIds.size}/{femalesToTransfer.length})</label>
            <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg">
              {femalesToTransfer.map(female => (
                <div key={female.id} onClick={() => handleToggleSelection(female.id)} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-700 cursor-pointer">
                  {selectedFemaleIds.has(female.id) ? <CheckSquare className="text-brand-orange flex-shrink-0" /> : <Square className="text-zinc-500 flex-shrink-0" />}
                  <span className="font-semibold text-white">{female.id}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-zinc-400 mb-1">Transferir a la Temporada:</label>
            <select id="destination" value={destinationSeasonId} onChange={e => setDestinationSeasonId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl">
              <option value="">Seleccionar temporada de destino...</option>
              {destinationSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </main>

        <footer className="flex-shrink-0 flex justify-end gap-4 p-4 border-t border-brand-border">
          <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
          <button onClick={handleConfirm} disabled={isLoading} className="px-5 py-2 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-lg disabled:opacity-50">
            {isLoading ? 'Transfiriendo...' : `Transferir ${selectedFemaleIds.size} Hembra(s)`}
          </button>
        </footer>
      </div>
    </div>
  );
};
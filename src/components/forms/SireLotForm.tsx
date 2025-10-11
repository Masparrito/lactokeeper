// src/components/forms/SireLotForm.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Father } from '../../db/local';
import { AlertTriangle, Plus } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal';

interface SireLotFormProps {
  onSave: (sireId: string) => Promise<void>;
  onCancel: () => void;
}

export const SireLotForm: React.FC<SireLotFormProps> = ({ onSave, onCancel }) => {
  const { fathers, addFather } = useData();
  const [sireId, setSireId] = useState('');
  const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveFather = async (newFather: Father) => {
    await addFather(newFather);
    setSireId(newFather.id); // Selecciona automáticamente el nuevo padre
    setIsFatherModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sireId) {
      setError('Debes seleccionar un semental.');
      return;
    }
    setIsLoading(true);

    try {
      await onSave(sireId);
    } catch (err) {
      setError('No se pudo guardar el lote.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sire" className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar Semental</label>
          <div className="flex items-center gap-2">
            <select id="sire" value={sireId} onChange={e => setSireId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
              <option value="">Elegir reproductor...</option>
              {fathers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
            </select>
            <button type="button" onClick={() => setIsFatherModalOpen(true)} className="flex-shrink-0 p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl">
                <Plus size={24} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={isLoading || !sireId} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
            {isLoading ? 'Guardando...' : 'Crear Lote'}
          </button>
        </div>
      </form>

      <AddFatherModal 
        isOpen={isFatherModalOpen}
        onClose={() => setIsFatherModalOpen(false)}
        onSave={handleSaveFather}
      />
    </>
  );
};
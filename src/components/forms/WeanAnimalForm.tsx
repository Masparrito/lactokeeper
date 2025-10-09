// src/components/forms/WeanAnimalForm.tsx

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WeanAnimalFormProps {
  animalId: string;
  birthDate: string;
  onSave: (data: { weaningDate: string, weaningWeight: number }) => Promise<void>;
  onCancel: () => void;
}

export const WeanAnimalForm: React.FC<WeanAnimalFormProps> = ({ animalId, birthDate, onSave, onCancel }) => {
  const [weaningDate, setWeaningDate] = useState(new Date().toISOString().split('T')[0]);
  const [weaningWeight, setWeaningWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const weight = parseFloat(weaningWeight);

    // Validaciones
    if (!weaningDate || !weaningWeight || isNaN(weight) || weight <= 0) {
      setError('Por favor, introduce una fecha y un peso válidos.');
      setIsLoading(false);
      return;
    }
    if (new Date(weaningDate) < new Date(birthDate)) {
      setError('La fecha de destete no puede ser anterior a la fecha de nacimiento.');
      setIsLoading(false);
      return;
    }

    try {
      await onSave({ weaningDate, weaningWeight: weight });
    } catch (err) {
      setError('No se pudo guardar el registro de destete.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Registra la fecha y el peso al momento de separar a <span className="font-bold text-white">{animalId}</span> de su madre.
      </p>
      
      <div>
        <label htmlFor="weaningDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Destete</label>
        <input 
          id="weaningDate"
          type="date" 
          value={weaningDate} 
          onChange={(e) => setWeaningDate(e.target.value)}
          className="w-full bg-zinc-800/80 text-white p-3 rounded-xl text-lg"
          required
        />
      </div>

      <div>
        <label htmlFor="weaningWeight" className="block text-sm font-medium text-zinc-400 mb-1">Peso al Destete (Kg)</label>
        <input 
          id="weaningWeight"
          type="number" 
          step="0.1"
          value={weaningWeight}
          onChange={(e) => setWeaningWeight(e.target.value)}
          placeholder="Ej: 15.5"
          className="w-full bg-zinc-800/80 text-white p-3 rounded-xl text-lg"
          required
        />
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
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : 'Guardar Destete'}
        </button>
      </div>
    </form>
  );
};
// src/components/forms/WeanAnimalForm.tsx
// (ACTUALIZADO: Acepta y usa defaultDate y defaultWeight para pre-cargar el formulario)

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';

interface WeanAnimalFormProps {
  animalId: string;
  birthDate: string;
  onSave: (data: { weaningDate: string, weaningWeight: number }) => Promise<void>;
  onCancel: () => void;
  // (NUEVO) Props opcionales para pre-cargar el modal
  defaultDate?: string;
  defaultWeight?: number;
}

export const WeanAnimalForm: React.FC<WeanAnimalFormProps> = ({ 
  animalId, 
  birthDate, 
  onSave, 
  onCancel,
  defaultDate,    // <-- Prop recibida
  defaultWeight   // <-- Prop recibida
}) => {
  
  // (ACTUALIZADO) useState ahora usa las props para el valor inicial
  const [weaningDate, setWeaningDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [weaningWeight, setWeaningWeight] = useState(defaultWeight ? String(defaultWeight) : '');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { animals } = useData();
  const animal = useMemo(() => animals.find((a: Animal) => a.id === animalId), [animals, animalId]);
  const formattedName = animal?.name ? String(animal.name).toUpperCase().trim() : '';


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
    if (birthDate && birthDate !== 'N/A' && new Date(weaningDate) < new Date(birthDate)) {
      setError('La fecha de destete no puede ser anterior a la fecha de nacimiento.');
      setIsLoading(false);
      return;
    }

    try {
      await onSave({ weaningDate, weaningWeight: weight });
      // El cierre del modal se maneja en RebanoProfilePage
    } catch (err) {
      setError('No se pudo guardar el registro de destete.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-2">
            <p className="font-mono font-semibold text-xl text-white truncate">{animalId.toUpperCase()}</p>
            {formattedName && (
                <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
            )}
        </div>
        <p className="text-sm text-zinc-400 text-center -mt-2">
            Confirma o edita la fecha y el peso del destete.
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
          max={new Date().toISOString().split('T')[0]} // No se puede destetar en el futuro
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
          placeholder="Ej: 9.5"
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
          className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? 'Guardando...' : 'Confirmar Destete'}
        </button>
      </div>
    </form>
  );
};
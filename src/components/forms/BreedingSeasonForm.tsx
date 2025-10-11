// src/components/forms/BreedingSeasonForm.tsx

import React, { useState, useEffect } from 'react';
import { BreedingSeason } from '../../db/local';
import { AlertTriangle } from 'lucide-react';

interface BreedingSeasonFormProps {
  onSave: (seasonData: Omit<BreedingSeason, 'id' | 'status'>) => Promise<void>;
  onCancel: () => void;
  existingSeason?: BreedingSeason;
}

export const BreedingSeasonForm: React.FC<BreedingSeasonFormProps> = ({ onSave, onCancel, existingSeason }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('45'); // Duración por defecto de 45 días
  const [requiresLightTreatment, setRequiresLightTreatment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingSeason) {
      setName(existingSeason.name);
      setStartDate(existingSeason.startDate);
      const start = new Date(existingSeason.startDate);
      const end = new Date(existingSeason.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDuration(String(diffDays));
      setRequiresLightTreatment(existingSeason.requiresLightTreatment);
    } else {
        // Establecer fecha de inicio por defecto al día actual si no se está editando
        setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [existingSeason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !startDate || !duration) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    setIsLoading(true);

    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + parseInt(duration, 10));

    const seasonData: Omit<BreedingSeason, 'id' | 'status'> = {
      name,
      startDate,
      endDate: endDate.toISOString().split('T')[0],
      requiresLightTreatment,
    };

    try {
      await onSave(seasonData);
    } catch (err) {
      setError('No se pudo guardar la temporada de monta.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">Nombre de la Temporada</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Monta de Otoño 2025" className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Inicio</label>
                <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required />
            </div>
            <div>
                <label htmlFor="duration" className="block text-sm font-medium text-zinc-400 mb-1">Duración (días)</label>
                <input id="duration" type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required />
            </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3 border border-zinc-700 flex items-center justify-between">
            <label htmlFor="lightTreatment" className="text-sm font-medium text-zinc-300">¿Requiere Tratamiento de Luz?</label>
            <input
                id="lightTreatment"
                type="checkbox"
                checked={requiresLightTreatment}
                onChange={(e) => setRequiresLightTreatment(e.target.checked)}
                className="form-checkbox h-5 w-5 bg-zinc-700 border-zinc-600 rounded text-brand-orange focus:ring-brand-orange focus:ring-offset-0"
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
        <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
          {isLoading ? 'Guardando...' : 'Guardar Temporada'}
        </button>
      </div>
    </form>
  );
};
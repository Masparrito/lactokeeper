// src/components/forms/LogWeightForm.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface LogWeightFormProps {
  animalId: string;
  weightType: 'corporal' | 'leche';
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export const LogWeightForm: React.FC<LogWeightFormProps> = ({ animalId, weightType, onSaveSuccess, onCancel }) => {
  const { addBodyWeighing, addWeighing } = useData();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kg, setKg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const weightValue = parseFloat(kg);
    if (isNaN(weightValue) || weightValue <= 0) {
      setMessage({ type: 'error', text: 'Por favor, introduce un peso válido.' });
      setIsLoading(false);
      return;
    }

    // Validación de límites razonables
    if (weightType === 'corporal' && weightValue > 150) {
        setMessage({ type: 'error', text: 'El peso corporal parece irracionalmente alto.' });
        setIsLoading(false);
        return;
    }
    if (weightType === 'leche' && weightValue > 8.5) {
        setMessage({ type: 'error', text: 'La producción de leche parece irracionalmente alta.' });
        setIsLoading(false);
        return;
    }

    try {
      if (weightType === 'corporal') {
        await addBodyWeighing({ animalId, date, kg: weightValue });
      } else {
        await addWeighing({ goatId: animalId, date, kg: weightValue });
      }
      setMessage({ type: 'success', text: `Pesaje de ${animalId} guardado con éxito.` });
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo guardar el pesaje.' });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Registrando pesaje {weightType === 'corporal' ? 'corporal' : 'lechero'} para el animal <span className="font-bold text-white">{animalId}</span>.
      </p>
      
      <div>
        <label htmlFor="weighingDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Pesaje</label>
        <input 
          id="weighingDate"
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-zinc-800/80 text-white p-3 rounded-xl text-lg"
          required
        />
      </div>

      <div>
        <label htmlFor="weighingKg" className="block text-sm font-medium text-zinc-400 mb-1">Peso (Kg)</label>
        <input 
          id="weighingKg"
          type="number" 
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder="Ej: 3.5"
          autoFocus
          className="w-full bg-zinc-800/80 text-white p-3 rounded-xl text-lg"
          required
        />
      </div>
      
      {message && (
        <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
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
          {isLoading ? 'Guardando...' : 'Guardar Pesaje'}
        </button>
      </div>
    </form>
  );
};
// src/components/modals/AddBodyWeighingModal.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { AlertTriangle, CheckCircle, Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
// formatAnimalDisplay ya no se usa aquí

interface AddBodyWeighingModalProps {
  animal: Animal; // Expect the full Animal object
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export const AddBodyWeighingModal: React.FC<AddBodyWeighingModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  const { addBodyWeighing } = useData();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kg, setKg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- CAMBIO: Preparar nombre formateado ---
  const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

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

    if (weightValue > 150) { // Límite realista para cabras (ajustado)
      setMessage({ type: 'error', text: 'El peso corporal excede los 150 Kg. Por favor, verifique el dato.' });
      setIsLoading(false);
      return;
    }

    try {
      await addBodyWeighing({ animalId: animal.id, date, kg: weightValue });
      // --- CAMBIO: Mensaje de éxito actualizado ---
      setMessage({ type: 'success', text: `Pesaje de ${animal.id.toUpperCase()} guardado.` });
      setTimeout(onSaveSuccess, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo guardar el pesaje.' });
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true} // Controlled externally
      onClose={onCancel}
      // --- CAMBIO: Título actualizado al estilo estándar ---
      title="Pesaje Corporal" // Título genérico
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* --- CAMBIO: Mostrar ID y Nombre aquí --- */}
        <div className="text-center">
            <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
            {formattedName && (
                <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
            )}
        </div>
        
        {/* Date and Weight Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="weighingDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
            <input id="weighingDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-white" required />
          </div>
          <div>
            <label htmlFor="weighingKg" className="block text-sm font-medium text-zinc-400 mb-1">Peso (Kg)</label>
            <input id="weighingKg" type="number" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="Ej: 32.5" autoFocus className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-white" required />
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
          <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
            <Save size={18}/> Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
};
// src/components/modals/DeclareAbortionModal.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Father } from '../../db/local'; // Import types
import { Modal } from '../ui/Modal';
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal'; // Modal to add a new sire
import { formatAnimalDisplay } from '../../utils/formatting';

// Props definition for the component
interface DeclareAbortionModalProps {
  animal: Animal; // The dam (mother) experiencing the abortion
  onSaveSuccess: () => void; // Callback on successful save
  onCancel: () => void; // Callback on cancellation
}

export const DeclareAbortionModal: React.FC<DeclareAbortionModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  const { fathers, addFather, addParturition } = useData(); // Using addParturition to record the event

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sireId, setSireId] = useState('');
  const [inducedLactation, setInducedLactation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);

  // --- CAMBIO: Preparar nombre formateado ---
  const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sireId) {
        setMessage({ type: 'error', text: 'Debe seleccionar el padre (semental).' });
        return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      await addParturition({
        motherId: animal.id,
        parturitionDate: date,
        sireId: sireId,
        parturitionType: 'Simple', // Default
        offspringCount: 0,
        liveOffspring: [],
        parturitionOutcome: 'Aborto', // Key field
        inducedLactation: inducedLactation,
      });

      // --- CAMBIO: Mensaje de éxito actualizado ---
      setMessage({ type: 'success', text: `Aborto registrado para ${animal.id.toUpperCase()}.` });
      setTimeout(onSaveSuccess, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo registrar el aborto.' });
      setIsLoading(false);
    }
  };

  const handleSaveFather = async (newFather: Father) => {
    try {
        await addFather(newFather);
        setSireId(newFather.id);
        setIsFatherModalOpen(false);
    } catch (error: any) {
        console.error("Error saving new father:", error);
        setMessage({ type: 'error', text: error.message || 'No se pudo guardar el nuevo padre.'});
    }
  };

  return (
    <>
      <Modal
          isOpen={!isFatherModalOpen}
          onClose={onCancel}
          // --- CAMBIO: Título genérico ---
          title="Registrar Aborto"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
            <div className="text-center mb-4">
                <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                    <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
            </div>
            {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
            
            {/* Date Input */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Aborto</label>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white"
                    required
                    max={new Date().toISOString().split('T')[0]}
                 />
            </div>

            {/* Sire Selector */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Padre (Semental Involucrado)</label>
                <div className="flex items-center gap-2">
                    <select
                        value={sireId}
                        onChange={e => setSireId(e.target.value)}
                        className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none"
                        required
                    >
                        <option value="">Seleccionar Padre...</option>
                        {/* --- CAMBIO: Usar formatAnimalDisplay para los padres --- */}
                        {fathers.map((f: Father) => <option key={f.id} value={f.id}>{formatAnimalDisplay(f)}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={() => setIsFatherModalOpen(true)}
                        className="flex-shrink-0 p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"
                        title="Añadir Nuevo Padre de Referencia"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Induced Lactation Checkbox */}
            <div className="bg-black/20 rounded-xl p-3 border border-zinc-700 flex items-center justify-between">
                <label htmlFor="inducedLactation" className="text-sm font-medium text-zinc-300">¿Se iniciará lactancia post-aborto?</label>
                <input
                    id="inducedLactation"
                    type="checkbox"
                    checked={inducedLactation}
                    onChange={(e) => setInducedLactation(e.target.checked)}
                    className="form-checkbox h-5 w-5 bg-zinc-700 border-zinc-600 rounded text-brand-orange focus:ring-brand-orange focus:ring-offset-0"
                />
            </div>
            <p className="text-xs text-zinc-500 text-center px-4">
                Marcar esta opción iniciará una lactancia "atípica" para poder registrar los pesajes.
            </p>

            {message && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                    {isLoading ? 'Guardando...' : 'Confirmar Aborto'}
                </button>
            </div>
        </form>
      </Modal>

      <AddFatherModal
          isOpen={isFatherModalOpen}
          onClose={() => setIsFatherModalOpen(false)}
          onSave={handleSaveFather}
      />
    </>
  );
};
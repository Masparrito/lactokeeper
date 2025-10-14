// src/components/modals/DeclareAbortionModal.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Father } from '../../db/local';
import { Modal } from '../ui/Modal';
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal';

interface DeclareAbortionModalProps {
  animal: Animal;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export const DeclareAbortionModal: React.FC<DeclareAbortionModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  const { fathers, addFather, addParturition } = useData(); // Usaremos addParturition con un outcome específico

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sireId, setSireId] = useState('');
  const [inducedLactation, setInducedLactation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sireId) {
        setMessage({ type: 'error', text: 'Debe seleccionar el padre (semental).' });
        return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      // Usamos la misma función addParturition, pero con datos que lo identifican como un aborto.
      // La lógica del DataContext se encargará de interpretarlo.
      await addParturition({
        motherId: animal.id,
        parturitionDate: date,
        sireId: sireId,
        parturitionType: 'Simple', // Irrelevante para aborto, pero requerido por la estructura
        offspringCount: 0, // En un aborto, no hay crías viables que registrar
        liveOffspring: [], // No se crean nuevos animales
        parturitionOutcome: 'Aborto', // La clave para identificar el evento
        inducedLactation: inducedLactation, // Indica si se debe iniciar una lactancia
      });

      setMessage({ type: 'success', text: 'Aborto registrado con éxito.' });
      setTimeout(onSaveSuccess, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo registrar el aborto.' });
      setIsLoading(false);
    }
  };

  const handleSaveFather = async (newFather: Father) => {
    await addFather(newFather);
    setSireId(newFather.id);
    setIsFatherModalOpen(false);
  };

  return (
    <>
      <Modal isOpen={true} onClose={onCancel} title={`Registrar Aborto: ${animal.id}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Aborto</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg" required />
            </div>

            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Padre (Semental Involucrado)</label>
                <div className="flex items-center gap-2">
                    <select value={sireId} onChange={e => setSireId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg appearance-none" required>
                        <option value="">Seleccionar Padre...</option>
                        {fathers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                    </select>
                    <button type="button" onClick={() => setIsFatherModalOpen(true)} className="flex-shrink-0 p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl">
                        <Plus size={24} />
                    </button>
                </div>
            </div>
            
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
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50">
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
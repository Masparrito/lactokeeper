// src/components/modals/AddMilkWeighingModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { AlertTriangle, CheckCircle, Save, Wind, Archive, Baby } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ParturitionModal } from './ParturitionModal';
import { calculateDEL } from '../../utils/calculations';

interface AddMilkWeighingModalProps {
  animal: Animal;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export const AddMilkWeighingModal: React.FC<AddMilkWeighingModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  const { parturitions, addWeighing, startDryingProcess, setLactationAsDry } = useData();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [kg, setKg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);

  const activeParturition = useMemo(() => {
    return parturitions
      .filter(p => p.goatId === animal.id && p.status === 'activa')
      .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
  }, [parturitions, animal.id]);

  const del = activeParturition ? calculateDEL(activeParturition.parturitionDate, date) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParturition) return;

    setMessage(null);
    setIsLoading(true);
    const weightValue = parseFloat(kg);

    // Validaciones
    if (isNaN(weightValue) || weightValue <= 0) {
      setMessage({ type: 'error', text: 'Por favor, introduce un peso válido.' });
      setIsLoading(false);
      return;
    }
    if (weightValue > 8.5) {
      setMessage({ type: 'error', text: 'La producción parece irracionalmente alta.' });
      setIsLoading(false);
      return;
    }

    try {
      await addWeighing({ goatId: animal.id, date, kg: weightValue });
      setMessage({ type: 'success', text: `Pesaje de ${animal.id} guardado con éxito.` });
      setTimeout(onSaveSuccess, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo guardar el pesaje.' });
      setIsLoading(false);
    }
  };

  const handleStartDrying = async () => {
    if (!activeParturition) return;
    setIsLoading(true);
    try {
      await startDryingProcess(activeParturition.id);
      setMessage({ type: 'success', text: 'Proceso de secado iniciado.' });
      setTimeout(onSaveSuccess, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo iniciar el secado.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDry = async () => {
    if (!activeParturition) return;
    setIsLoading(true);
    try {
      await setLactationAsDry(activeParturition.id);
      setMessage({ type: 'success', text: 'Lactancia declarada como seca.' });
      setTimeout(onSaveSuccess, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo finalizar la lactancia.' });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <Modal
        isOpen={!isParturitionModalOpen} // El modal principal se oculta si se abre el de parto
        onClose={onCancel}
        title={`Pesaje Lechero: ${animal.id}`}
      >
        <div className="space-y-4">
          {activeParturition ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weighingDate" className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                  <input id="weighingDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Días en Leche (DEL)</label>
                    <div className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-bold text-white">{del ?? 'N/A'}</div>
                </div>
              </div>

              <div>
                <label htmlFor="weighingKg" className="block text-sm font-medium text-zinc-400 mb-1">Producción (Kg)</label>
                <input id="weighingKg" type="number" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="Ej: 3.5" autoFocus className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" required />
              </div>

              {message && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"><Save size={18}/> Guardar</button>
              </div>

              <div className="space-y-2 pt-4 border-t border-brand-border">
                  <h4 className="text-sm font-semibold text-zinc-400">Otras Acciones de Lactancia</h4>
                  <div className="flex gap-2">
                      <button type="button" onClick={handleStartDrying} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-300 font-semibold py-2 px-3 rounded-lg hover:bg-blue-600/40 transition-colors"><Wind size={16}/> Iniciar Secado</button>
                      <button type="button" onClick={handleSetDry} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-gray-600/20 text-gray-300 font-semibold py-2 px-3 rounded-lg hover:bg-gray-600/40 transition-colors"><Archive size={16}/> Declarar Seca</button>
                  </div>
              </div>

            </form>
          ) : (
            <div className="text-center space-y-4">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
              <h3 className="text-lg font-medium text-white">Animal sin Parto Activo</h3>
              <p className="text-sm text-zinc-400">
                Para registrar un pesaje de leche, el animal debe tener un parto activo registrado. Puedes declararlo ahora.
              </p>
              <button onClick={() => setParturitionModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                <Baby size={18} /> Declarar Parto
              </button>
            </div>
          )}
        </div>
      </Modal>

      {isParturitionModalOpen && (
        <ParturitionModal
          isOpen={isParturitionModalOpen}
          onClose={() => {
            setParturitionModalOpen(false);
            onSaveSuccess(); // Cierra todo el flujo si se declara el parto
          }}
          motherId={animal.id}
        />
      )}
    </>
  );
};
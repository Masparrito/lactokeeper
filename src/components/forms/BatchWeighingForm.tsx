// src/components/forms/BatchWeighingForm.tsx

import React, { useState, useMemo } from 'react';
import { Animal } from '../../db/local';
import { AlertTriangle, CheckCircle, Save } from 'lucide-react';
import { auth, db as firestoreDb } from '../../firebaseConfig';
import { writeBatch, doc, collection } from "firebase/firestore";

interface BatchWeighingFormProps {
  weightType: 'leche' | 'corporal';
  animalsToWeigh: Animal[];
  onSaveSuccess: () => void;
  onCancel: () => void;
}

/**
 * Un formulario para registrar pesos en lote para una lista de animales seleccionados.
 */
export const BatchWeighingForm: React.FC<BatchWeighingFormProps> = ({
  weightType,
  animalsToWeigh,
  onSaveSuccess,
  onCancel,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleWeightChange = (animalId: string, value: string) => {
    setWeights(prev => ({ ...prev, [animalId]: value }));
  };

  const weighedCount = useMemo(() => {
    return Object.values(weights).filter(w => w.trim() !== '' && !isNaN(parseFloat(w))).length;
  }, [weights]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const { currentUser } = auth;
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Error de autenticación.' });
      setIsLoading(false);
      return;
    }

    const validEntries = Object.entries(weights)
      .map(([animalId, kg]) => ({ animalId, kg: parseFloat(kg) }))
      .filter(entry => !isNaN(entry.kg) && entry.kg > 0);

    if (validEntries.length === 0) {
      setMessage({ type: 'error', text: 'No se han introducido pesos válidos.' });
      setIsLoading(false);
      return;
    }

    try {
      const batch = writeBatch(firestoreDb);
      const collectionName = weightType === 'leche' ? 'weighings' : 'bodyWeighings';
      const weighingsCollection = collection(firestoreDb, collectionName);

      for (const entry of validEntries) {
        const newWeighingRef = doc(weighingsCollection);
        const dataToSave = {
          [weightType === 'leche' ? 'goatId' : 'animalId']: entry.animalId,
          kg: entry.kg,
          date,
          userId: currentUser.uid,
        };
        batch.set(newWeighingRef, dataToSave);
      }

      await batch.commit();
      setMessage({ type: 'success', text: `${validEntries.length} pesajes guardados con éxito.` });
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);

    } catch (error: any) {
      setMessage({ type: 'error', text: 'Ocurrió un error al guardar los datos.' });
      setIsLoading(false);
      console.error("Error en escritura por lote de pesajes:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 p-4 border-b border-brand-border">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
                Nueva Sesión - {weighedCount} / {animalsToWeigh.length} pesados
            </h3>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-zinc-800 text-white p-2 rounded-lg text-sm"
            />
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {animalsToWeigh.map(animal => (
          <div key={animal.id} className="grid grid-cols-2 items-center gap-4 p-2 bg-black/20 rounded-lg">
            <label htmlFor={`weight-${animal.id}`} className="font-semibold text-white truncate">
              {animal.id}
            </label>
            <input 
              id={`weight-${animal.id}`}
              type="number"
              step="0.1"
              value={weights[animal.id] || ''}
              onChange={(e) => handleWeightChange(animal.id, e.target.value)}
              placeholder="Kg"
              className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center"
            />
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-brand-border bg-ios-modal-bg">
        {message && (
          <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
        <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">
            Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isLoading || weighedCount === 0}
                className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
                <Save size={18} />
                Guardar {weighedCount > 0 ? `(${weighedCount})` : ''}
            </button>
        </div>
      </div>
    </form>
  );
};
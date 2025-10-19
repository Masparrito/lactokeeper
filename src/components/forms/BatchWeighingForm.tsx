// src/components/forms/BatchWeighingForm.tsx

import React, { useState, useMemo } from 'react';
import { Animal, Parturition } from '../../db/local';
import { AlertTriangle, CheckCircle, Save, Wind, Archive, Loader2 } from 'lucide-react';
// --- CAMBIO: Importamos useData en lugar de firebase ---
import { useData } from '../../context/DataContext';

interface BatchWeighingFormProps {
  weightType: 'leche' | 'corporal';
  animalsToWeigh: Animal[];
  onSaveSuccess: () => void;
  onCancel: () => void;
}

/**
 * Un formulario para registrar pesos en lote para una lista de animales seleccionados.
 * MODIFICADO: Ahora incluye acciones de secado para 'leche' y guarda local-first.
 */
export const BatchWeighingForm: React.FC<BatchWeighingFormProps> = ({
  weightType,
  animalsToWeigh,
  onSaveSuccess,
  onCancel,
}) => {
  // --- CAMBIO: Obtenemos funciones de DataContext ---
  const { 
    addWeighing, 
    addBodyWeighing, 
    parturitions, 
    startDryingProcess, 
    setLactationAsDry 
  } = useData();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // Para botones de secado
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleWeightChange = (animalId: string, value: string) => {
    setWeights(prev => ({ ...prev, [animalId]: value }));
  };

  const weighedCount = useMemo(() => {
    return Object.values(weights).filter(w => w.trim() !== '' && !isNaN(parseFloat(w))).length;
  }, [weights]);

  // --- NUEVO: Memo para encontrar partos activos eficientemente ---
  const activeParturitions = useMemo(() => {
    const map = new Map<string, Parturition>();
    if (weightType === 'leche') {
        const animalIds = new Set(animalsToWeigh.map(a => a.id));
        parturitions
            .filter(p => animalIds.has(p.goatId) && (p.status === 'activa' || p.status === 'en-secado'))
            .forEach(p => {
                const existing = map.get(p.goatId);
                if (!existing || new Date(p.parturitionDate) > new Date(existing.parturitionDate)) {
                    map.set(p.goatId, p);
                }
            });
    }
    return map;
  }, [parturitions, animalsToWeigh, weightType]);

  // --- NUEVO: Handler para iniciar secado ---
  const handleStartDrying = async (animalId: string) => {
    const parturition = activeParturitions.get(animalId);
    if (!parturition || parturition.status !== 'activa') return;
    
    setIsActionLoading(animalId); // Muestra spinner en la fila
    setMessage(null);
    try {
      await startDryingProcess(parturition.id);
      // Actualizamos el estado local del parto para deshabilitar el botón
      activeParturitions.set(animalId, { ...parturition, status: 'en-secado' });
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error al secar ${animalId}: ${e.message}` });
    } finally {
      setIsActionLoading(null);
    }
  };

  // --- NUEVO: Handler para declarar seca ---
  const handleSetDry = async (animalId: string) => {
    const parturition = activeParturitions.get(animalId);
    if (!parturition || parturition.status === 'seca' || parturition.status === 'finalizada') return;

    setIsActionLoading(animalId);
    setMessage(null);
    try {
      await setLactationAsDry(parturition.id);
      activeParturitions.set(animalId, { ...parturition, status: 'seca' });
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error al secar ${animalId}: ${e.message}` });
    } finally {
      setIsActionLoading(null);
    }
  };

  // --- CAMBIO: handleSubmit ahora usa DataContext (Local-First) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const validEntries = Object.entries(weights)
      .map(([animalId, kg]) => ({ animalId, kg: parseFloat(kg) }))
      .filter(entry => !isNaN(entry.kg) && entry.kg > 0);

    if (validEntries.length === 0) {
      setMessage({ type: 'error', text: 'No se han introducido pesos válidos.' });
      setIsLoading(false);
      return;
    }

    try {
      // Usamos Promise.all para enviar todas las escrituras a Dexie
      const addPromises = validEntries.map(entry => {
        if (weightType === 'leche') {
          return addWeighing({
            goatId: entry.animalId,
            kg: entry.kg,
            date,
          });
        } else {
          return addBodyWeighing({
            animalId: entry.animalId,
            kg: entry.kg,
            date,
          });
        }
      });

      await Promise.all(addPromises);

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
                {weightType === 'leche' ? 'Sesión de Ordeño' : 'Sesión de Pesaje Corporal'}
            </h3>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-zinc-800 text-white p-2 rounded-lg text-sm"
            />
        </div>
        <p className="text-sm text-zinc-400">
            Registrando {weighedCount} / {animalsToWeigh.length} animales.
        </p>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {animalsToWeigh.map(animal => {
          if (weightType === 'corporal') {
            // --- VISTA PARA PESAJE CORPORAL (SIMPLE) ---
            return (
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
            );
          }

          // --- VISTA PARA PESAJE DE LECHE (CON BOTONES DE SECADO) ---
          const activeParturition = activeParturitions.get(animal.id);
          const rowIsLoading = isActionLoading === animal.id;
          
          return (
            <div key={animal.id} className="grid grid-cols-3 items-center gap-2 p-2 bg-black/20 rounded-lg">
              <label htmlFor={`weight-${animal.id}`} className="font-semibold text-white truncate col-span-1">
                {animal.id}
              </label>
              <input 
                id={`weight-${animal.id}`}
                type="number"
                step="0.1"
                value={weights[animal.id] || ''}
                onChange={(e) => handleWeightChange(animal.id, e.target.value)}
                placeholder="Kg"
                // Deshabilitar input si el animal no tiene parto activo
                disabled={!activeParturition || activeParturition.status === 'seca' || isLoading}
                className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center col-span-1 disabled:opacity-50"
              />
              <div className="col-span-1 flex items-center justify-end gap-1">
                {rowIsLoading ? (
                    <Loader2 className="animate-spin text-zinc-400" size={20} />
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => handleStartDrying(animal.id)}
                            disabled={!activeParturition || activeParturition.status !== 'activa' || isLoading}
                            title="Iniciar Secado"
                            className="p-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Wind size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetDry(animal.id)}
                            disabled={!activeParturition || activeParturition.status === 'seca' || activeParturition.status === 'finalizada' || isLoading}
                            title="Declarar Seca"
                            className="p-2 bg-gray-600/20 text-gray-300 rounded-lg hover:bg-gray-600/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Archive size={16} />
                        </button>
                    </>
                )}
              </div>
            </div>
          );
        })}
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
                disabled={isLoading || weighedCount === 0 || isActionLoading !== null}
                className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
IT'S               Guardar {weighedCount > 0 ? `(${weighedCount})` : ''}
            </button>
        </div>
      </div>
    </form>
  );
};
// src/components/forms/LogHealthEventForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AgendaTask } from '../../hooks/useHealthAgenda';
import { AlertTriangle } from 'lucide-react';

interface LogHealthEventFormProps {
  task: AgendaTask;
  onSave: () => void;
  onCancel: () => void;
}

export const LogHealthEventForm: React.FC<LogHealthEventFormProps> = ({ task, onSave, onCancel }) => {
  const { products, bodyWeighings, addHealthEvent } = useData();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(task.task.productId);
  const [doseApplied, setDoseApplied] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      // Auto-calcular dosis y costo
      const lastWeighing = bodyWeighings
        .filter(w => w.animalId === task.animal.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const weightInKg = lastWeighing?.kg || 50; // Usar último peso o el promedio de 50kg
      
      const dose = (weightInKg / 10) * selectedProduct.dosagePer10Kg;
      setDoseApplied(dose.toFixed(2));

      const costPerUnit = selectedProduct.totalCost / selectedProduct.totalVolume;
      const cost = dose * costPerUnit;
      setCalculatedCost(parseFloat(cost.toFixed(3)));
    }
  }, [selectedProduct, task.animal.id, bodyWeighings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedProduct) {
      setError('Por favor, selecciona un producto.');
      return;
    }
    setIsLoading(true);

    const finalDose = parseFloat(doseApplied);
    if (isNaN(finalDose) || finalDose <= 0) {
      setError('La dosis aplicada debe ser un número válido.');
      setIsLoading(false);
      return;
    }

    try {
      await addHealthEvent({
        animalId: task.animal.id,
        date,
        taskId: task.task.id,
        type: task.task.type,
        productUsed: selectedProduct.name,
        doseApplied: finalDose,
        unit: selectedProduct.unit,
        calculatedCost,
        notes: notes || undefined,
      });
      onSave(); // Llama a la función de éxito
    } catch (err) {
      setError('No se pudo guardar el evento.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">{task.animal.id}</h3>
        <p className="text-zinc-400">{task.task.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Aplicación</label>
          <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-zinc-400 mb-1">Producto Utilizado</label>
          <select id="product" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dose" className="block text-sm font-medium text-zinc-400 mb-1">Dosis Sugerida ({selectedProduct?.unit})</label>
          <input id="dose" type="number" step="0.1" value={doseApplied} onChange={e => setDoseApplied(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Costo Estimado</label>
          <div className="w-full bg-zinc-800 p-3 rounded-xl text-zinc-300">
            ${calculatedCost.toFixed(2)}
          </div>
        </div>
        <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-400 mb-1">Notas (Opcional)</label>
            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: El animal presentó fiebre..." className="w-full bg-zinc-800 p-3 rounded-xl"></textarea>
        </div>
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
          {isLoading ? 'Guardando...' : 'Confirmar Registro'}
        </button>
      </div>
    </form>
  );
};
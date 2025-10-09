// src/components/forms/HealthPlanTaskForm.tsx

import React, { useState, useEffect } from 'react';
import { HealthPlanTask, Product } from '../../db/local';
import { useData } from '../../context/DataContext';
import { AlertTriangle } from 'lucide-react';

interface HealthPlanTaskFormProps {
  planId: string;
  onSave: (taskData: Omit<HealthPlanTask, 'id'>) => Promise<void>;
  onCancel: () => void;
  existingTask?: HealthPlanTask;
}

const taskTypes: HealthPlanTask['type'][] = ['Desparasitación', 'Vacunación', 'Vitaminas', 'Minerales', 'Control'];

export const HealthPlanTaskForm: React.FC<HealthPlanTaskFormProps> = ({ planId, onSave, onCancel, existingTask }) => {
  const { products } = useData();

  const [name, setName] = useState('');
  const [type, setType] = useState<HealthPlanTask['type']>('Control');
  const [productId, setProductId] = useState('');
  const [triggerDays, setTriggerDays] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingTask) {
      setName(existingTask.name);
      setType(existingTask.type);
      setProductId(existingTask.productId);
      if (existingTask.trigger.type === 'age' && existingTask.trigger.days) {
        setTriggerDays(String(existingTask.trigger.days));
      }
    }
  }, [existingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !productId || !triggerDays) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setIsLoading(true);

    const taskData: Omit<HealthPlanTask, 'id'> = {
      healthPlanId: planId,
      name,
      type,
      productId,
      trigger: {
        type: 'age',
        days: parseInt(triggerDays, 10),
      }
    };

    try {
      await onSave(taskData);
    } catch (err) {
      setError('No se pudo guardar la tarea.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="taskName" className="block text-sm font-medium text-zinc-400 mb-1">Nombre de la Tarea</label>
        <input id="taskName" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: 1ra Dosis Clostridial" className="w-full bg-zinc-800 p-3 rounded-xl" required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="taskType" className="block text-sm font-medium text-zinc-400 mb-1">Tipo de Tarea</label>
          <select id="taskType" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
            {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-zinc-400 mb-1">Producto a Utilizar</label>
          <select id="product" value={productId} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
            <option value="">Seleccionar producto...</option>
            {products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
          </select>
        </div>
      </div>
      
      <fieldset className="bg-black/20 rounded-xl p-4 border border-zinc-700">
        <legend className="px-2 text-sm font-semibold text-zinc-300">Disparador (Trigger)</legend>
        <div className="pt-2">
            <label htmlFor="triggerDays" className="block text-xs font-medium text-zinc-400 mb-1">Aplicar a los (días de edad)</label>
            <input id="triggerDays" type="number" value={triggerDays} onChange={e => setTriggerDays(e.target.value)} placeholder="Ej: 60" className="w-full bg-zinc-800 p-2 rounded-lg" required />
            <p className="text-xs text-zinc-500 mt-2">Por ahora solo se soportan disparadores por edad. Próximamente se añadirán fechas fijas.</p>
        </div>
      </fieldset>
      
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
          {isLoading ? 'Guardando...' : 'Guardar Tarea'}
        </button>
      </div>
    </form>
  );
};
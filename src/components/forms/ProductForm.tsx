// src/components/forms/ProductForm.tsx

import React, { useState, useEffect } from 'react';
import { Product } from '../../db/local';
import { AlertTriangle } from 'lucide-react';

interface ProductFormProps {
  onSave: (productData: Omit<Product, 'id'>) => Promise<void>;
  onCancel: () => void;
  existingProduct?: Product; // Para modo edición
}

export const ProductForm: React.FC<ProductFormProps> = ({ onSave, onCancel, existingProduct }) => {
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [totalVolume, setTotalVolume] = useState('');
  const [unit, setUnit] = useState<'ml' | 'g' | 'unidad'>('ml');
  const [dosagePer10Kg, setDosagePer10Kg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setPresentation(existingProduct.presentation);
      setTotalCost(String(existingProduct.totalCost));
      setTotalVolume(String(existingProduct.totalVolume));
      setUnit(existingProduct.unit);
      setDosagePer10Kg(String(existingProduct.dosagePer10Kg));
    }
  }, [existingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const numTotalCost = parseFloat(totalCost);
    const numTotalVolume = parseFloat(totalVolume);
    const numDosage = parseFloat(dosagePer10Kg);

    if (!name || !presentation || isNaN(numTotalCost) || isNaN(numTotalVolume) || isNaN(numDosage)) {
      setError('Por favor, completa todos los campos con valores válidos.');
      setIsLoading(false);
      return;
    }

    const productData: Omit<Product, 'id'> = {
      name,
      presentation,
      totalCost: numTotalCost,
      totalVolume: numTotalVolume,
      unit,
      dosagePer10Kg: numDosage,
    };

    try {
      await onSave(productData);
    } catch (err) {
      setError('No se pudo guardar el producto.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Producto</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ivermectina al 1%" className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label htmlFor="presentation" className="block text-sm font-medium text-zinc-400 mb-1">Presentación</label>
          <input id="presentation" type="text" value={presentation} onChange={e => setPresentation(e.target.value)} placeholder="Ej: Frasco 500ml" className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label htmlFor="totalCost" className="block text-sm font-medium text-zinc-400 mb-1">Costo Total del Envase</label>
          <input id="totalCost" type="number" step="0.01" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="20.00" className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label htmlFor="totalVolume" className="block text-sm font-medium text-zinc-400 mb-1">Volumen/Cantidad Total</label>
          <input id="totalVolume" type="number" step="1" value={totalVolume} onChange={e => setTotalVolume(e.target.value)} placeholder="500" className="w-full bg-zinc-800 p-3 rounded-xl" required />
        </div>
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-zinc-400 mb-1">Unidad</label>
          <select id="unit" value={unit} onChange={e => setUnit(e.target.value as any)} className="w-full bg-zinc-800 p-3 rounded-xl">
            <option value="ml">ml (líquido)</option>
            <option value="g">g (polvo/sólido)</option>
            <option value="unidad">unidad (pastilla/bolo)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dosage" className="block text-sm font-medium text-zinc-400 mb-1">Dosis por cada 10 Kg de peso</label>
          <input id="dosage" type="number" step="0.1" value={dosagePer10Kg} onChange={e => setDosagePer10Kg(e.target.value)} placeholder="0.2" className="w-full bg-zinc-800 p-3 rounded-xl" required />
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
          {isLoading ? 'Guardando...' : 'Guardar Producto'}
        </button>
      </div>
    </form>
  );
};
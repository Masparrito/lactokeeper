// src/components/modals/DecommissionAnimalModal.tsx

import React, { useState } from 'react';
import { Animal } from '../../db/local';
import { Modal } from '../ui/Modal';

// Define los datos que el modal devolverá al confirmar.
export interface DecommissionDetails {
  reason: 'Venta' | 'Muerte' | 'Descarte';
  date: string;
  salePrice?: number;
  saleBuyer?: string;
  salePurpose?: 'Cría' | 'Carne';
  deathReason?: string;
  cullReason?: Animal['cullReason'];
  cullReasonDetails?: string;
}

interface DecommissionAnimalModalProps {
  animal: Animal;
  onConfirm: (details: DecommissionDetails) => void;
  onCancel: () => void;
}

export const DecommissionAnimalModal: React.FC<DecommissionAnimalModalProps> = ({
  animal,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState<'Venta' | 'Muerte' | 'Descarte'>('Venta');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [purpose, setPurpose] = useState<'Cría' | 'Carne'>('Cría');
  const [deathReason, setDeathReason] = useState('');
  const [cullReason, setCullReason] = useState<Animal['cullReason']>();
  const [cullDetails, setCullDetails] = useState('');

  const cullOptions: NonNullable<Animal['cullReason']>[] = [
    'Baja producción', 'Bajo índice de crecimiento', 'Inflamación articular', 
    'Linfadenitis caseosa', 'Sospecha de otras enfermedades'
  ];

  const handleConfirmClick = () => {
    const details: DecommissionDetails = {
      reason,
      date,
      salePrice: reason === 'Venta' ? parseFloat(price) || undefined : undefined,
      saleBuyer: reason === 'Venta' ? buyer || undefined : undefined,
      salePurpose: reason === 'Venta' ? purpose : undefined,
      deathReason: reason === 'Muerte' ? deathReason || undefined : undefined,
      cullReason: reason === 'Descarte' ? cullReason || undefined : undefined,
      cullReasonDetails: reason === 'Descarte' && cullReason === 'Sospecha de otras enfermedades' ? cullDetails : undefined,
    };
    onConfirm(details);
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title={`Dar de Baja a ${animal.id}`}>
      <div className="space-y-4">
        {/* Selector de Razón */}
        <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
            <button onClick={() => setReason('Venta')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Venta' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Venta</button>
            <button onClick={() => setReason('Muerte')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Muerte' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Muerte</button>
            <button onClick={() => setReason('Descarte')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Descarte' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Descarte</button>
        </div>
        
        {/* Inputs Condicionales */}
        <div className="animate-fade-in">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Evento</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
        </div>

        {reason === 'Venta' && (
            <div className="space-y-4 animate-fade-in">
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio de Venta (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                <input type="text" value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Comprador (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                <select value={purpose} onChange={e => setPurpose(e.target.value as any)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg"><option value="Cría">Para Cría</option><option value="Carne">Para Carne</option></select>
            </div>
        )}
        {reason === 'Muerte' && (
            <div className="animate-fade-in">
                <textarea value={deathReason} onChange={e => setDeathReason(e.target.value)} placeholder="Causa / Descripción de la muerte..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg" rows={3}></textarea>
            </div>
        )}
        {reason === 'Descarte' && (
            <div className="space-y-4 animate-fade-in">
                <select value={cullReason || ''} onChange={e => setCullReason(e.target.value as Animal['cullReason'])} className="w-full bg-zinc-800 p-3 rounded-xl text-lg">
                    <option value="">Seleccione una causa...</option>
                    {cullOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {cullReason === 'Sospecha de otras enfermedades' && (
                    <input type="text" value={cullDetails} onChange={e => setCullDetails(e.target.value)} placeholder="Especificar sospecha o síntomas..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                )}
            </div>
        )}

        <p className="text-xs text-zinc-500 text-center pt-2">El animal será movido a "Referencia". Esta acción no se puede deshacer desde esta pantalla.</p>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
          <button onClick={handleConfirmClick} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg">Confirmar Baja</button>
        </div>
      </div>
    </Modal>
  );
};
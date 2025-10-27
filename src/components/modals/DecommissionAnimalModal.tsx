// src/components/modals/DecommissionAnimalModal.tsx

import React, { useState } from 'react';
import { Animal } from '../../db/local'; // Import Animal type
import { Modal } from '../ui/Modal'; // Import Modal component
// --- CAMBIO: formatAnimalDisplay ya no es necesario ---
// import { formatAnimalDisplay } from '../../utils/formatting';

// Define la estructura para los detalles devueltos
export interface DecommissionDetails {
  reason: 'Venta' | 'Muerte' | 'Descarte'; // La razón de la baja
  date: string; // Fecha del evento (YYYY-MM-DD)
  salePrice?: number;
  saleBuyer?: string;
  salePurpose?: 'Cría' | 'Carne';
  deathReason?: string;
  cullReason?: Animal['cullReason'];
  cullReasonDetails?: string;
}

// Props definition for the component
interface DecommissionAnimalModalProps {
  animal: Animal; // El animal a dar de baja
  onConfirm: (details: DecommissionDetails) => void; // Callback con detalles
  onCancel: () => void; // Callback al cancelar
  // --- CAMBIO: Se añade 'reason' como prop requerida (venía de RebanoProfilePage) ---
  reason: 'Venta' | 'Muerte' | 'Descarte';
  // --- CAMBIO: Se añade 'isOpen' (que se usaba en RebanoProfilePage) ---
  isOpen: boolean;
}

export const DecommissionAnimalModal: React.FC<DecommissionAnimalModalProps> = ({
  animal,
  onConfirm,
  onCancel,
  reason, // Usamos la razón pasada como prop
  isOpen // Usamos isOpen para controlar la visibilidad
}) => {
  // El estado 'reason' local ya no es necesario
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

  // --- CAMBIO: Preparar nombre formateado ---
  const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

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

  // Determinar el título basado en la razón
  const title = `Dar de baja por ${reason}`;

  // No renderizar nada si no está abierto
  if (!isOpen) return null;

  return (
    <Modal
        isOpen={isOpen} // Controlado por prop
        onClose={onCancel}
        title={title} // Título dinámico
    >
      <div className="space-y-4 text-white">
        {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
        <div className="text-center mb-4">
            <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
            {formattedName && (
                <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
            )}
        </div>
        {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}

        {/* El selector de razón ya no está aquí, viene como prop */}
        
        {/* Date Input (Common to all reasons) */}
        <div className="animate-fade-in">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Evento</label>
            <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white"
                max={new Date().toISOString().split('T')[0]}
                required
             />
        </div>

        {/* Conditional Inputs based on selected 'reason' */}
        {reason === 'Venta' && (
            <div className="space-y-4 animate-fade-in">
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio de Venta (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                <input type="text" value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Comprador (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                <select value={purpose} onChange={e => setPurpose(e.target.value as 'Cría' | 'Carne')} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none">
                    <option value="Cría">Para Cría</option>
                    <option value="Carne">Para Carne</option>
                </select>
            </div>
        )}
        {reason === 'Muerte' && (
            <div className="animate-fade-in">
                <textarea value={deathReason} onChange={e => setDeathReason(e.target.value)} placeholder="Causa / Descripción de la muerte..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" rows={3}></textarea>
            </div>
        )}
        {reason === 'Descarte' && (
            <div className="space-y-4 animate-fade-in">
                <select value={cullReason || ''} onChange={e => setCullReason(e.target.value as Animal['cullReason'])} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none">
                    <option value="">Seleccione una causa...</option>
                    {cullOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {cullReason === 'Sospecha de otras enfermedades' && (
                    <input type="text" value={cullDetails} onChange={e => setCullDetails(e.target.value)} placeholder="Especificar sospecha o síntomas..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                )}
            </div>
        )}

        <p className="text-xs text-zinc-500 text-center pt-2">El animal será movido a "Referencia".</p>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
          <button onClick={handleConfirmClick} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg">Confirmar Baja</button>
        </div>
      </div>
    </Modal>
  );
};
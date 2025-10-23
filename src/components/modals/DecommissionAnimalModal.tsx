// src/components/modals/DecommissionAnimalModal.tsx

import React, { useState } from 'react';
import { Animal } from '../../db/local'; // Import Animal type
import { Modal } from '../ui/Modal'; // Import Modal component
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// Define the structure for the details returned on confirmation
export interface DecommissionDetails {
  reason: 'Venta' | 'Muerte' | 'Descarte'; // The reason for decommissioning
  date: string; // Date of the event (YYYY-MM-DD)
  // Optional fields specific to 'Venta'
  salePrice?: number;
  saleBuyer?: string;
  salePurpose?: 'Cría' | 'Carne';
  // Optional field specific to 'Muerte'
  deathReason?: string;
  // Optional fields specific to 'Descarte'
  cullReason?: Animal['cullReason']; // Use the type defined in Animal interface
  cullReasonDetails?: string; // Additional details for 'Sospecha'
}

// Props definition for the component
interface DecommissionAnimalModalProps {
  animal: Animal; // The animal being decommissioned
  onConfirm: (details: DecommissionDetails) => void; // Callback with details on confirmation
  onCancel: () => void; // Callback on cancellation
}

export const DecommissionAnimalModal: React.FC<DecommissionAnimalModalProps> = ({
  animal,
  onConfirm,
  onCancel,
}) => {
  // State for the selected reason and corresponding details
  const [reason, setReason] = useState<'Venta' | 'Muerte' | 'Descarte'>('Venta'); // Default to 'Venta'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default date to today
  // State for 'Venta' details
  const [price, setPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [purpose, setPurpose] = useState<'Cría' | 'Carne'>('Cría'); // Default purpose
  // State for 'Muerte' details
  const [deathReason, setDeathReason] = useState('');
  // State for 'Descarte' details
  const [cullReason, setCullReason] = useState<Animal['cullReason']>(); // Specific cull reason
  const [cullDetails, setCullDetails] = useState(''); // Details if 'Sospecha'

  // Define available options for cullReason select dropdown
  const cullOptions: NonNullable<Animal['cullReason']>[] = [
    'Baja producción', 'Bajo índice de crecimiento', 'Inflamación articular',
    'Linfadenitis caseosa', 'Sospecha de otras enfermedades'
  ];

  // Handler for the confirm button
  const handleConfirmClick = () => {
    // Construct the details object based on the selected reason
    const details: DecommissionDetails = {
      reason,
      date,
      // Include sale details only if reason is 'Venta'
      salePrice: reason === 'Venta' ? parseFloat(price) || undefined : undefined, // Convert price to number or undefined
      saleBuyer: reason === 'Venta' ? buyer || undefined : undefined,
      salePurpose: reason === 'Venta' ? purpose : undefined,
      // Include death reason only if reason is 'Muerte'
      deathReason: reason === 'Muerte' ? deathReason || undefined : undefined,
      // Include cull details only if reason is 'Descarte'
      cullReason: reason === 'Descarte' ? cullReason || undefined : undefined,
      // Include specific details only if cullReason is 'Sospecha...'
      cullReasonDetails: reason === 'Descarte' && cullReason === 'Sospecha de otras enfermedades' ? cullDetails : undefined,
    };
    // Call the onConfirm callback with the collected details
    onConfirm(details);
  };

  // --- RENDERIZADO DEL MODAL ---
  return (
    // Base Modal component
    <Modal
        isOpen={true} // Assumed controlled externally, always true when rendered
        onClose={onCancel} // Close handler
        // --- USO DE formatAnimalDisplay en título ---
        title={`Dar de Baja a ${formatAnimalDisplay(animal)}`} // Dynamic title
    >
      <div className="space-y-4 text-white"> {/* Added text-white for default text color */}
        {/* Reason Selector (Venta / Muerte / Descarte) */}
        <div className="flex bg-zinc-800 rounded-xl p-1 w-full">
            <button onClick={() => setReason('Venta')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Venta' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Venta</button>
            <button onClick={() => setReason('Muerte')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Muerte' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Muerte</button>
            <button onClick={() => setReason('Descarte')} className={`w-1/3 rounded-lg py-2 text-sm font-semibold transition-colors ${reason === 'Descarte' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Descarte</button>
        </div>

        {/* Date Input (Common to all reasons) */}
        <div className="animate-fade-in"> {/* Added fade-in for smoother appearance */}
            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Evento</label>
            <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" // Consistent styling
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                required // Date is always required
             />
        </div>

        {/* Conditional Inputs based on selected 'reason' */}
        {/* Inputs for 'Venta' */}
        {reason === 'Venta' && (
            <div className="space-y-4 animate-fade-in">
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Precio de Venta (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                <input type="text" value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Comprador (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                <select value={purpose} onChange={e => setPurpose(e.target.value as 'Cría' | 'Carne')} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none"> {/* Added appearance-none */}
                    <option value="Cría">Para Cría</option>
                    <option value="Carne">Para Carne</option>
                </select>
            </div>
        )}
        {/* Input for 'Muerte' */}
        {reason === 'Muerte' && (
            <div className="animate-fade-in">
                <textarea value={deathReason} onChange={e => setDeathReason(e.target.value)} placeholder="Causa / Descripción de la muerte..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" rows={3}></textarea>
            </div>
        )}
        {/* Inputs for 'Descarte' */}
        {reason === 'Descarte' && (
            <div className="space-y-4 animate-fade-in">
                {/* Select dropdown for cull reason */}
                <select value={cullReason || ''} onChange={e => setCullReason(e.target.value as Animal['cullReason'])} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none"> {/* Added appearance-none */}
                    <option value="">Seleccione una causa...</option>
                    {cullOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {/* Conditional input for details if 'Sospecha' is selected */}
                {cullReason === 'Sospecha de otras enfermedades' && (
                    <input type="text" value={cullDetails} onChange={e => setCullDetails(e.target.value)} placeholder="Especificar sospecha o síntomas..." className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" />
                )}
            </div>
        )}

        {/* Informational text */}
        <p className="text-xs text-zinc-500 text-center pt-2">El animal será movido a "Referencia". Esta acción no se puede deshacer fácilmente.</p>

        {/* Action Buttons (Cancel / Confirm) */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
          <button onClick={handleConfirmClick} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg">Confirmar Baja</button>
        </div>
      </div>
    </Modal>
  );
};
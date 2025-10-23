// src/components/modals/DeclareAbortionModal.tsx

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Father } from '../../db/local'; // Import types
import { Modal } from '../ui/Modal';
import { AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal'; // Modal to add a new sire
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// Props definition for the component
interface DeclareAbortionModalProps {
  animal: Animal; // The dam (mother) experiencing the abortion
  onSaveSuccess: () => void; // Callback on successful save
  onCancel: () => void; // Callback on cancellation
}

export const DeclareAbortionModal: React.FC<DeclareAbortionModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  // Get data and actions from context
  const { fathers, addFather, addParturition } = useData(); // Using addParturition to record the event

  // Local state for the form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default date to today
  const [sireId, setSireId] = useState(''); // Selected Sire ID
  const [inducedLactation, setInducedLactation] = useState(true); // Option to start lactation
  const [isLoading, setIsLoading] = useState(false); // Loading state for saving
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // User messages
  const [isFatherModalOpen, setIsFatherModalOpen] = useState(false); // State for Add Father modal

  // Handler for submitting the abortion record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    // Validate sire selection
    if (!sireId) {
        setMessage({ type: 'error', text: 'Debe seleccionar el padre (semental).' });
        return;
    }
    setIsLoading(true); // Set loading state
    setMessage(null); // Clear previous messages

    try {
      // Use the existing addParturition function, but mark the outcome as 'Aborto'
      await addParturition({
        motherId: animal.id,
        parturitionDate: date,
        sireId: sireId,
        parturitionType: 'Simple', // Default, not relevant for abortion but required by type
        offspringCount: 0, // No live offspring
        liveOffspring: [], // No offspring details needed
        parturitionOutcome: 'Aborto', // Key field to identify this event type
        inducedLactation: inducedLactation, // Pass the checkbox state
      });

      setMessage({ type: 'success', text: 'Aborto registrado con éxito.' });
      setTimeout(onSaveSuccess, 1500); // Close modal after 1.5 seconds

    } catch (error: any) {
      // Show error message if saving fails
      setMessage({ type: 'error', text: error.message || 'No se pudo registrar el aborto.' });
      setIsLoading(false); // Reset loading state
    }
  };

  // Handler for saving a new father added via the modal
  const handleSaveFather = async (newFather: Father) => {
    try {
        await addFather(newFather); // Save the new father using context function
        setSireId(newFather.id); // Automatically select the newly added father
        setIsFatherModalOpen(false); // Close the Add Father modal
    } catch (error: any) {
        // Handle potential error during father saving (optional: show message)
        console.error("Error saving new father:", error);
        setMessage({ type: 'error', text: error.message || 'No se pudo guardar el nuevo padre.'});
    }
  };

  // --- RENDERIZADO DEL MODAL ---
  return (
    <>
      <Modal
          isOpen={!isFatherModalOpen} // Show this modal only if AddFatherModal is closed
          onClose={onCancel}
          // --- USO DE formatAnimalDisplay en título ---
          title={`Registrar Aborto: ${formatAnimalDisplay(animal)}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Input */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha del Aborto</label>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" // Consistent styling
                    required
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                 />
            </div>

            {/* Sire Selector */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Padre (Semental Involucrado)</label>
                <div className="flex items-center gap-2">
                    <select
                        value={sireId}
                        onChange={e => setSireId(e.target.value)}
                        className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white appearance-none" // Consistent styling
                        required
                    >
                        <option value="">Seleccionar Padre...</option>
                        {/* Map available fathers */}
                        {/* --- USO DE formatAnimalDisplay en opciones --- */}
                        {fathers.map((f: Father) => <option key={f.id} value={f.id}>{formatAnimalDisplay(f)}</option>)}
                    </select>
                    {/* Button to add a new Father */}
                    <button
                        type="button"
                        onClick={() => setIsFatherModalOpen(true)}
                        className="flex-shrink-0 p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"
                        title="Añadir Nuevo Padre de Referencia"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* Induced Lactation Checkbox */}
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
            {/* Helper text for the checkbox */}
            <p className="text-xs text-zinc-500 text-center px-4">
                Marcar esta opción iniciará una lactancia "atípica" para poder registrar los pesajes.
            </p>

            {/* Message display area */}
            {message && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white" // Consistent styling
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isLoading} // Disable while loading
                    className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50" // Consistent styling
                >
                    {isLoading ? 'Guardando...' : 'Confirmar Aborto'} {/* Dynamic button text */}
                </button>
            </div>
        </form>
      </Modal>

      {/* Modal for adding a new Father (Sire) */}
      <AddFatherModal
          isOpen={isFatherModalOpen} // Controlled by local state
          onClose={() => setIsFatherModalOpen(false)} // Closes this modal
          onSave={handleSaveFather} // Saves the new father and selects it
      />
    </>
  );
};
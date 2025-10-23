// src/components/modals/AddMilkWeighingModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local'; // Animal type
import { AlertTriangle, CheckCircle, Save, Wind, Archive, Baby } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ParturitionModal } from './ParturitionModal'; // Modal to declare parturition
import { calculateDEL } from '../../utils/calculations'; // DEL calculation utility
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// Props definition for the component
interface AddMilkWeighingModalProps {
  animal: Animal; // The animal being weighed
  onSaveSuccess: () => void; // Callback on successful save
  onCancel: () => void; // Callback on cancellation
}

export const AddMilkWeighingModal: React.FC<AddMilkWeighingModalProps> = ({
  animal,
  onSaveSuccess,
  onCancel,
}) => {
  // Get data and actions from context
  const { parturitions, addWeighing, startDryingProcess, setLactationAsDry } = useData();

  // Local state for the form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default date to today
  const [kg, setKg] = useState(''); // Milk weight input
  const [isLoading, setIsLoading] = useState(false); // Loading state for saving
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // User messages
  const [isParturitionModalOpen, setParturitionModalOpen] = useState(false); // State for parturition modal

  // Find the currently active or drying parturition for this animal
  const activeParturition = useMemo(() => {
    return parturitions
      // Filter parturitions for this animal that are 'activa' or 'en-secado'
      .filter(p => p.goatId === animal.id && (p.status === 'activa' || p.status === 'en-secado'))
      // Sort by date descending to get the most recent one
      .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0]; // Get the first element (most recent)
  }, [parturitions, animal.id]); // Recalculate if parturitions or animal ID changes

  // Calculate Days In Milk (DEL) based on the active parturition and selected date
  const del = activeParturition ? calculateDEL(activeParturition.parturitionDate, date) : null;

  // Handler for submitting the weighing form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    // Check if there is an active/drying parturition before saving
    if (!activeParturition || activeParturition.status === 'seca' || activeParturition.status === 'finalizada') {
        setMessage({ type: 'error', text: 'No se puede guardar pesaje. El animal no tiene una lactancia activa o en secado.' });
        return; // Stop if no active lactation
    };

    setMessage(null); // Clear previous messages
    setIsLoading(true); // Set loading state
    const weightValue = parseFloat(kg); // Convert weight input to number

    // Validate weight input
    if (isNaN(weightValue) || weightValue <= 0) {
      setMessage({ type: 'error', text: 'Por favor, introduce un peso válido.' });
      setIsLoading(false); return;
    }
    // Validate against unreasonably high production
    if (weightValue > 8.5) {
      setMessage({ type: 'error', text: 'La producción parece irracionalmente alta (> 8.5 Kg).' });
      setIsLoading(false); return;
    }

    try {
      // Call the context function to add the weighing record
      await addWeighing({ goatId: animal.id, date, kg: weightValue });
      // --- USO DE formatAnimalDisplay en mensaje ---
      setMessage({ type: 'success', text: `Pesaje de ${formatAnimalDisplay(animal)} guardado con éxito.` });
      setTimeout(onSaveSuccess, 1500); // Close modal after 1.5 seconds on success
    } catch (error: any) {
      // Show error message if saving fails
      setMessage({ type: 'error', text: error.message || 'No se pudo guardar el pesaje.' });
      setIsLoading(false); // Reset loading state
    }
  };

  // --- Handlers for Drying Actions ---
  // Handler to initiate the drying process
  const handleStartDrying = async () => {
    if (!activeParturition || activeParturition.status !== 'activa') return; // Only possible if lactation is 'activa'
    setIsLoading(true); setMessage(null);
    try {
      await startDryingProcess(activeParturition.id); // Call context action
      setMessage({ type: 'success', text: 'Proceso de secado iniciado con éxito.' });
      setTimeout(onSaveSuccess, 1500); // Close on success
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo iniciar el secado.' });
      setIsLoading(false);
    }
  };

  // Handler to declare the lactation as dry
  const handleSetDry = async () => {
    // Possible if 'activa' or 'en-secado'
    if (!activeParturition || activeParturition.status === 'seca' || activeParturition.status === 'finalizada') return;
    setIsLoading(true); setMessage(null);
    try {
      await setLactationAsDry(activeParturition.id); // Call context action
      setMessage({ type: 'success', text: 'Lactancia declarada como seca con éxito.' });
      setTimeout(onSaveSuccess, 1500); // Close on success
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo finalizar la lactancia.' });
      setIsLoading(false);
    }
  };

  // --- RENDERIZADO DEL MODAL ---
  return (
    <>
      {/* Main Weighing Modal (only shown if parturition modal is closed) */}
      <Modal
        isOpen={!isParturitionModalOpen} // Show if parturition modal is hidden
        onClose={onCancel}
        // --- USO DE formatAnimalDisplay en título ---
        title={`Pesaje Lechero: ${formatAnimalDisplay(animal)}`}
      >
        <div className="space-y-4">
          {/* Show form if there's an active/drying parturition */}
          {activeParturition ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date and DEL display */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weighingDateMilk" className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                  <input id="weighingDateMilk" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Días en Leche (DEL)</label>
                  <div className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-center font-bold text-white">{del ?? 'N/A'}</div>
                </div>
              </div>

              {/* Milk Production Input */}
              <div>
                <label htmlFor="weighingKgMilk" className="block text-sm font-medium text-zinc-400 mb-1">Producción (Kg)</label>
                <input id="weighingKgMilk" type="number" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="Ej: 3.5" autoFocus className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-white" required />
              </div>

              {/* Message display area */}
              {message && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Save/Cancel Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"><Save size={18}/> Guardar Pesaje</button>
              </div>

              {/* --- SECTION FOR DRYING ACTIONS --- */}
              <div className="space-y-2 pt-4 border-t border-brand-border">
                  <h4 className="text-sm font-semibold text-zinc-400">Otras Acciones de Lactancia</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                      {/* Button to Start Drying Process */}
                      <button
                          type="button"
                          onClick={handleStartDrying}
                          disabled={isLoading || activeParturition.status !== 'activa'} // Disable if loading or not 'activa'
                          className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-300 font-semibold py-3 px-3 rounded-lg hover:bg-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Wind size={16}/> {activeParturition.status === 'en-secado' ? 'Ya en Secado' : 'Iniciar Secado'}
                      </button>
                      {/* Button to Declare Dry */}
                      <button
                          type="button"
                          onClick={handleSetDry}
                          // Disable if loading or already dry/finished
                          disabled={isLoading || activeParturition.status === 'seca' || activeParturition.status === 'finalizada'}
                          className="w-full flex items-center justify-center gap-2 bg-gray-600/20 text-gray-300 font-semibold py-3 px-3 rounded-lg hover:bg-gray-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Archive size={16}/> {activeParturition.status === 'seca' ? 'Ya Seca' : 'Declarar Seca'}
                      </button>
                  </div>
              </div>

            </form>
          ) : (
            // --- Message shown if no active parturition ---
            <div className="text-center space-y-4">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
              {/* --- USO DE formatAnimalDisplay en título --- */}
              <h3 className="text-lg font-medium text-white">Animal ({formatAnimalDisplay(animal)}) sin Parto Activo</h3>
              <p className="text-sm text-zinc-400">
                Para registrar un pesaje o gestionar el secado, debe tener un parto activo.
              </p>
              {/* Button to open the parturition declaration modal */}
              <button onClick={() => setParturitionModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                <Baby size={18} /> Declarar Parto
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Conditional rendering of the Parturition Modal */}
      {isParturitionModalOpen && (
        <ParturitionModal
          isOpen={isParturitionModalOpen} // Pass state to control visibility
          onClose={() => {
            setParturitionModalOpen(false); // Close this modal
            // NOTE: We don't call onCancel here, allowing the user
            // to potentially add a weighing after declaring the parturition.
            // If the weighing modal should close too, call onCancel() here.
          }}
          motherId={animal.id} // Pass the mother's ID
        />
      )}
    </>
  );
};
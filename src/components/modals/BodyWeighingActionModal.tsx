// src/components/modals/BodyWeighingActionModal.tsx

import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local'; // Import Parturition type
import { Calendar, ChevronRight, History, PlusCircle, Target } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getAnimalZootecnicCategory } from '../../utils/calculations'; // Utility for category
// --- CAMBIO: formatAnimalDisplay ya no es necesario ---
// import { formatAnimalDisplay } from '../../utils/formatting';

// Props definition for the component
interface BodyWeighingActionModalProps {
  isOpen: boolean; // Controls modal visibility
  animal: Animal; // The animal context for actions
  onClose: () => void; // Function to close the modal
  onLogToSession: (date: string) => void; // Function to add weighing to an existing session
  onStartNewSession: () => void; // Function to start a new weighing session flow
  onSetReadyForMating: () => void; // Function to declare the animal ready for mating
}

export const BodyWeighingActionModal: React.FC<BodyWeighingActionModalProps> = ({
  isOpen, // Prop received from parent
  animal,
  onClose,
  onLogToSession,
  onStartNewSession,
  onSetReadyForMating,
}) => {
  // Get data from context
  const { bodyWeighings, parturitions } = useData();

  // Memoize recent body weighing session dates
  const recentSessions = useMemo(() => {
    // Get all unique dates from body weighings
    const allDates = bodyWeighings.map(w => w.date);
    const uniqueDates = [...new Set(allDates)];
    // Sort dates descending and take the top 3
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
  }, [bodyWeighings]); // Recalculate if bodyWeighings change

  // Determine zootecnic category for conditional actions
  const zootecnicCategory = getAnimalZootecnicCategory(animal, parturitions);
  // Check if the "Ready for Mating" action should be available
  const isReadyForMatingAction = zootecnicCategory === 'Cabritona' && animal.reproductiveStatus === 'Vacía';

  // --- CAMBIO: Preparar nombre formateado ---
  const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

  // --- RENDERIZADO DEL MODAL ---
  return (
    <Modal
        isOpen={isOpen} // Pass visibility state
        onClose={onClose} // Pass close handler
        // --- CAMBIO: Título genérico ---
        title="Pesaje Corporal"
    >
      <div className="space-y-6">
        {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
        <div className="text-center mb-2"> {/* Added mb-2 for spacing */}
            <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
            {formattedName && (
                <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
            )}
        </div>
        {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
      
        {/* Section to add to recent sessions */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><History size={16} />Añadir a Sesión Reciente</h3>
          {/* List recent sessions or show message */}
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((date) => (
                // Button for each recent session
                <button
                    key={date}
                    onClick={() => onLogToSession(date)} // Call handler with the selected date
                    className="w-full text-left bg-zinc-800/80 p-3 rounded-xl hover:bg-zinc-700 transition-colors flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-500" />
                    {/* Display formatted date */}
                    <span className="text-base font-semibold text-white">
                      {new Date(date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </span>
                  </div>
                  <ChevronRight size={20} className="text-zinc-600" />
                </button>
              ))}
            </div>
          ) : (
            // Message if no recent sessions exist
            <p className="text-center text-sm text-zinc-500 py-4">No hay sesiones recientes.</p>
          )}
        </div>

        {/* Section to start a new session */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><PlusCircle size={16} />Iniciar Nueva Sesión de Pesaje</h3>
          {/* Button to trigger the new session flow */}
          <button
            onClick={onStartNewSession} // Call handler to start new session
            className="w-full text-left bg-brand-green/20 border border-brand-green/80 p-4 rounded-xl hover:bg-brand-green/30 transition-colors flex justify-between items-center"
          >
            <span className="text-lg font-bold text-white">Construir Carga Masiva...</span>
            <ChevronRight size={20} className="text-brand-green" />
          </button>
           {/* Helper text */}
           <p className="text-xs text-zinc-500 text-center px-4 mt-2">
              Esto te permitirá seleccionar un grupo de animales y registrar sus pesos.
            </p>
        </div>

        {/* Conditional section for "Ready for Mating" action */}
        {isReadyForMatingAction && (
            <div className="pt-4 border-t border-brand-border">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Acciones de Desarrollo</h3>
                <div className="flex">
                    {/* Button to declare ready for mating */}
                    <button
                        onClick={onSetReadyForMating} // Call the specific handler
                        className="w-full flex items-center justify-center gap-2 bg-pink-600/20 text-pink-300 font-semibold py-3 px-3 rounded-lg hover:bg-pink-600/40 transition-colors"
                    >
                        <Target size={16}/> Declarar en Peso de Monta
                    </button>
                </div>
                 {/* Helper text */}
                <p className="text-xs text-zinc-500 text-center px-4 mt-2">
                    Si el animal tiene el peso y la edad adecuados, esto lo marcará como "En Servicio".
                </p>
            </div>
        )}
      </div>
    </Modal>
  );
};
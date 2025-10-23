// src/components/modals/MilkWeighingActionModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Parturition } from '../../db/local'; // Import Parturition type
import { AlertTriangle, Baby, Calendar, ChevronRight, History, PlusCircle, Wind, Archive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ParturitionModal } from './ParturitionModal'; // Modal to declare parturition
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// Props definition for the component
interface MilkWeighingActionModalProps {
  isOpen: boolean; // Controls modal visibility
  animal: Animal; // The animal context for actions
  onClose: () => void; // Function to close the modal
  onLogToSession: (date: string) => void; // Function to add weighing to an existing session
  onStartNewSession: () => void; // Function to start a new weighing session flow
  onStartDrying: (parturitionId: string) => void; // Function to initiate drying
  onSetDry: (parturitionId: string) => void; // Function to declare lactation as dry
}

export const MilkWeighingActionModal: React.FC<MilkWeighingActionModalProps> = ({
  isOpen, // Prop received from parent
  animal,
  onClose,
  onLogToSession,
  onStartNewSession,
  onStartDrying,
  onSetDry,
}) => {
  // Get data from context
  const { parturitions, weighings } = useData();
  // State for controlling the parturition modal visibility
  const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);

  // Find the currently active or drying parturition for this animal
  const activeParturition = useMemo(() => {
    return parturitions
      // Filter parturitions for this animal that are 'activa' or 'en-secado'
      .filter((p: Parturition) => p.goatId === animal.id && (p.status === 'activa' || p.status === 'en-secado'))
      // Sort by date descending to get the most recent one
      .sort((a: Parturition, b: Parturition) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0]; // Get the first element
  }, [parturitions, animal.id]); // Recalculate if parturitions or animal ID changes

  // Memoize recent milk weighing session dates
  const recentSessions = useMemo(() => {
    // Get all unique dates from milk weighings
    const allDates = weighings.map(w => w.date);
    const uniqueDates = [...new Set(allDates)];
    // Sort dates descending and take the top 3
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
  }, [weighings]); // Recalculate if weighings change

  // --- RENDERIZADO CONDICIONAL ---

  // If no active parturition AND the parturition modal is closed, show prompt to declare parturition
  if (!activeParturition && !isParturitionModalOpen) {
    return (
      <Modal
        isOpen={isOpen} // Use the prop to control visibility
        onClose={onClose}
        // --- USO DE formatAnimalDisplay en título ---
        title={`Acción Requerida: ${formatAnimalDisplay(animal)}`}
      >
        <div className="text-center space-y-4 text-white">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <h3 className="text-lg font-medium">Animal sin Parto Activo</h3>
          <p className="text-sm text-zinc-400">
            Para registrar un pesaje o gestionar el secado, el animal debe tener un parto activo.
          </p>
          {/* Button to open the parturition declaration modal */}
          <button
            onClick={() => setParturitionModalOpen(true)} // Set state to open the other modal
            className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 font-bold py-3 px-4 rounded-xl transition-colors text-base"
          >
            <Baby size={18} /> Declarar Parto Ahora
          </button>
        </div>
      </Modal>
    );
  }

  // If the parturition modal should be open, render it instead
  if (isParturitionModalOpen) {
      return <ParturitionModal
        isOpen={true} // It controls its own display based on this state
        onClose={() => {
            setParturitionModalOpen(false); // Close this modal
            // Decide whether to also close the action modal or keep it open
            // onClose(); // Uncomment this line if the action modal should also close
        }}
        motherId={animal.id} // Pass the mother's ID
    />
  }

  // --- RENDERIZADO DEL MODAL PRINCIPAL (si hay parto activo) ---
  return (
    <Modal
        isOpen={isOpen} // Use prop for visibility
        onClose={onClose}
        // --- USO DE formatAnimalDisplay en título ---
        title={`Pesaje Lechero: ${formatAnimalDisplay(animal)}`}
    >
      <div className="space-y-6">
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
                    className="w-full text-left bg-zinc-800/80 p-3 rounded-xl hover:bg-zinc-700 transition-colors flex justify-between items-center group" // Added group
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-500" />
                    {/* Display formatted date */}
                    <span className="text-base font-semibold text-white">
                      {new Date(date + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" /> {/* Chevron color changes on hover */}
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
            className="w-full text-left bg-brand-orange/20 border border-brand-orange/80 p-4 rounded-xl hover:bg-brand-orange/30 transition-colors flex justify-between items-center group" // Added group
          >
            <span className="text-lg font-bold text-white">Construir Carga Masiva...</span>
            <ChevronRight size={20} className="text-brand-orange group-hover:text-orange-300 transition-colors" /> {/* Chevron color changes */}
          </button>
           {/* Helper text */}
           <p className="text-xs text-zinc-500 text-center px-4 mt-2">
              Esto te permitirá seleccionar un grupo de animales y registrar sus pesajes.
            </p>
        </div>

        {/* Section for Drying Actions (only if activeParturition exists) */}
        {activeParturition && (
            <div className="pt-4 border-t border-brand-border">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Acciones de Lactancia</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    {/* Button to Start Drying Process */}
                    <button
                        type="button" // Important for buttons not submitting forms
                        onClick={() => onStartDrying(activeParturition.id)}
                        disabled={activeParturition.status !== 'activa'} // Disable if not 'activa'
                        className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-300 font-semibold py-3 px-3 rounded-lg hover:bg-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wind size={16}/> {activeParturition.status === 'en-secado' ? 'Ya en Secado' : 'Iniciar Secado'}
                    </button>
                    {/* Button to Declare Dry */}
                    <button
                        type="button" // Important for buttons not submitting forms
                        onClick={() => onSetDry(activeParturition.id)}
                        // Disable if already dry or finished
                        disabled={activeParturition.status === 'seca' || activeParturition.status === 'finalizada'}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600/20 text-gray-300 font-semibold py-3 px-3 rounded-lg hover:bg-gray-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Archive size={16}/> {activeParturition.status === 'seca' ? 'Ya Seca' : 'Declarar Seca'}
                    </button>
                </div>
                {/* Message if currently drying */}
                {activeParturition.status === 'en-secado' && (
                     <p className="text-center text-xs text-zinc-400 mt-2">El animal está en su período de secado.</p>
                 )}
            </div>
        )}
      </div>
    </Modal>
  );
};
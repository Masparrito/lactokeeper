// src/components/modals/MilkWeighingActionModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Parturition } from '../../db/local'; // Import Parturition type
import { AlertTriangle, Baby, Calendar, ChevronRight, History, PlusCircle, Wind, Archive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ParturitionModal } from './ParturitionModal'; // Modal to declare parturition
// --- CAMBIO: formatAnimalDisplay ya no es necesario ---
// import { formatAnimalDisplay } from '../../utils/formatting';

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
  const { parturitions, weighings } = useData();
  const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);

  const activeParturition = useMemo(() => {
    return parturitions
      .filter((p: Parturition) => p.goatId === animal.id && (p.status === 'activa' || p.status === 'en-secado'))
      .sort((a: Parturition, b: Parturition) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
  }, [parturitions, animal.id]);

  const recentSessions = useMemo(() => {
    const allDates = weighings.map(w => w.date);
    const uniqueDates = [...new Set(allDates)];
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
  }, [weighings]);

  // --- CAMBIO: Preparar nombre formateado ---
  const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

  // --- RENDERIZADO CONDICIONAL ---

  // Fallback si no hay parto activo
  if (!activeParturition && !isParturitionModalOpen) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        // --- CAMBIO: Título genérico ---
        title="Acción Requerida"
      >
        <div className="text-center space-y-4 text-white">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
          <div className="text-center">
                <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                    <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
          </div>
          {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
          <h3 className="text-lg font-medium">Animal sin Parto Activo</h3>
          <p className="text-sm text-zinc-400">
            Para registrar un pesaje o gestionar el secado, el animal debe tener un parto activo.
          </p>
          <button
            onClick={() => setParturitionModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 font-bold py-3 px-4 rounded-xl transition-colors text-base"
          >
            <Baby size={18} /> Declarar Parto Ahora
          </button>
        </div>
      </Modal>
    );
  }

  // Renderizar modal de parto si está abierto
  if (isParturitionModalOpen) {
      return <ParturitionModal
        isOpen={true}
        onClose={() => {
            setParturitionModalOpen(false);
        }}
        motherId={animal.id}
    />
  }

  // --- RENDERIZADO DEL MODAL PRINCIPAL (si hay parto activo) ---
  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        // --- CAMBIO: Título genérico ---
        title="Acciones de Leche"
    >
      <div className="space-y-6">
        {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
        <div className="text-center mb-2">
            <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
            {formattedName && (
                <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
            )}
        </div>
        {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}

        {/* Sección de sesiones recientes */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><History size={16} />Añadir a Sesión Reciente</h3>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((date) => (
                <button
                    key={date}
                    onClick={() => onLogToSession(date)}
                    className="w-full text-left bg-zinc-800/80 p-3 rounded-xl hover:bg-zinc-700 transition-colors flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-zinc-500" />
                    <span className="text-base font-semibold text-white">
                      {new Date(date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </span>
                  </div>
                  <ChevronRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-500 py-4">No hay sesiones recientes.</p>
          )}
        </div>

        {/* Sección de nueva sesión */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><PlusCircle size={16} />Iniciar Nueva Sesión de Pesaje</h3>
          <button
            onClick={onStartNewSession}
            className="w-full text-left bg-brand-orange/20 border border-brand-orange/80 p-4 rounded-xl hover:bg-brand-orange/30 transition-colors flex justify-between items-center group"
          >
            <span className="text-lg font-bold text-white">Construir Carga Masiva...</span>
            <ChevronRight size={20} className="text-brand-orange group-hover:text-orange-300 transition-colors" />
          </button>
           <p className="text-xs text-zinc-500 text-center px-4 mt-2">
              Esto te permitirá seleccionar un grupo de animales y registrar sus pesajes.
            </p>
        </div>

        {/* Acciones de Secado */}
        {activeParturition && (
            <div className="pt-4 border-t border-brand-border">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Acciones de Lactancia</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => onStartDrying(activeParturition.id)}
                        disabled={activeParturition.status !== 'activa'}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-300 font-semibold py-3 px-3 rounded-lg hover:bg-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Wind size={16}/> {activeParturition.status === 'en-secado' ? 'Ya en Secado' : 'Iniciar Secado'}
                    </button>
                    <button
                        type="button"
                        onClick={() => onSetDry(activeParturition.id)}
                        disabled={activeParturition.status === 'seca' || activeParturition.status === 'finalizada'}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600/20 text-gray-300 font-semibold py-3 px-3 rounded-lg hover:bg-gray-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Archive size={16}/> {activeParturition.status === 'seca' ? 'Ya Seca' : 'Declarar Seca'}
                    </button>
                </div>
                {activeParturition.status === 'en-secado' && (
                     <p className="text-center text-xs text-zinc-400 mt-2">El animal está en su período de secado.</p>
                 )}
            </div>
        )}
      </div>
    </Modal>
  );
};
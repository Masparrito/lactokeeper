// src/components/modals/BodyWeighingActionModal.tsx

import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { Calendar, ChevronRight, History, PlusCircle, Target } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { getAnimalZootecnicCategory } from '../../utils/calculations';

interface BodyWeighingActionModalProps {
  isOpen: boolean; // Prop para controlar la visibilidad
  animal: Animal;
  onClose: () => void;
  onLogToSession: (date: string) => void;
  onStartNewSession: () => void;
  onSetReadyForMating: () => void;
}

export const BodyWeighingActionModal: React.FC<BodyWeighingActionModalProps> = ({
  isOpen, // Usamos la prop
  animal,
  onClose,
  onLogToSession,
  onStartNewSession,
  onSetReadyForMating,
}) => {
  const { bodyWeighings, parturitions } = useData();

  const recentSessions = useMemo(() => {
    const allDates = bodyWeighings.map(w => w.date);
    const uniqueDates = [...new Set(allDates)];
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
  }, [bodyWeighings]);

  const zootecnicCategory = getAnimalZootecnicCategory(animal, parturitions);
  const isReadyForMatingAction = zootecnicCategory === 'Cabritona' && animal.reproductiveStatus === 'Vacía';

  return (
    // --- LÍNEA CORREGIDA ---
    <Modal isOpen={isOpen} onClose={onClose} title={`Pesaje Corporal: ${animal.id}`}>
      <div className="space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><History size={16} />Añadir a Sesión Reciente</h3>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map((date) => (
                <button key={date} onClick={() => onLogToSession(date)} className="w-full text-left bg-zinc-800/80 p-3 rounded-xl hover:bg-zinc-700 transition-colors flex justify-between items-center">
                  <div className="flex items-center gap-3"><Calendar size={18} className="text-zinc-500" /><span className="text-base font-semibold text-white">{new Date(date + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                  <ChevronRight size={20} className="text-zinc-600" />
                </button>
              ))}
            </div>
          ) : <p className="text-center text-sm text-zinc-500 py-4">No hay sesiones recientes.</p>}
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><PlusCircle size={16} />Iniciar Nueva Sesión de Pesaje</h3>
          <button onClick={onStartNewSession} className="w-full text-left bg-brand-green/20 border border-brand-green/80 p-4 rounded-xl hover:bg-brand-green/30 transition-colors flex justify-between items-center">
            <span className="text-lg font-bold text-white">Construir Carga Masiva...</span>
            <ChevronRight size={20} className="text-brand-green" />
          </button>
        </div>

        {isReadyForMatingAction && (
            <div className="pt-4 border-t border-brand-border">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Acciones de Desarrollo</h3>
                <div className="flex">
                    <button onClick={onSetReadyForMating} className="w-full flex items-center justify-center gap-2 bg-pink-600/20 text-pink-300 font-semibold py-3 px-3 rounded-lg hover:bg-pink-600/40 transition-colors">
                        <Target size={16}/> Declarar en Peso de Monta
                    </button>
                </div>
                 <p className="text-xs text-zinc-500 text-center px-4 mt-2">
                    Si el animal tiene el peso y la edad adecuados, esto lo marcará como "Listo para Monta".
                </p>
            </div>
        )}
      </div>
    </Modal>
  );
};
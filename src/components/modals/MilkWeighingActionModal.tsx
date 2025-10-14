// src/components/modals/MilkWeighingActionModal.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { AlertTriangle, Baby, Calendar, ChevronRight, History, PlusCircle, Wind, Archive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ParturitionModal } from './ParturitionModal';

interface MilkWeighingActionModalProps {
  animal: Animal;
  onClose: () => void;
  onLogToSession: (date: string) => void;
  onStartNewSession: () => void;
  onStartDrying: (parturitionId: string) => void;
  onSetDry: (parturitionId: string) => void;
}

export const MilkWeighingActionModal: React.FC<MilkWeighingActionModalProps> = ({
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
      .filter(p => p.goatId === animal.id && (p.status === 'activa' || p.status === 'en-secado'))
      .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
  }, [parturitions, animal.id]);

  const recentSessions = useMemo(() => {
    const allDates = weighings.map(w => w.date);
    const uniqueDates = [...new Set(allDates)];
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
  }, [weighings]);

  if (!activeParturition && !isParturitionModalOpen) {
    return (
      <Modal isOpen={true} onClose={onClose} title={`Acción Requerida: ${animal.id}`}>
        <div className="text-center space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <h3 className="text-lg font-medium text-white">Animal sin Parto Activo</h3>
          <p className="text-sm text-zinc-400">
            Para registrar un pesaje de leche o acciones de secado, el animal debe tener un parto activo.
          </p>
          <button onClick={() => setParturitionModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
            <Baby size={18} /> Declarar Parto Ahora
          </button>
        </div>
      </Modal>
    );
  }
  
  if (isParturitionModalOpen) {
      return <ParturitionModal isOpen={true} onClose={onClose} motherId={animal.id} />
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Pesaje Lechero: ${animal.id}`}>
      <div className="space-y-6">
        {/* Unirse a sesión reciente */}
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

        {/* Iniciar nueva sesión */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><PlusCircle size={16} />Iniciar Nueva Sesión de Pesaje</h3>
          <button onClick={onStartNewSession} className="w-full text-left bg-brand-orange/20 border border-brand-orange/80 p-4 rounded-xl hover:bg-brand-orange/30 transition-colors flex justify-between items-center">
            <span className="text-lg font-bold text-white">Crear Nueva Sesión...</span>
            <ChevronRight size={20} className="text-brand-orange" />
          </button>
        </div>

        {/* Acciones de Secado */}
        {activeParturition && (
            <div className="pt-4 border-t border-brand-border">
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Acciones de Lactancia</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => onStartDrying(activeParturition.id)} disabled={activeParturition.status === 'en-secado'} className="w-full flex items-center justify-center gap-2 bg-blue-600/20 text-blue-300 font-semibold py-3 px-3 rounded-lg hover:bg-blue-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Wind size={16}/> {activeParturition.status === 'en-secado' ? 'Ya está en Secado' : 'Iniciar Secado'}
                    </button>
                    <button onClick={() => onSetDry(activeParturition.id)} className="w-full flex items-center justify-center gap-2 bg-gray-600/20 text-gray-300 font-semibold py-3 px-3 rounded-lg hover:bg-gray-600/40 transition-colors">
                        <Archive size={16}/> Declarar Seca
                    </button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};
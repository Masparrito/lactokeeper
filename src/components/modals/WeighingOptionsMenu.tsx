// src/components/modals/WeighingOptionsMenu.tsx

import React from 'react';
import { History, PlusCircle, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';

/**
 * Define las propiedades que el modal de opciones de pesaje necesita.
 * @param isOpen - Controla si el modal está visible.
 * @param onClose - Función para cerrar el modal.
 * @param weightType - Especifica si es un pesaje 'corporal' o de 'leche'.
 * @param recentSessions - Un array de fechas (string YYYY-MM-DD) de las últimas sesiones.
 * @param onSelectSession - Función que se ejecuta cuando el usuario elige una sesión existente.
 * @param onCreateNew - Función que se ejecuta cuando el usuario decide crear una nueva sesión.
 */
interface WeighingOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  weightType: 'corporal' | 'leche';
  recentSessions: string[];
  onSelectSession: (date: string) => void;
  onCreateNew: () => void;
}

export const WeighingOptionsMenu: React.FC<WeighingOptionsMenuProps> = ({
  isOpen,
  onClose,
  weightType,
  recentSessions,
  onSelectSession,
  onCreateNew,
}) => {
  const title = `Agregar Peso ${weightType === 'corporal' ? 'Corporal' : 'Lechero'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        {/* Sección para unirse a una sesión reciente */}
        {recentSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
              <History size={16} />
              Añadir a una Sesión Reciente
            </h3>
            <div className="space-y-2">
              {recentSessions.map((date) => (
                <button
                  key={date}
                  onClick={() => onSelectSession(date)}
                  className="w-full text-left bg-zinc-800/80 p-4 rounded-xl hover:bg-zinc-700 transition-colors flex items-center gap-3"
                >
                  <Calendar size={20} className="text-zinc-500" />
                  <span className="text-lg font-semibold text-white">
                    {new Date(date + 'T00:00:00').toLocaleDateString('es-VE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sección para crear una nueva sesión */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-400">
            <PlusCircle size={16} />
            Iniciar una Nueva Sesión de Pesaje
          </h3>
          <button
            onClick={onCreateNew}
            className="w-full text-left bg-brand-orange/20 border border-brand-orange/80 p-4 rounded-xl hover:bg-brand-orange/30 transition-colors flex items-center gap-3"
          >
            <PlusCircle size={20} className="text-brand-orange" />
            <span className="text-lg font-bold text-white">
              Crear Nueva Sesión...
            </span>
          </button>
           <p className="text-xs text-zinc-500 text-center px-4">
              Esto te permitirá seleccionar un grupo de animales y registrar sus pesos en una sola tanda.
            </p>
        </div>
      </div>
    </Modal>
  );
};